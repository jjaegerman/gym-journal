import { Tabs } from "expo-router";
import { Button, useTheme } from "tamagui";
import { List, Plus, User } from "@tamagui/lucide-icons";
import { signOut } from "@/lib/api/supabase/auth";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent5.val,
        tabBarStyle: {
          backgroundColor: theme.color3.val,
          borderTopColor: theme.color6.val,
        },
        headerStyle: {
          backgroundColor: theme.color3.val,
          borderBottomColor: theme.color6.val,
        },
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Record Activity",
          tabBarIcon: ({ color }) => <Plus color={color as any} />,
          headerRight: () => (
            <Button mr="$4" size="$2.5" onPress={() => signOut()}>
              Sign Out
            </Button>
          ),
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          title: "Workout History",
          tabBarIcon: ({ color }) => <List color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color as any} />,
        }}
      />
    </Tabs>
  );
}
