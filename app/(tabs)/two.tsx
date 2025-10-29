import { RecordButton } from 'components/RecordButton'
import { Text, View } from 'tamagui'

export default function TabTwoScreen() {
  return (
    <View flex={1} items="center" justify="center" bg="$background">
      <RecordButton startCallback={async () => {}} stopCallback={async () => {}} />
    </View>
  )
}
