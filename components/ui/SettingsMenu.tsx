import { useState } from "react";
import { Linking } from "react-native";
import { Popover, Button, YGroup, ListItem, Separator } from "tamagui";
import { Settings, MessageSquare, HelpCircle, LogOut } from "@tamagui/lucide-icons";
import { signOut } from "@/lib/api/supabase/auth";

const FEEDBACK_URL = "";
const HELP_URL = "";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);

  function handleAction(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" allowFlip>
      <Popover.Trigger asChild>
        <Button chromeless mr="$3" icon={<Settings size={22} />} />
      </Popover.Trigger>
      <Popover.Content bordered elevate p={0} minWidth="$16" overflow="hidden">
        <YGroup width="100%" separator={<Separator />}>
          <YGroup.Item>
            <ListItem
              hoverTheme
              pressTheme
              cursor="pointer"
              icon={MessageSquare}
              title="Give Feedback"
              onPress={() =>
                handleAction(() => {
                  if (FEEDBACK_URL) Linking.openURL(FEEDBACK_URL);
                })
              }
            />
          </YGroup.Item>
          <YGroup.Item>
            <ListItem
              hoverTheme
              pressTheme
              cursor="pointer"
              icon={HelpCircle}
              title="Get Help"
              onPress={() =>
                handleAction(() => {
                  if (HELP_URL) Linking.openURL(HELP_URL);
                })
              }
            />
          </YGroup.Item>
          <YGroup.Item>
            <ListItem
              hoverTheme
              pressTheme
              cursor="pointer"
              icon={LogOut}
              title="Sign Out"
              color="$red10"
              iconAfter={undefined}
              onPress={() => handleAction(() => signOut())}
            />
          </YGroup.Item>
        </YGroup>
      </Popover.Content>
    </Popover>
  );
}
