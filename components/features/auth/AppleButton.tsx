import { Platform, Image, TouchableOpacity } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/lib/api/supabase/client";
import { useToastController } from "@tamagui/toast";

export default function AppleButton() {
  const toast = useToastController();

  // Only render on iOS
  if (Platform.OS !== "ios") {
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
        const { error, data: { user } } = await supabase.auth.signInWithIdToken({
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

        if (!error && user) {
          // Apple only provides the user's full name on the first sign-in
          // Save it to user metadata if available
          if (credential.fullName) {
            const nameParts = [];
            if (credential.fullName.givenName)
              nameParts.push(credential.fullName.givenName);
            if (credential.fullName.middleName)
              nameParts.push(credential.fullName.middleName);
            if (credential.fullName.familyName)
              nameParts.push(credential.fullName.familyName);

            const fullName = nameParts.join(" ");

            await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                given_name: credential.fullName.givenName,
                family_name: credential.fullName.familyName,
              },
            });
          }
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
          height: 44,
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}
