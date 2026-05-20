import { useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { Button, Image, Text, XStack, YStack, isWeb } from "tamagui";
import { X } from "@tamagui/lucide-icons";

const IOS_URL =
  "https://apps.apple.com/us/app/gym-journal-workout-logger/id6756803786";
const ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.dacky.gymjournal";

type MobilePlatform = "ios" | "android" | null;

function detectMobilePlatform(): MobilePlatform {
  if (!isWeb || typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

export function AppInstallBanner() {
  const platform = useMemo(detectMobilePlatform, []);
  const [dismissed, setDismissed] = useState(false);

  if (!platform || dismissed) return null;

  const storeUrl = platform === "ios" ? IOS_URL : ANDROID_URL;

  return (
    <XStack
      style={{ position: "fixed", zIndex: 1000 } as object}
      b="$3"
      l="$3"
      r="$3"
      items="center"
      gap="$3"
      p="$3"
      bg="$color3"
      borderColor="$color6"
      borderWidth={1}
      rounded="$5"
    >
      <Image
        source={require("@/assets/images/icon.png")}
        width="$4"
        height="$4"
        rounded="$3"
      />
      <YStack flex={1} gap="$1">
        <Text color="$color12" fontWeight="600" numberOfLines={1}>
          Get the app
        </Text>
        <Text color="$color10" fontSize="$2" numberOfLines={1}>
          Log your own workouts
        </Text>
      </YStack>
      <Button
        size="$3"
        theme="accent"
        onPress={() => Linking.openURL(storeUrl)}
      >
        Install
      </Button>
      <Button
        size="$3"
        chromeless
        circular
        icon={X}
        onPress={() => setDismissed(true)}
        aria-label="Dismiss"
      />
    </XStack>
  );
}
