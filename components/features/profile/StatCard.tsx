import { Card, H4, Paragraph, YStack } from "tamagui";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: ReactNode;
}

/**
 * Card component for displaying a single statistic
 */
export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <Card elevate size="$4" bordered p="$4" flex={1} minWidth={150}>
      <YStack gap="$2">
        {icon && <YStack>{icon}</YStack>}
        <Paragraph size="$2" $sm={{ size: "$4" }} color="$color11">
          {title}
        </Paragraph>
        <H4 size="$8" fontWeight="bold">
          {value}
        </H4>
        {trend && <YStack>{trend}</YStack>}
        {subtitle && (
          <Paragraph size="$1" $sm={{ size: "$3" }} color="$color9">
            {subtitle}
          </Paragraph>
        )}
      </YStack>
    </Card>
  );
}
