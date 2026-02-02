import { useState } from "react";
import { YStack, XStack, Text, Button } from "tamagui";
import Svg, { Path, Line, Circle, G } from "react-native-svg";
import { useWindowDimensions } from "react-native";

interface ProgressDataPoint {
  week: string;
  volume: number;
  maxWeight: number;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
}

type MetricType = "volume" | "maxWeight";

function formatValue(value: number, metric: MetricType): string {
  if (metric === "volume") {
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + "K";
    }
    return value.toFixed(0);
  }
  return value.toFixed(0);
}

export function ProgressChart({ data }: ProgressChartProps) {
  const [metric, setMetric] = useState<MetricType>("volume");
  const { width: screenWidth } = useWindowDimensions();

  if (data.length === 0) {
    return (
      <YStack p="$4" items="center" justify="center" height={200}>
        <Text opacity={0.5}>No progress data available</Text>
      </YStack>
    );
  }

  const chartWidth = Math.min(screenWidth - 64, 400);
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const values = data.map((d) =>
    metric === "volume" ? d.volume : d.maxWeight,
  );
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue || 1;

  const xScale = (index: number) =>
    padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
  const yScale = (value: number) =>
    padding.top + innerHeight - ((value - minValue) / valueRange) * innerHeight;

  const pathData = data
    .map((d, i) => {
      const x = xScale(i);
      const y = yScale(metric === "volume" ? d.volume : d.maxWeight);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const gridLines = 4;
  const yGridValues = Array.from(
    { length: gridLines + 1 },
    (_, i) => minValue + (valueRange / gridLines) * i,
  );

  return (
    <YStack gap="$3">
      <XStack gap="$2" justify="center">
        <Button
          size="$2"
          chromeless={metric !== "volume"}
          bg={metric === "volume" ? "$blue4" : "$gray3"}
          onPress={() => setMetric("volume")}
          borderRadius="$3"
          px="$3"
        >
          <Text
            fontSize="$2"
            fontWeight={metric === "volume" ? "600" : "400"}
            color={metric === "volume" ? "$blue11" : "$gray11"}
          >
            Volume
          </Text>
        </Button>
        <Button
          size="$2"
          chromeless={metric !== "maxWeight"}
          bg={metric === "maxWeight" ? "$blue4" : "$gray3"}
          onPress={() => setMetric("maxWeight")}
          borderRadius="$3"
          px="$3"
        >
          <Text
            fontSize="$2"
            fontWeight={metric === "maxWeight" ? "600" : "400"}
            color={metric === "maxWeight" ? "$blue11" : "$gray11"}
          >
            Max Weight
          </Text>
        </Button>
      </XStack>

      <YStack items="center">
        <Svg width={chartWidth} height={chartHeight}>
          <G>
            {yGridValues.map((value, i) => (
              <G key={i}>
                <Line
                  x1={padding.left}
                  y1={yScale(value)}
                  x2={chartWidth - padding.right}
                  y2={yScale(value)}
                  stroke="#e0e0e0"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              </G>
            ))}
          </G>

          <Path d={pathData} stroke="#3b82f6" strokeWidth={2} fill="none" />

          {data.map((d, i) => (
            <Circle
              key={i}
              cx={xScale(i)}
              cy={yScale(metric === "volume" ? d.volume : d.maxWeight)}
              r={4}
              fill="#3b82f6"
            />
          ))}
        </Svg>
      </YStack>

      <XStack justify="space-between" px="$2">
        <Text fontSize="$1" color="$gray10">
          {data[0]?.week
            ? new Date(data[0].week).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </Text>
        <Text fontSize="$2" color="$gray11">
          {formatValue(maxValue, metric)} {metric === "volume" ? "lbs" : "lbs"}{" "}
          max
        </Text>
        <Text fontSize="$1" color="$gray10">
          {data[data.length - 1]?.week
            ? new Date(data[data.length - 1].week).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </Text>
      </XStack>
    </YStack>
  );
}
