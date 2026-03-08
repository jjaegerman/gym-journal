import { Tabs } from "expo-router";
import { useTheme } from "tamagui";
import { BarChart3, List, Plus, User } from "@tamagui/lucide-icons";
import { useTabContext } from "@/lib/context/TabContext";
import { SettingsMenu } from "@/components/ui/SettingsMenu";

export default function TabLayout() {
  const theme = useTheme();
  const { tabsDisabled } = useTabContext();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent9.val,
        tabBarInactiveTintColor: tabsDisabled
          ? theme.color10.val
          : theme.color11.val,
        tabBarStyle: {
          backgroundColor: theme.color2.val,
          borderTopColor: theme.color8.val,
        },
        headerStyle: {
          backgroundColor: theme.color2.val,
          borderBottomColor: theme.color8.val,
        },
        headerShown: true,
        headerRight: () => <SettingsMenu />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Record",
          tabBarIcon: ({ color }) => <Plus color={color as any} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (tabsDisabled) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color }) => <List color={color as any} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (tabsDisabled) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color }) => <BarChart3 color={color as any} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (tabsDisabled) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color as any} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (tabsDisabled) {
              e.preventDefault();
            }
          },
        }}
      />
    </Tabs>
  );
}
