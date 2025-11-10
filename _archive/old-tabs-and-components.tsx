/**
 * ARCHIVED CODE - Old tabs and components
 * Saved for reference in case we need to copy something
 */

// ============================================
// OLD INDEX TAB (Tab One with Tamagui Demo)
// ============================================

/*
import { ExternalLink } from '@tamagui/lucide-icons'
import { Anchor, H2, Paragraph, XStack, YStack } from 'tamagui'
import { ToastControl } from '@/components/ui/feedback'
import CallFunc from 'components/CallFunc'

export default function TabOneScreen() {
  return (
    <YStack flex={1} items="center" gap="$8" px="$10" pt="$5" bg="$background">
      <H2>Tamagui + Expo</H2>

      <ToastControl />

      <XStack
        items="center"
        justify="center"
        flexWrap="wrap"
        gap="$1.5"
        position="absolute"
        b="$8"
      >
        <Paragraph fontSize="$5">Add</Paragraph>

        <Paragraph fontSize="$5" px="$2" py="$1" color="$blue10" bg="$blue5">
          tamagui.config.ts
        </Paragraph>

        <Paragraph fontSize="$5">to root and follow the</Paragraph>

        <XStack
          items="center"
          gap="$1.5"
          px="$2"
          py="$1"
          rounded="$3"
          bg="$green5"
          hoverStyle={{ bg: '$green6' }}
          pressStyle={{ bg: '$green4' }}
        >
          <Anchor
            href="https://tamagui.dev/docs/core/configuration"
            textDecorationLine="none"
            color="$green10"
            fontSize="$5"
          >
            Configuration guide
          </Anchor>
          <ExternalLink size="$1" color="$green10" />
        </XStack>

        <Paragraph fontSize="$5" text="center">
          to configure your themes and tokens.
        </Paragraph>
      </XStack>
      <CallFunc />
    </YStack>
  )
}
*/

// ============================================
// ACCOUNT TAB SCREEN
// ============================================

/*
import { useEffect, useState } from 'react'
import Account from '../../components/Account'
import { Session } from '@supabase/supabase-js'
import { supabase } from 'lib/supabase'

export default function AccountTabScreen() {
const [session, setSession] = useState<Session | null>(null)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        })
        supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        })
    }, [])

  return (
    <Account key={session?.user.id} session={session!} />
  )
}
*/

// ============================================
// ACCOUNT COMPONENT
// ============================================

/*
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StyleSheet, View, Alert } from 'react-native'
import { Button, Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (session) getProfile()
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string
    website: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input label="Email" value={session?.user?.email} disabled />
      </View>
      <View style={styles.verticallySpaced}>
        <Input label="Username" value={username || ''} onChangeText={(text) => setUsername(text)} />
      </View>
      <View style={styles.verticallySpaced}>
        <Input label="Website" value={website || ''} onChangeText={(text) => setWebsite(text)} />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? 'Loading ...' : 'Update'}
          onPress={() => updateProfile({ username, website, avatar_url: avatarUrl })}
          disabled={loading}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})
*/

// ============================================
// CALLFUNC COMPONENT (Test Component)
// ============================================

/*
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
*/
