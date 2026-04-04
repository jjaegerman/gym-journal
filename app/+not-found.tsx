import { Link, Stack } from 'expo-router'
import { View, Text } from 'tamagui'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View m="$3">
        <Text>This screen doesn't exist.</Text>
        <Link href="/">
          <Text color={"$blue10" as any} mt="$4" py="$4">Go to home screen!</Text>
        </Link>
      </View>
    </>
  )
}
