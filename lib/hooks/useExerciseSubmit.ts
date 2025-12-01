import { useState } from 'react';
import { Platform } from 'expo-modules-core';
import { audioFileToBase64 } from '@/lib/utils';
import { invokeOpenAI } from '@/lib/api/supabase/functions';
import { useToastController } from '@tamagui/toast';
import * as Haptics from 'expo-haptics';

/**
 * Custom hook for submitting exercise data via audio or text
 * Handles audio conversion and API calls
 */
export function useExerciseSubmit() {
  const [loading, setLoading] = useState(false);
  const toast = useToastController();

  const submitAudio = async (audioUri: string, query?: string) => {
    try {
      setLoading(true);

      const base64Audio = await audioFileToBase64(audioUri);
      const fileExtension =
        Platform.OS === 'web' ? 'webm' : audioUri.split('.').pop() || 'webm';
      const fileName = 'audio.' + fileExtension;

      const data = await invokeOpenAI(
        {
          fileExtension,
          fileName,
          base64: base64Audio,
        },
        query
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Exercise logged successfully!', {
        duration: 3000,
        customData: { theme: 'green' },
      });

      return { data };
    } catch (error) {
      console.error('Error submitting audio:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show('Failed to log exercise', {
        duration: 3000,
        customData: { theme: 'red' },
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const submitText = async (text: string) => {
    try {
      setLoading(true);

      // TODO: Implement text-based exercise submission
      console.log('Submitting text:', text);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Exercise logged successfully!', {
        duration: 3000,
        customData: { theme: 'green' },
      });

      return {};
    } catch (error) {
      console.error('Error submitting text:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show('Failed to log exercise', {
        duration: 3000,
        customData: { theme: 'red' },
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    submitAudio,
    submitText,
    loading,
  };
}
