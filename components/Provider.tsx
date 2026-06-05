import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { TamaguiProvider, type TamaguiProviderProps } from "tamagui";
import { ToastProvider, ToastViewport } from "@tamagui/toast";
import { CurrentToast } from "@/components/ui/feedback";
import { config } from "../tamagui.config";
import { setSession as setSupabaseSession } from "@/lib/api/supabase/auth";
import { Auth } from "@/components/features/auth";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { View } from "tamagui";
import { SplashScreen, useSegments } from "expo-router";
import { useSession } from "@/lib/hooks";
import { TabProvider } from "@/lib/context/TabContext";
import { UnitPreferencesProvider } from "@/lib/context/UnitPreferencesContext";
import { SessionProvider } from "@/lib/context/SessionContext";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "@/lib/analytics/track";

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


function AppContent({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const segments = useSegments();
  // Public /share/* routes must render without an auth session and without
  // UnitPreferencesProvider (which throws unless a session exists). Cast
  // through string because the typed-routes codegen does not yet know about
  // the /share group on first build.
  const isShareRoute = (segments[0] as string) === "share";

  useEffect(() => {
    if (!loading || isShareRoute) SplashScreen.hideAsync();
  }, [loading, isShareRoute]);

  const url = Linking.useLinkingURL();
  if (url) createSessionFromUrl(url);

  return (
    <View bg="$background" flex={1}>
      <TabProvider>
        {isShareRoute ? (
          <UnitPreferencesProvider>{children}</UnitPreferencesProvider>
        ) : loading ? null : session?.user ? (
          <UnitPreferencesProvider>{children}</UnitPreferencesProvider>
        ) : (
          <Auth />
        )}
      </TabProvider>
    </View>
  );
}

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, "config">) {
  const colorScheme = useColorScheme();

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
        {posthog ? (
          <PostHogProvider client={posthog}>
            <SessionProvider>
              <AppContent>{children}</AppContent>
            </SessionProvider>
          </PostHogProvider>
        ) : (
          <SessionProvider>
            <AppContent>{children}</AppContent>
          </SessionProvider>
        )}
        <CurrentToast />
        <ToastViewport top="$8" left={0} right={0} />
      </ToastProvider>
    </TamaguiProvider>
  );
}
