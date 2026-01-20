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

    var textLog = "";
    if (query != undefined && query != null && query.trim() !== "") {
      textLog = query;
    } else {
      if (!audio?.base64) {
        return new Response(
          JSON.stringify({ error: "Missing audio.base64 field" }),
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
      });

      textLog = transcription.text;
    }

    const structured = await openai.responses.parse({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content:
            `Extract structured workout data from user's transcribed audio.

FORMATTING RULES:
- variants: Array of variant modifiers (e.g., ["Incline", "Close Grip"]). Use Title Case.
  Examples: ["Back"], ["Incline"], ["Sumo", "Deficit"], []
  DO NOT include equipment or exercise type in variants

- exerciseType: Select the best matching category from the schema (e.g., "Bench Press", "Squat", "Running")

- primaryEquipment: Main equipment used (use full names: "Barbell" not "BB", "Dumbbell" not "DB")
  Omit for bodyweight exercises, outdoor cardio, or yoga

- exerciseName: ONLY populate when exerciseType ends with "Other" (e.g., "Cardio Other", "Legs Other")
  Use the full exercise name (e.g., "Burpees", "Farmers Walk")
  Leave null for standard exercise types

- resistanceLevel: For treadmill incline (%), bike resistance, or rower damper setting

LOGIC:
If repetitions are not specified but sets are, assume repetitions equal sets and sets equals 1.
If both are specified, repeat the item with the same repetitions for each set.`,
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
      // Normalize variants array (convert to Title Case)
      const normalizedVariants = exerciseLog.variants
        ? exerciseLog.variants.map((v: string) => normalizeVariant(v))
        : [];

      return {
        exercise_variants: normalizedVariants,
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
        duration: exerciseLog.duration ? parseInt(exerciseLog.duration) : null,
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

    // Create submission + all logs in a single transaction
    const { data: submissionId, error: submissionError } = await supabase.rpc(
      "add_submission_with_logs",
      {
        p_raw_text: textLog,
        p_submission_type: query ? "text" : "audio",
        p_ai_response: structured.output_text,
        p_logs: logsForDb,
        p_model_version: "gpt-4.1",
        p_prompt_version: "v1.0",
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

/**
 * Normalize a single variant modifier for consistency
 * - Converts to Title Case
 * - Trims and removes extra whitespace
 */
function normalizeVariant(variant: string): string {
  if (!variant) return variant;

  // Trim and collapse multiple spaces
  let normalized = variant.trim().replace(/\s+/g, " ");

  // Convert to Title Case (capitalize first letter of each word)
  normalized = normalized
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return normalized.trim();
}
