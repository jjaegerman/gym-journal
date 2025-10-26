import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Text, View, Input, Button, YStack } from 'tamagui'
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function CallFunc() {
  async function audioFileToBase64(uri) {
    if (Platform.OS === 'web') {
      // Web environment
      const response = await fetch(uri);
      const blob = await response.blob();
      return await blobToBase64(blob);
    } else {
      // Native (iOS / Android)
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  }

  // Helper for web: convert Blob → Base64
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          // Strip "data:*/*;base64," prefix
          resolve(result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert blob to base64: result is not a string'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const callFunction = async (query: string) => {
    const base64Audio = await audioFileToBase64(audioRecorder.uri!);
    const fileExtension = Platform.OS === 'web' ? "webm" : audioRecorder.uri?.split('.').pop() || 'webm';
    console.log('URI:', audioRecorder.uri, " DONE");
    const fileName = "audio." + fileExtension;

    const { data, error } = await supabase.functions.invoke('openai', {
      body: {
        query: query,
        audio: {
            fileExtension: fileExtension,
            fileName: fileName,
            base64: base64Audio,
        },
      },
    })

    if (error) {
      console.error('Error calling function:', error)
      return
    }
    setResponseText(JSON.stringify(data))
  }
  const [responseText, setResponseText] = useState('')
  const [query, setQuery] = useState('')

  const recordingOptions = RecordingPresets.HIGH_QUALITY;
  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  const record = async () => {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const stopRecording = async () => {
    // The recording will be available on `audioRecorder.uri`.
    await audioRecorder.stop();
  };

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  return (
    <YStack items="center" justify="center" bg="$background">
      <Text fontSize={20} color="$blue10">
        Call Supabase Function
      </Text>
      <Input
        placeholder="Enter your query"
        width={300}
        mb={20}
        onChangeText={(text) => setQuery(text)}
      />
      <Text>Duration: {Math.round(recorderState.durationMillis / 1000)}s</Text>
      <Button onPress={() => (recorderState.isRecording ? stopRecording() : record())}>
        {recorderState.isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button>
      <Button onPress={() => callFunction(query)}>Call Function</Button>
      <Text>Response: {responseText}</Text>
    </YStack>
  )
}


