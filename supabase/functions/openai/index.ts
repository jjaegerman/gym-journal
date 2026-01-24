import OpenAI from "npm:openai";
import { zodTextFormat } from "npm:openai/helpers/zod";
import { OpenAILogDetailsArray } from "../_shared/types.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const { query, audio } = await req.json();
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    let textLog = "";
    if (query != undefined && query != null && query.trim() !== "") {
      if (query.length > 1024) {
        return new Response(
          JSON.stringify({ error: "Text too long." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      textLog = query;
    } else {
      if (!audio?.base64) {
        return new Response(
          JSON.stringify({ error: "Missing audio.base64 field" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const supportedFormats = [
        "mp3",
        "mp4",
        "mpeg",
        "mpga",
        "m4a",
        "wav",
        "webm",
      ];
      if (!supportedFormats.includes(audio.fileExtension?.toLowerCase())) {
        return new Response(
          JSON.stringify({ error: "Unsupported audio format" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      if (audio.base64.length > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Audio recording too long" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const audioBytes = base64ToUint8Array(audio.base64);
      const audioFile = new File([audioBytes], audio.fileName, {
        type: `audio/${audio.fileExtension}`,
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "gpt-4o-transcribe",
        prompt:
          "The followidng audio is a spoken log of workout activities. Transcribe it clearly, correcting obvious speech errors while preserving meaning. Use standard exercise names and units.",
      });

      textLog = transcription.text;
    }

    if (!textLog || textLog.trim() === "") {
      return new Response(
        JSON.stringify({ error: "No exercise logs extracted from input" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const structured = await openai.responses.parse({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content:
            `Extract structured workout data from user's transcribed audio.

FIELD RULES:
- exerciseType: Best matching category from schema enum
- modifiers: Array of applicable modifiers from schema enum. Examples:
  - "back squat" → ["Back"]
  - "pause front squat" → ["Front", "Pause"]
  - "incline close grip bench" → ["Incline", "Close Grip"]
  - "sumo deadlift" → ["Sumo"]
  - "hammer curls" → ["Hammer"]
  DO NOT include equipment or exercise type in modifiers
- primaryEquipment: Main equipment (use schema enum values)
- exerciseName: ONLY for "Other" or "Cardio Other" types (e.g., "Burpees")
- resistanceLevel: For treadmill incline (%), bike resistance, or rower damper
- duration: ISO 8601 format

LOGIC:
If repetitions not specified but sets are, assume repetitions equal sets and sets equals 1.
If both specified, repeat item with same repetitions for each set.`,
        },
        {
          role: "user",
          content: textLog,
        },
      ],
      text: {
        format: zodTextFormat(OpenAILogDetailsArray, "log"),
      },
    });

    const exerciseLogs = structured.output_parsed?.items ?? [];

    // Transform logs into format expected by batch function
    const logsForDb = exerciseLogs.map((exerciseLog: any) => {
      return {
        exercise_variants: exerciseLog.modifiers ?? [],
        exercise_type: String(exerciseLog.exerciseType),
        exercise_name: exerciseLog.exerciseName
          ? String(exerciseLog.exerciseName)
          : null,
        exercise_equipment: exerciseLog.primaryEquipment
          ? String(exerciseLog.primaryEquipment)
          : null,
        weight: exerciseLog.weight ? Number(exerciseLog.weight) : null,
        weight_unit: exerciseLog.weightUnit
          ? String(exerciseLog.weightUnit)
          : null,
        repetitions: exerciseLog.repetitions
          ? parseInt(exerciseLog.repetitions)
          : null,
        duration: exerciseLog.duration ? String(exerciseLog.duration) : null,
        effort: exerciseLog.effort ? String(exerciseLog.effort) : null,
        distance: exerciseLog.distance ? Number(exerciseLog.distance) : null,
        distance_unit: exerciseLog.distanceUnit
          ? String(exerciseLog.distanceUnit)
          : null,
        resistance_level: exerciseLog.resistanceLevel
          ? parseInt(exerciseLog.resistanceLevel)
          : null,
      };
    });

    if (logsForDb.length === 0) {
      return new Response(
        JSON.stringify({ error: "No exercise logs extracted from input" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Create submission + all logs in a single transaction
    const { data: submissionId, error: submissionError } = await supabase.rpc(
      "add_submission_with_logs",
      {
        p_raw_text: textLog,
        p_submission_type: query ? "text" : "audio",
        p_ai_response: structured.output_text,
        p_logs: logsForDb,
        p_model_version: "gpt-4.1",
        p_prompt_version: "v2.0",
        p_audio_duration_seconds: null,
      },
    );

    if (submissionError) {
      console.error("Error creating submission with logs:", submissionError);
      return new Response(String(submissionError.message), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({ success: true, submission_id: submissionId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(String(error), { status: 500, headers: corsHeaders });
  }
});

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
