import { XStack, Paragraph } from "tamagui";
import { PrTimelineCard } from "./PrTimelineCard";
import type { PrTimelineEntry } from "@/lib/api/supabase/profileTrends";

interface Props {
  prs: PrTimelineEntry[];
  loading: boolean;
  hasAnyPrEver?: boolean;
}

export function PrTimeline({ prs, loading }: Props) {
  if (!loading && prs.length === 0) {
    return (
      <Paragraph size="$3" color="$color10">
        No new PRs in this range. Keep going.
      </Paragraph>
    );
  }
  return (
    <XStack gap="$3">
      {prs.map((pr) => (
        <PrTimelineCard key={pr.set_id} pr={pr} />
      ))}
    </XStack>
  );
}
