import OpenAI from 'npm:openai'
import { zodTextFormat } from 'npm:openai/helpers/zod';
import { OpenAILogDetails } from '../_shared/types.ts';
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
            "You are an expert at structured data extraction. You will be given unstructured transcribed logs from a user that is working out and must convert it into the given structure."
        },
        {
          role: "user",
          content: reply
        },
      ],
      text: {
        format: zodTextFormat(OpenAILogDetails, "log")
      },
    });

    const exerciseLog = JSON.parse(structured.output_text);

    console.log(exerciseLog);
    for (let i: number = 0; i < (exerciseLog.sets ?? 1); i++) {
      console.log('Adding log set', i + 1);
      var log_input = {
        p_exercise_name: String(exerciseLog.exerciseName),
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
      console.log('Log input:', log_input);
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