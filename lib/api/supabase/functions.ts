import { supabase } from './client';
import { UnitPreferences } from './profile';

/**
 * Supabase Edge Functions API
 * Wrapper functions for invoking edge functions
 */

export interface ExerciseContext {
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

interface OpenAIRequestBody {
  audio?: {
    fileExtension: string;
    fileName: string;
    base64: string;
  };
  query?: string;
  context?: ExerciseContext;
  workout_id?: string;
  unitPreferences?: UnitPreferences;
}

interface OpenAIResponse {
  success: true;
  submission_id: string;
}

/**
 * Invoke the OpenAI edge function for audio transcription or text processing
 * @param audioData - Optional audio file data (base64 encoded)
 * @param query - Optional text query/instruction for the AI
 * @returns The saved submission; throws if processing or saving fails
 */
export async function invokeOpenAI(
  audioData?: {
    base64: string;
    fileExtension: string;
    fileName: string;
  },
  query?: string,
  context?: ExerciseContext,
  workoutId?: string,
  unitPreferences?: UnitPreferences
): Promise<OpenAIResponse> {
  // Require either audioData or query
  if (!audioData && !query) {
    throw new Error('Either audioData or query must be provided');
  }

  const body: OpenAIRequestBody = {};

  if (audioData) {
    body.audio = audioData;
  }

  if (query) {
    body.query = query;
  }

  if (context) {
    body.context = context;
  }

  if (workoutId) {
    body.workout_id = workoutId;
  }

  if (unitPreferences) {
    body.unitPreferences = unitPreferences;
  }

  const { data, error } = await supabase.functions.invoke('openai', {
    body,
  });

  if (error) {
    console.error("Error invoking OpenAI function:", error);
    let message = error.message;
    // HTTP errors carry the function's response, including its useful error message.
    if (error.context instanceof Response) {
      const text = await error.context.text();
      if (text) {
        try {
          const body = JSON.parse(text);
          if (typeof body.error === 'string') message = body.error;
        } catch {
          message = text;
        }
      }
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(String(data.error));
  if (data?.success !== true || typeof data.submission_id !== 'string') {
    throw new Error('Workout processing returned an invalid response');
  }

  return data as OpenAIResponse;
}

// Future edge functions can be added here:
// export async function invokeAnotherFunction(params: any) { }
