import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
} from 'react-native'
import { selectionAsync } from 'expo-haptics'
import { View, useTheme } from "tamagui"
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated'

const RECORD_BUTTON_SIZE = 60
const RECORD_BUTTON_BACKGROUND_SIZE = RECORD_BUTTON_SIZE + 16
const RECORDING_INDICATOR_COLOR = '#d72d66'
const RECORDING_INDICATOR_SCALE = 0.5
const SPRING_SHORT_CONFIG: WithSpringConfig = {
  stiffness: 120,
  overshootClamping: true,
}

export const RecordButton = ({startCallback, stopCallback}: {startCallback: () => Promise<void>, stopCallback: () => Promise<void>}) => {
  const [isRecording, setIsRecording] = useState(false)  
  const theme = useTheme();
  

  const recordBorderColor = theme.color.val
  const scale = useSharedValue(1)

  const recordIndicatorAnimation =
    useAnimatedStyle(() => ({
      borderRadius: interpolate(
        scale.value,
        [1, RECORDING_INDICATOR_SCALE],
        [RECORD_BUTTON_SIZE / 2, 8],
        Extrapolation.CLAMP
      ),
      transform: [{ scale: scale.value }],
    }))

  const handlePress = async () => {
    selectionAsync()
    if (isRecording) {
      await stopCallback()
      scale.value = withSpring(1, SPRING_SHORT_CONFIG)
      setIsRecording(false)
    } else {
      await startCallback()

      scale.value = withSpring(RECORDING_INDICATOR_SCALE, SPRING_SHORT_CONFIG)
      setIsRecording(true)
    }
  }

  return (<>
    <View style={[styles.recordButtonBackground, { borderColor: recordBorderColor }]} />
    <Pressable style={styles.recordButton} onPress={handlePress}>
    <Animated.View style={[styles.recordIndicator, recordIndicatorAnimation]} />
    </Pressable>
    </>)
}

const styles = StyleSheet.create({
  recordIndicator: {
    backgroundColor: RECORDING_INDICATOR_COLOR,
    borderRadius: RECORD_BUTTON_SIZE / 2,
    height: RECORD_BUTTON_SIZE,
    width: RECORD_BUTTON_SIZE,
  },

  recordButtonBackground: {
    borderRadius: RECORD_BUTTON_BACKGROUND_SIZE / 2,
    height: RECORD_BUTTON_BACKGROUND_SIZE,
    width: RECORD_BUTTON_BACKGROUND_SIZE,
    borderWidth: 2,
  },

  recordButton: {
    position: 'absolute',
  },
})
