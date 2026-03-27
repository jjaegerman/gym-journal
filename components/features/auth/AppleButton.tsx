import { Platform, Image, TouchableOpacity } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/api/supabase/client";
import { useToastController } from "@tamagui/toast";

// Conditionally import Google Sign-In only on native
let GoogleSignin: any = null;

if (Platform.OS !== "web") {
  try {
    const googleSignIn = require("@react-native-google-signin/google-signin");
    GoogleSignin = googleSignIn.GoogleSignin;
  } catch (e) {
    // Module not available (Expo Go)
  }
}

export default function AppleButton({ height }: { height: number }) {
  const toast = useToastController();

  // Only render on iOS
  if (Platform.OS !== "ios" || GoogleSignin === null) {
    return null;
  }

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Sign in via Supabase Auth
      if (credential.identityToken) {
        const {
          error,
          data: { user },
        } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error) {
          toast.show(error.message, {
            duration: 3000,
            customData: { theme: "red" },
          });
          return;
        }
      } else {
        throw new Error("No identityToken.");
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        // User cancelled the sign-in flow, don't show error
        return;
      } else {
        toast.show(e.message || "An error occurred during sign in", {
          duration: 3000,
          customData: { theme: "red" },
        });
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handleAppleSignIn}
      style={{
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Image
        source={require("@/assets/images/apple-signin-button.png")}
        style={{
          width: "100%",
          height,
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}
