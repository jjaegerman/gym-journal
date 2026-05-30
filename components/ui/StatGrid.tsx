import { Card, YStack, XStack, Text, Paragraph, Separator, Theme } from "tamagui";
import { Fragment, ReactNode } from "react";

export interface StatGridCell {
  /** Leading icon, sized to the label row. */
  icon: ReactNode;
  /** Uppercase label above the value. */
  label: string;
  /** Hero value (number or pre-formatted string). */
  value: string | number;
  /** Optional unit suffix (e.g. "h", "days", "lbs"). */
  unit?: string;
  /** Wrap this cell in `<Theme name="accent">` so its label/value/icon
   * tokens resolve to the accent palette. */
  accent?: boolean;
}

interface Props {
  cells: StatGridCell[];
}

/**
 * Top-of-page stats card: a single bordered Card containing a 2-column
 * grid of cells separated by hairlines. Used by both the Profile identity
 * strip and the Stats per-exercise summary so they share a consistent
 * "summary card" look.
 */
export function StatGrid({ cells }: Props) {
  const rows: StatGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(cells.slice(i, i + 2));
  }

  return (
    <Card elevate size="$4" bordered p="$2" br="$6" bg="$color2">
      <YStack width="100%">
        {rows.map((row, ri) => (
          <Fragment key={ri}>
            <XStack items="stretch" width="100%">
              <CellWrapper cell={row[0]} />
              {row[1] && (
                <>
                  <Separator vertical borderColor="$color6" />
                  <CellWrapper cell={row[1]} />
                </>
              )}
            </XStack>
            {ri < rows.length - 1 && <Separator borderColor="$color6" />}
          </Fragment>
        ))}
      </YStack>
    </Card>
  );
}

function CellWrapper({ cell }: { cell: StatGridCell }) {
  const inner = <CellInner {...cell} />;
  return cell.accent ? <Theme name="accent">{inner}</Theme> : inner;
}

function CellInner({ icon, label, value, unit }: StatGridCell) {
  return (
    <YStack flex={1} flexBasis={0} gap="$2" px="$3" py="$3">
      <XStack gap="$2" items="center">
        {icon}
        <Paragraph size="$2" color="$color11" textTransform="uppercase" letterSpacing={1}>
          {label}
        </Paragraph>
      </XStack>
      <XStack gap="$1.5" items="baseline">
        <Text fontSize="$8" $sm={{ fontSize: "$9" }} fontWeight="700" color="$color12">
          {value}
        </Text>
        {unit && (
          <Text fontSize="$3" color="$color10">
            {unit}
          </Text>
        )}
      </XStack>
    </YStack>
  );
}
