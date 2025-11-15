import OpenAI from 'npm:openai'
import { zodTextFormat } from 'npm:openai/helpers/zod';
import { OpenAILogDetailsArray } from '../_shared/types.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { query, audio } = await req.json();
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    if (!audio?.base64) {
      return new Response(
        JSON.stringify({ error: "Missing audio.base64 field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const audioBytes = base64ToUint8Array(audio.base64);
    const audioFile = new File([audioBytes], audio.fileName, { type: `audio/${audio.fileExtension}` });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
    });

    const reply = transcription.text;

    const structured = await openai.responses.parse({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content:
            `Extract structured workout data from user's transcribed audio.

FORMATTING RULES:
- exerciseVariant: The specific variation WITHOUT equipment. Use Title Case.
  Examples: "Back Squat", "Incline Bench Press", "Running", "Bicep Curl"
  DO NOT include equipment in the variant name (equipment goes in primaryEquipment field)

- exerciseType: Select the best matching category from the schema
- primaryEquipment: Main equipment used (use full names: "Barbell" not "BB", "Dumbbell" not "DB")
  Omit for bodyweight exercises, outdoor cardio, or yoga
- resistanceLevel: For treadmill incline (%), bike resistance, or rower damper setting

LOGIC:
If repetitions are not specified but sets are, assume repetitions equal sets and sets equals 1.`
        },
        {
          role: "user",
          content: reply
        },
      ],
      text: {
        format: zodTextFormat(OpenAILogDetailsArray, "log")
      },
    });

    const exerciseLogs = JSON.parse(structured.output_text).items ?? [];

    console.log(exerciseLogs);
    for (const exerciseLog of exerciseLogs) {
      // Normalize variant name for consistency
      const normalizedVariant = normalizeExerciseVariant(exerciseLog.exerciseVariant);

      var log_input = {
        p_exercise_variant: normalizedVariant,
        p_exercise_type: String(exerciseLog.exerciseType),
      }
      if (exerciseLog.primaryEquipment) {
        log_input.p_equipment = String(exerciseLog.primaryEquipment);
      }
      if (exerciseLog.weight) {
        log_input.p_weight = Number(exerciseLog.weight);
      }
      if (exerciseLog.weightUnit) {
        log_input.p_weight_unit = String(exerciseLog.weightUnit);
      }
      if (exerciseLog.repetitions) {
        log_input.p_repetitions = parseInt(exerciseLog.repetitions);
      }
      if (exerciseLog.duration) {
        log_input.p_duration = parseInt(exerciseLog.duration);
      }
      if (exerciseLog.effort) {
        log_input.p_effort = String(exerciseLog.effort);
      }
      if (exerciseLog.distance) {
        log_input.p_distance = Number(exerciseLog.distance);
      }
      if (exerciseLog.distanceUnit) {
        log_input.p_distance_unit = String(exerciseLog.distanceUnit);
      }
      if (exerciseLog.resistanceLevel) {
        log_input.p_resistance_level = parseInt(exerciseLog.resistanceLevel);
      }

      const { data, error } = await supabase.rpc('add_log', log_input);
      if (error) {
        console.error('Error adding log:', error);
      }
    }

    return new Response(exerciseLog, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(String(error?.message ?? error), { status: 500, headers: corsHeaders });
  }
})

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Normalize exercise variant names for consistency
 * - Converts to Title Case
 * - Trims and removes extra whitespace
 * - Strips equipment prefixes (equipment should be in separate field)
 */
function normalizeExerciseVariant(variant: string): string {
  if (!variant) return variant;

  // Trim and collapse multiple spaces
  let normalized = variant.trim().replace(/\s+/g, ' ');

  // Convert to Title Case (capitalize first letter of each word)
  normalized = normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Strip common equipment prefixes (these should be in primaryEquipment field)
  const equipmentPrefixes = [
    'Barbell ', 'Bb ', 'Dumbbell ', 'Db ', 'Kettlebell ', 'Kb ',
    'Ez Bar ', 'Ez ', 'Cable ', 'Machine ', 'Smith Machine ',
    'Treadmill ', 'Rowing Machine ', 'Stationary Bike ',
    'Resistance Band ', 'Bodyweight '
  ];

  for (const prefix of equipmentPrefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
      break; // Only remove first match
    }
  }

  return normalized.trim();
}