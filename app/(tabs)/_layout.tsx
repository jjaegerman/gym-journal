import { Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useTheme } from "tamagui";
import { BarChart3, List, Plus, User } from "@tamagui/lucide-icons";
import { useTabContext } from "@/lib/context/TabContext";
import { SettingsMenu } from "@/components/ui/SettingsMenu";
import { config } from "@/tamagui.config";

export default function TabLayout() {
  const theme = useTheme();
  const { tabsDisabled } = useTabContext();
  const { width } = useWindowDimensions();
  const isWide = width >= config.media.md.minWidth;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent9.val,
        tabBarInactiveTintColor: tabsDisabled
          ? theme.color10.val
          : theme.color11.val,
        tabBarStyle: {
          backgroundColor: theme.color2.val,
          borderTopColor: theme.color6.val,
          paddingTop: 0,
        },
        tabBarLabelStyle: { fontSize: isWide ? 14 : 10, marginTop: isWide ? 5 : 0 },
        tabBarIconStyle: { marginBottom: isWide ? -4 : 0 },
        headerStyle: {
          backgroundColor: theme.color2.val,
          borderBottomColor: theme.color6.val,
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
          title: "History",
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
