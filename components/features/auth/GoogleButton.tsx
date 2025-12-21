import { useState } from "react";
import { Platform, Image, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/api/supabase/client";
import { useToastController } from "@tamagui/toast";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

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

// Check if we're in a dev build (not Expo Go)
const isStandaloneApp = Constants.executionEnvironment === "standalone" ||
                        Constants.executionEnvironment === "storeClient";
const canUseNativeGoogleSignIn = Platform.OS !== "web" && GoogleSignin && isStandaloneApp;

// Configure native Google Sign-In if available
if (canUseNativeGoogleSignIn && GoogleSignin) {
  GoogleSignin.configure({
    webClientId:
      "1012001502522-puld1fcvltg838kshrdqn747v88fno05.apps.googleusercontent.com",
  });
}

export default function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const toast = useToastController();

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      if (canUseNativeGoogleSignIn) {
        // Native Google Sign-In SDK (dev build only)
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        if (isSuccessResponse(response)) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.data.idToken!,
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
      let errorMessage = "An error occurred during sign in";

      // Handle native SDK errors if applicable
      if (canUseNativeGoogleSignIn && statusCodes) {
        if (error.code === statusCodes.IN_PROGRESS) {
          errorMessage = "Sign in already in progress";
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          errorMessage = "Google Play Services not available";
        } else if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          // User cancelled, don't show error
          setLoading(false);
          return;
        }
      }

      toast.show(errorMessage, {
        duration: 3000,
        customData: { theme: "red" },
      });
      setLoading(false);
    }
  };

  // Render native button for dev builds, image button for web/Expo Go
  if (canUseNativeGoogleSignIn && GoogleSigninButton) {
    return (
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={handleGoogleSignIn}
        disabled={loading}
      />
    );
  }

  // Web + Expo Go: Use Google's official button image
  return (
    <TouchableOpacity onPress={handleGoogleSignIn} disabled={loading}>
      <Image
        source={require("@/assets/images/google-signin-button.png")}
        style={{
          width: "100%",
          height: 44,
          resizeMode: "contain",
        }}
      />
    </TouchableOpacity>
  );
}
