import { useState } from 'react';
import { Platform } from 'expo-modules-core';
import { audioFileToBase64 } from '@/lib/utils';
import { invokeOpenAI, ExerciseContext } from '@/lib/api/supabase/functions';
import { useToastController } from '@tamagui/toast';
import * as Haptics from 'expo-haptics';
import { useUnitPreferences } from './useUnitPreferences';

const SPINNER_DURATION_MS = 1000;

/**
 * Custom hook for submitting exercise data via audio or text
 * Uses optimistic UI: shows spinner for 1s, then processes in background
 */
export function useExerciseSubmit(onSuccess?: () => void, workoutId?: string) {
  const [loading, setLoading] = useState(false);
  const toast = useToastController();
  const { prefs } = useUnitPreferences();

  const submitAudio = async (audioUri: string, context?: ExerciseContext) => {
    setLoading(true);

    // Start API call and attach handlers immediately to prevent unhandled rejection
    (async () => {
      const base64Audio = await audioFileToBase64(audioUri);
      const fileExtension =
        Platform.OS === 'web' ? 'webm' : audioUri.split('.').pop() || 'webm';
      const fileName = 'audio.' + fileExtension;

      return invokeOpenAI(
        {
          fileExtension,
          fileName,
          base64: base64Audio,
        },
        undefined,
        context,
        workoutId,
        prefs
      );
    })()
      .then(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show('Exercise logged!', {
          duration: 3000,
          customData: { theme: 'green', icon: 'check' },
        });
        onSuccess?.();
      })
      .catch((error) => {
        console.error('Error submitting audio:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.show('Failed to log exercise', {
          duration: 3000,
          customData: { theme: 'red' },
        });
      });

    // Wait 1 second, then dismiss spinner
    await new Promise((resolve) => setTimeout(resolve, SPINNER_DURATION_MS));
    setLoading(false);
  };

  const submitText = async (text: string, context?: ExerciseContext) => {
    setLoading(true);

    // Start API call and attach handlers immediately to prevent unhandled rejection
    invokeOpenAI(undefined, text, context, workoutId, prefs)
      .then(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.show('Exercise logged!', {
          duration: 3000,
          customData: { theme: 'green', icon: 'check' },
        });
        onSuccess?.();
      })
      .catch((error) => {
        console.error('Error submitting text:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.show('Failed to log exercise', {
          duration: 3000,
          customData: { theme: 'red' },
        });
      });

    // Wait 1 second, then dismiss spinner
    await new Promise((resolve) => setTimeout(resolve, SPINNER_DURATION_MS));
    setLoading(false);
  };

  return {
    submitAudio,
    submitText,
    loading,
  };
}
