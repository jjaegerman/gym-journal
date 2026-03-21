import { Sheet, YStack, XStack, Text, H4, Separator, Switch, Label } from "tamagui";
import { useUnitPreferences } from "@/lib/hooks";
import { UnitPreferences } from "@/lib/api/supabase/profile";

interface UnitPreferencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitPreferencesSheet({ open, onOpenChange }: UnitPreferencesSheetProps) {
  const { prefs, updatePrefs } = useUnitPreferences();

  return (
    <Sheet open={open} onOpenChange={onOpenChange} snapPoints={[35]} dismissOnSnapToBottom modal>
      <Sheet.Overlay opacity={0.5} />
      <Sheet.Frame p="$4">
        <Sheet.Handle />
        <YStack gap="$4" mt="$2">
          <H4>Unit Preferences</H4>
          <Separator />
          <XStack items="center" justify="space-between">
            <Text fontSize="$5">Weight</Text>
            <XStack items="center" gap="$3">
              <Label htmlFor="weight-switch">lbs</Label>
              <Switch
                id="weight-switch"
                size="$3"
                p={0}
                bg={prefs.weightUnit === "kg" ? "$color8" : "$color4"}
                borderColor={prefs.weightUnit === "kg" ? "$color8" : "$color4"}
                checked={prefs.weightUnit === "kg"}
                onCheckedChange={(checked) =>
                  updatePrefs({ ...prefs, weightUnit: checked ? "kg" : "lbs" })
                }
              >
                <Switch.Thumb animation="quick" />
              </Switch>
              <Label htmlFor="weight-switch">kg</Label>
            </XStack>
          </XStack>
          <XStack items="center" justify="space-between">
            <Text fontSize="$5">Distance</Text>
            <XStack items="center" gap="$3">
              <Label htmlFor="distance-switch">mi</Label>
              <Switch
                id="distance-switch"
                size="$3"
                p={0}
                bg={prefs.distanceUnit === "km" ? "$color8" : "$color4"}
                borderColor={prefs.distanceUnit === "km" ? "$color8" : "$color4"}
                checked={prefs.distanceUnit === "km"}
                onCheckedChange={(checked) =>
                  updatePrefs({ ...prefs, distanceUnit: checked ? "km" : "miles" })
                }
              >
                <Switch.Thumb animation="quick" />
              </Switch>
              <Label htmlFor="distance-switch">km</Label>
            </XStack>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
