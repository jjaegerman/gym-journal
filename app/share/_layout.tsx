import { Stack } from "expo-router";
import { useTheme } from "tamagui";

/**
 * Layout for /share/* routes.
 *
 * These routes are public — the session gate in `components/Provider.tsx`
 * short-circuits when the top-level segment is `share`, so we never try to
 * render `<Auth/>` or `UnitPreferencesProvider` here.
 */
export default function ShareLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.background.val,
        },
      }}
    />
  );
}
