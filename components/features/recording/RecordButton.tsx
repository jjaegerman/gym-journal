import { useEffect } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { selectionAsync } from "expo-haptics";
import { View, useTheme, Button, Text } from "tamagui";
import { X } from "@tamagui/lucide-icons";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from "react-native-reanimated";
import { formatStopwatch } from "@/lib/utils/date";

const RECORD_BUTTON_SIZE = 60;
const RECORD_BUTTON_BACKGROUND_SIZE = RECORD_BUTTON_SIZE + 16;
const RECORDING_INDICATOR_SCALE = 0.5;
const SPRING_SHORT_CONFIG: WithSpringConfig = {
  stiffness: 120,
  overshootClamping: true,
};

export const RecordButton = ({
  startCallback,
  stopCallback,
  cancelCallback,
  durationMillis = 0,
  isRecording = false,
  disabled = false,
}: {
  startCallback: () => Promise<void>;
  stopCallback: () => Promise<void>;
  cancelCallback?: () => Promise<void>;
  durationMillis?: number;
  isRecording?: boolean;
  disabled?: boolean;
}) => {
  const theme = useTheme();

  const recordBorderColor = theme.color.val;
  const recordIndicatorColor = theme.accent9.val;
  const scale = useSharedValue(isRecording ? RECORDING_INDICATOR_SCALE : 1);

  // Animate scale when isRecording changes
  useEffect(() => {
    scale.value = withSpring(
      isRecording ? RECORDING_INDICATOR_SCALE : 1,
      SPRING_SHORT_CONFIG,
    );
  }, [isRecording, scale]);

  const recordIndicatorAnimation = useAnimatedStyle(() => ({
    borderRadius: interpolate(
      scale.value,
      [1, RECORDING_INDICATOR_SCALE],
      [RECORD_BUTTON_SIZE / 2, 8],
      Extrapolation.CLAMP,
    ),
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    if (disabled) return;
    selectionAsync();
    if (isRecording) {
      stopCallback();
    } else {
      try {
        await startCallback();
      } catch (error) {
        Alert.alert(
          "Recording Error",
          "Failed to start recording. Please try again.",
        );
        console.error("Failed to start recording:", error);
      }
    }
  };

  const handleCancel = async () => {
    if (disabled) return;
    selectionAsync();
    cancelCallback?.();
  };

  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 16 }}>
      {/* Timer positioned above button - always takes up space */}
      <View
        style={{ height: 32, alignItems: "center", justifyContent: "center" }}
      >
        {isRecording && (
          <Text
            fontSize="$8"
            fontWeight="bold"
            color="$color"
            animation="quick"
            enterStyle={{ opacity: 0, scale: 0.9 }}
            exitStyle={{ opacity: 0, scale: 0.9 }}
            opacity={1}
            scale={1}
          >
            {formatStopwatch(durationMillis)}
          </Text>
        )}
      </View>

      {/* Button container with fixed positioning */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <View
          style={[
            styles.recordButtonBackground,
            { borderColor: recordBorderColor },
          ]}
        />
        <Pressable style={styles.recordButton} onPress={handlePress}>
          <Animated.View
            style={[
              styles.recordIndicator,
              { backgroundColor: recordIndicatorColor },
              recordIndicatorAnimation,
            ]}
          />
        </Pressable>
      </View>

      {/* Cancel button - always takes up space */}
      <View
        style={{ height: 36, alignItems: "center", justifyContent: "center" }}
      >
        {isRecording && cancelCallback && (
          <Button
            icon={X}
            size="$2"
            circular
            onPress={handleCancel}
            chromeless
            color="$red10"
            animation="quick"
            enterStyle={{ opacity: 0, scale: 0.9 }}
            exitStyle={{ opacity: 0, scale: 0.9 }}
            opacity={1}
            scale={1}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recordIndicator: {
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
    position: "absolute",
  },
});
