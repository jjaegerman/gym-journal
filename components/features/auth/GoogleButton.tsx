import { useState } from "react";
import { Platform, Image, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/api/supabase/client";
import { useToastController } from "@tamagui/toast";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// Conditionally import Google Sign-In only on native
let GoogleSignin: any = null;
let GoogleSigninButton: any = null;
let isSuccessResponse: any = null;
let statusCodes: any = null;

if (Platform.OS !== "web") {
  try {
    const googleSignIn = require("@react-native-google-signin/google-signin");
    GoogleSignin = googleSignIn.GoogleSignin;
    GoogleSigninButton = googleSignIn.GoogleSigninButton;
    isSuccessResponse = googleSignIn.isSuccessResponse;
    statusCodes = googleSignIn.statusCodes;
  } catch (e) {
    // Module not available (Expo Go)
  }
}

// Check if native Google Sign-In is available
// If GoogleSignin loaded successfully, we're in a dev build (not Expo Go)
const canUseNativeGoogleSignIn = Platform.OS !== "web" && GoogleSignin !== null;

// Configure native Google Sign-In if available
if (canUseNativeGoogleSignIn && GoogleSignin) {
  GoogleSignin.configure({
    webClientId:
      "1012001502522-puld1fcvltg838kshrdqn747v88fno05.apps.googleusercontent.com",
    iosClientId:
      "1012001502522-tpeg8i3r4d24b1t99ptqrlej15m7i4fq.apps.googleusercontent.com",
  });
}

export default function GoogleButton({ height }: { height: number }) {
  const [loading, setLoading] = useState(false);
  const toast = useToastController();

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      console.log("Can use native Google Sign-In:", canUseNativeGoogleSignIn);

      if (canUseNativeGoogleSignIn) {
        // Native Google Sign-In SDK (dev build only)
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        if (isSuccessResponse(response)) {
          const { error, data } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.data.idToken,
          });

          if (error) {
            toast.show(error.message, {
              duration: 3000,
              customData: { theme: "red" },
            });
          }
        }
        setLoading(false);
      } else if (Platform.OS === "web") {
        // Web OAuth - redirect in same window
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error) {
          toast.show(error.message, {
            duration: 3000,
            customData: { theme: "red" },
          });
          setLoading(false);
        }
        // If successful, user will be redirected to Google
      } else {
        // Native Expo Go - Browser-based OAuth with WebBrowser
        // Use custom scheme for stable redirect
        const redirectTo = "com.supabase.gym-journal://";

        console.log("Native redirect URI:", redirectTo);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          toast.show(error.message, {
            duration: 3000,
            customData: { theme: "red" },
          });
          setLoading(false);
          return;
        }

        console.log("OAuth URL:", data.url);

        // Open the OAuth URL in an in-app browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        console.log("WebBrowser result:", result);

        if (result.type !== "success") {
          setLoading(false);
          // User cancelled or something went wrong
          if (result.type === "cancel") {
            // User cancelled, don't show error
            return;
          }
          toast.show("Authentication was cancelled or failed", {
            duration: 3000,
            customData: { theme: "red" },
          });
          return;
        }

        // Extract tokens from the URL and set session
        const url = result.url;
        const params = new URLSearchParams(url.split("#")[1]);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            toast.show(sessionError.message, {
              duration: 3000,
              customData: { theme: "red" },
            });
          }
          // Success! User will be automatically logged in by Provider.tsx
        }

        setLoading(false);
      }
    } catch (error: any) {
      console.error("Sign-in error caught:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error:", JSON.stringify(error, null, 2));

      let errorMessage = "An error occurred during sign in";

      // Handle native SDK errors if applicable
      if (canUseNativeGoogleSignIn && statusCodes) {
        console.log("Checking status codes...", statusCodes);
        if (error.code === statusCodes.IN_PROGRESS) {
          errorMessage = "Sign in already in progress";
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          errorMessage = "Google Play Services not available";
        } else if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // User cancelled, don't show error
          console.log("User cancelled sign-in");
          setLoading(false);
          return;
        } else {
          errorMessage = `Sign in failed: ${
            error.message || error.code || "Unknown error"
          }`;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }

      console.error("Showing error toast:", errorMessage);

      toast.show(errorMessage, {
        duration: 5000,
        customData: { theme: "red" },
      });
      setLoading(false);
    }
  };

  // Use the same image button for all platforms
  // Native SDK handles the auth flow, but we control the button UI
  return (
    <TouchableOpacity
      onPress={handleGoogleSignIn}
      disabled={loading}
      style={{
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Image
        source={require("@/assets/images/google-signin-button.png")}
        style={{
          width: "100%",
          height,
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}
