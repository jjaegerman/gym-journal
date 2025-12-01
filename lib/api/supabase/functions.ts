import { supabase } from './client';

/**
 * Supabase Edge Functions API
 * Wrapper functions for invoking edge functions
 */

interface OpenAIRequestBody {
  audio?: {
    fileExtension: string;
    fileName: string;
    base64: string;
  };
  query?: string;
}

interface OpenAIResponse {
  text?: string;
  error?: string;
}

/**
 * Invoke the OpenAI edge function for audio transcription or text processing
 * @param audioData - Optional audio file data (base64 encoded)
 * @param query - Optional text query/instruction for the AI
 * @returns Transcribed text or error
 */
export async function invokeOpenAI(
  audioData?: {
    base64: string;
    fileExtension: string;
    fileName: string;
  },
  query?: string
): Promise<OpenAIResponse> {
  // Require either audioData or query
  if (!audioData && !query) {
    return { error: 'Either audioData or query must be provided' };
  }

  const body: OpenAIRequestBody = {};

  if (audioData) {
    body.audio = audioData;
  }

  if (query) {
    body.query = query;
  }

  const { data, error } = await supabase.functions.invoke('openai', {
    body,
  });

  if (error) {
    console.error("Error invoking OpenAI function:", error);
    return { error: error.message };
  }

  return data as OpenAIResponse;
}

// Future edge functions can be added here:
// export async function invokeAnotherFunction(params: any) { }
