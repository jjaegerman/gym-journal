import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Text, View, Input, Button, YStack, XStack } from 'tamagui'
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from 'expo-audio';
import { Alert, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Workout, WorkoutDetails, WorkoutDetailsSchema, WorkoutsArraySchema, WorkoutSchema } from 'types/exercise';
import { audioFileToBase64 } from '@/lib/utils';

export default function CallFunc() {

  const [session, setSession] = useState<Session | null>(null)
      useEffect(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session)
          })
          supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session)
          })
      }, [])

  const callFunction = async (query: string) => {
    const base64Audio = await audioFileToBase64(audioRecorder.uri!);
    const fileExtension = Platform.OS === 'web' ? "webm" : audioRecorder.uri?.split('.').pop() || 'webm';
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
  const getWorkouts = async () => {
    const { data, error } = await supabase.rpc("get_user_workouts", { p_user_id: session?.user.id });
    if (error) {
      console.error('Error fetching workouts:', error);
      return;
    }
    console.log('Workouts:', data);
    console.log(WorkoutsArraySchema.parse(data));
}
  const getWorkout = async () => {
    const { data, error } = await supabase.rpc("get_workout_details", { p_workout_id: workoutId });
    if (error) {
      console.error('Error fetching workout details:', error);
      return;
    }
    console.log('Workout Details:', data);
    console.log('Typed Workout Details:', WorkoutDetailsSchema.parse(data));
  }
  const [responseText, setResponseText] = useState('')
  const [query, setQuery] = useState('')
  const [workoutId, setWorkoutId] = useState('')

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
      <XStack >
        <Button onPress={() => getWorkouts()}>Get Workouts</Button>
        <Button onPress={() => getWorkout()}>Get Workout Details</Button>
      </XStack>
      <Input
        placeholder="Enter workout ID"
        width={300}
        mb={20}
        onChangeText={(text) => setWorkoutId(text)}
      />
    </YStack>
  )
}


