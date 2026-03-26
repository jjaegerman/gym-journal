import { useState } from "react";
import { Linking } from "react-native";
import { Popover, Button, YGroup, ListItem, Separator, Dialog, Input, XStack, YStack, Spinner, Text } from "tamagui";
import { Settings, MessageSquare, HelpCircle, LogOut, Ruler, Trash2 } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { signOut, deleteAccount } from "@/lib/api/supabase/auth";
import { UnitPreferencesSheet } from "./UnitPreferencesSheet";

const FEEDBACK_URL = "https://forms.gle/twrXS5ZPS8GNcugA7";
const HELP_URL = "https://forms.gle/twrXS5ZPS8GNcugA7";
const DELETE_CONFIRMATION = "DELETE";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToastController();

  function handleAction(fn: () => void) {
    setOpen(false);
    fn();
  }

  function handleDeleteAccountPress() {
    setDeleteInput("");
    handleAction(() => setDeleteDialogOpen(true));
  }

  function handleCancelDelete() {
    setDeleteDialogOpen(false);
    setDeleteInput("");
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);

    if (error) {
      toast.show("Failed to delete account. Please try again.", {
        duration: 4000,
        customData: { theme: "red" },
      });
      return;
    }

    setDeleteDialogOpen(false);
    await signOut();
  }

  return (
    <>
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" allowFlip>
      <Popover.Trigger asChild>
        <Button chromeless mr="$3" icon={<Settings size={22} />} />
      </Popover.Trigger>
      <Popover.Content bordered elevate p={0} overflow="hidden" minWidth="$14">
        <YGroup width="100%" separator={<Separator />}>
          <YGroup.Item>
            <ListItem
              hoverTheme
              pressTheme
              cursor="pointer"
              icon={Ruler}
              title="Unit Preferences"

              onPress={() => handleAction(() => setUnitSheetOpen(true))}
            />
          </YGroup.Item>
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
          <YGroup.Item>
            <ListItem
              hoverTheme
              pressTheme
              cursor="pointer"
              icon={Trash2}
              title="Delete Account"
              color="$red10"
              iconAfter={undefined}

              onPress={handleDeleteAccountPress}
            />
          </YGroup.Item>
        </YGroup>
      </Popover.Content>
    </Popover>

    <UnitPreferencesSheet open={unitSheetOpen} onOpenChange={setUnitSheetOpen} />

    <Dialog modal open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="delete-account-overlay"
          background="$shadow6"
          animateOnly={["transform", "opacity"]}
          animation="quicker"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          bordered
          elevate
          key="delete-account-content"
          animateOnly={["transform", "opacity"]}
          animation="quicker"
          enterStyle={{ x: 0, y: 20, opacity: 0 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          maxWidth={340}
        >
          <YStack gap="$4" p="$4">
            <Dialog.Title color="$red10">Delete Account?</Dialog.Title>
            <Dialog.Description>
              This will permanently delete your account and all workout data. This cannot be undone.
            </Dialog.Description>
            <YStack gap="$2">
              <Text fontSize="$3" color="$color11">
                Type <Text fontWeight="bold">DELETE</Text> to confirm
              </Text>
              <Input
                value={deleteInput}
                onChangeText={setDeleteInput}
                placeholder="DELETE"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isDeleting}
              />
            </YStack>
            <XStack gap="$3" justify="flex-end">
              <Button onPress={handleCancelDelete} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                color="$red10"
                onPress={handleConfirmDelete}
                disabled={deleteInput !== DELETE_CONFIRMATION || isDeleting}
                icon={isDeleting ? <Spinner size="small" /> : undefined}
              >
                Delete
              </Button>
            </XStack>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
    </>
  );
}
