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

    const { query, audio, context, workout_id, unitPreferences } = await req.json();
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
          "Transcribe workout exercise logs. If the audio contains no clear speech, return nothing. Correct speech errors while preserving meaning. Use standard exercise names and units.",
      });

      textLog = transcription.text;
    }

    if (!textLog || textLog.trim() === "") {
      return new Response(
        JSON.stringify({ error: "No exercise logs extracted from input" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const systemContent = `Extract structured workout data from user's transcribed audio.

FIELD RULES:
- input: The full exercise entry exactly as spoken, including reps, weight, and all details. Examples:
  - "8 reps of back squat at 225 pounds"
  - "incline dumbbell press 3 sets of 10 at 50 lbs"
  - "Romanian deadlift 185 for 12"
- exercise_kind: Best matching category from schema enum
- modifiers: Only include modifiers EXPLICITLY stated by the user — never infer. Examples:
  - "squat" → []
  - "back squat" → ["Back"]
  - "front squat" → ["Front"]
  - "pause front squat" → ["Front", "Pause"]
  - "incline close grip bench" → ["Incline", "Close Grip"]
  DO NOT include equipment in modifiers
- equipment: Only set if explicitly stated by the user. Leave null if not specified.
- resistanceLevel: For treadmill incline (%), bike resistance, or rower damper
- duration: ISO 8601 format
- weightUnit / distanceUnit: Only set if explicitly stated by the user. Leave null if not specified.

LOGIC:
If repetitions not specified but sets are, assume repetitions equal sets and sets equals 1.
If both specified, repeat item with same repetitions for each set.
When expanding sets, each item's input should describe that single set (e.g. "3 sets of 10 bench press at 185 lbs" → each item's input is "10 reps bench press at 185 lbs").${context ? buildContextBlock(context) : ""}`;

    const structured = await openai.responses.parse({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: systemContent,
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

    const defaultWeightUnit = unitPreferences?.weightUnit ?? 'lbs';
    const defaultDistanceUnit = unitPreferences?.distanceUnit ?? 'miles';

    // Transform logs into format expected by batch function
    const logsForDb = exerciseLogs.map((log: any) => {
      return {
        input: log.input ? String(log.input) : null,
        exercise_kind: String(log.exercise_kind),
        modifiers: log.modifiers ?? [],
        equipment: log.equipment ? String(log.equipment) : null,
        weight: log.weight ? Number(log.weight) : null,
        weight_unit: String(log.weightUnit ?? defaultWeightUnit),
        repetitions: log.repetitions ? parseInt(log.repetitions) : null,
        duration: log.duration ? String(log.duration) : null,
        effort: log.effort ? String(log.effort) : null,
        distance: log.distance ? Number(log.distance) : null,
        distance_unit: String(log.distanceUnit ?? defaultDistanceUnit),
        resistance_level: log.resistanceLevel
          ? parseInt(log.resistanceLevel)
          : null,
      };
    });

    if (logsForDb.length === 0) {
      return new Response(
        JSON.stringify({ error: "No exercise logs extracted from input" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Create submission + all sets in a single transaction
    const rpcName = workout_id ? "add_submission_to_workout" : "add_submission_with_sets";
    const rpcParams = workout_id
      ? {
          p_workout_id: workout_id,
          p_raw_text: textLog,
          p_submission_type: query ? "text" : "audio",
          p_ai_response: structured.output_text,
          p_logs: logsForDb,
          p_model_version: "gpt-4.1",
          p_prompt_version: "v2.1",
          p_audio_duration_seconds: null,
        }
      : {
          p_raw_text: textLog,
          p_submission_type: query ? "text" : "audio",
          p_ai_response: structured.output_text,
          p_logs: logsForDb,
          p_model_version: "gpt-4.1",
          p_prompt_version: "v2.1",
          p_audio_duration_seconds: null,
        };
    const { data: submissionId, error: submissionError } = await supabase.rpc(
      rpcName,
      rpcParams,
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

interface ExerciseContext {
  exerciseName: string;
  exercise_kind: string;
  modifiers?: string[];
  equipment?: string | null;
  lastSet?: {
    weight?: number | null;
    weightUnit?: string | null;
    repetitions?: number | null;
    distance?: number | null;
    distanceUnit?: string | null;
    duration?: string | null;
    resistanceLevel?: number | null;
    effort?: string | null;
  };
}

function buildContextBlock(ctx: ExerciseContext): string {
  const lines = [
    `\n\nCONTEXT:`,
    `The user is continuing an exercise. Apply these defaults when relative terms are used ("more", "same weight", "again"):`,
    `- Exercise: ${ctx.exerciseName}`,
    `- Category: ${ctx.exercise_kind}${ctx.modifiers?.length ? ` | Modifiers: ${ctx.modifiers.join(", ")}` : ""}${ctx.equipment ? ` | Equipment: ${ctx.equipment}` : ""}`,
  ];
  if (ctx.lastSet) {
    const { weight, weightUnit, repetitions, distance, distanceUnit, duration } = ctx.lastSet;
    if (weight != null && repetitions != null) {
      lines.push(`- Most recent set: ${repetitions} reps @ ${weight} ${weightUnit}`);
    } else if (repetitions != null) {
      lines.push(`- Most recent set: ${repetitions} reps`);
    } else if (weight != null) {
      lines.push(`- Most recent set: ${weight} ${weightUnit}`);
    } else if (distance != null) {
      lines.push(`- Most recent set: ${distance} ${distanceUnit}`);
    } else if (duration) {
      lines.push(`- Most recent set: duration ${duration}`);
    }
  }
  return lines.join("\n");
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
