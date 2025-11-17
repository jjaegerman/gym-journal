import { useColorScheme } from "react-native";
import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { CurrentToast } from "@/components/ui/feedback";
import { config } from "../tamagui.config";
import {
  startAutoRefresh,
  stopAutoRefresh,
  setSession as setSupabaseSession,
} from "@/lib/api/supabase/auth";
import { Auth } from "@/components/features/auth";
import { AppState } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { View } from "tamagui";
import { useSession } from "@/lib/hooks";

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

WebBrowser.maybeCompleteAuthSession();

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return;
  const { data, error } = await setSupabaseSession(access_token, refresh_token);
  if (error) throw error;
  return data.session;
};

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, "config">) {
  const colorScheme = useColorScheme();
  const { session } = useSession();

  const url = Linking.useLinkingURL();
  if (url) createSessionFromUrl(url);

  return (
    <TamaguiProvider config={config} defaultTheme={"dark"} {...rest}>
      <ToastProvider
        swipeDirection="horizontal"
        duration={6000}
        native={
          [
            // uncomment the next line to do native toasts on mobile. NOTE: it'll require you making a dev build and won't work with Expo Go
            // 'mobile'
          ]
        }
      >
        <View bg="$background" flex={1}>
          {session ? session.user ? children : <Auth /> : <></>}
        </View>
        <CurrentToast />
        <ToastViewport top="$8" left={0} right={0} />
      </ToastProvider>
    </TamaguiProvider>
  );
}
