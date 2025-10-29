import { RecordButton } from "components/RecordButton";
import { RecordTextBox } from "components/RecordTextBox";
import { SizableText, Text, useTheme, View, YStack } from "tamagui";

export default function TabTwoScreen() {
  const theme = useTheme();
  return (
    <View flex={1} justify="center">
      <YStack height="90%" items="center" justify="center" gap="$4">
        <YStack items="center" justify="center" flex={1} gap="$3">
          <SizableText fontSize="$6">Record an Exercise Log</SizableText>
          <YStack items="center">
            <SizableText color={theme.placeholderColor}>
              "10 repetitions of bench press at 135 pounds"
            </SizableText>
            <SizableText color={theme.placeholderColor}>
              "3 sets of squats with 185 pounds for 8 repetitions each"
            </SizableText>
            <SizableText color={theme.placeholderColor}>
              "30 minutes of cycling at moderate effort"
            </SizableText>
          </YStack>
        </YStack>
        <RecordButton
          startCallback={async () => {}}
          stopCallback={async () => {}}
        />
        <RecordTextBox />
      </YStack>
    </View>
  );
}
