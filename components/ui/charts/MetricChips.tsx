import { XStack, Button, Text, useTheme } from "tamagui";

export interface MetricChipOption<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  options: MetricChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

/**
 * Horizontal pill chips for switching the active metric in a trend chart.
 * Caller controls the available options + current selection.
 */
export function MetricChips<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();
  const inactiveBg = theme.color3.val;
  const selectedBg = theme.color5.val;
  const activeText = theme.color12.val;
  const inactiveText = theme.color11.val;

  return (
    <XStack gap="$2" justify="center" flexWrap="wrap">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Button
            key={o.id}
            size="$2"
            $sm={{ size: "$5" }}
            chromeless={!selected}
            bg={(selected ? selectedBg : inactiveBg) as any}
            onPress={() => onChange(o.id)}
            borderRadius="$3"
            px="$3"
          >
            <Text
              fontSize="$2"
              $sm={{ fontSize: "$4" }}
              fontWeight={selected ? "600" : "400"}
              color={(selected ? activeText : inactiveText) as any}
            >
              {o.label}
            </Text>
          </Button>
        );
      })}
    </XStack>
  );
}
