import { Link, Tabs } from "expo-router";
import { Button, useTheme } from "tamagui";
import {
  Atom,
  AudioWaveform,
  Home,
  List,
  Menu,
  Plus,
} from "@tamagui/lucide-icons";
import { supabase } from "lib/supabase";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.red10.val,
        tabBarStyle: {
          backgroundColor: theme.background.val,
          borderTopColor: theme.borderColor.val,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
          borderBottomColor: theme.borderColor.val,
        },
        headerTintColor: theme.color.val,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tab One",
          tabBarIcon: ({ color }) => <Atom color={color as any} />,
          headerRight: () => (
            <Button mr="$4" size="$2.5" onPress={() => supabase.auth.signOut()}>
              Sign Out
            </Button>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Record Activity",
          tabBarIcon: ({ color }) => <Plus color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <AudioWaveform color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          title: "Workout History",
          tabBarIcon: ({ color }) => <List color={color as any} />,
        }}
      />
    </Tabs>
  );
}
