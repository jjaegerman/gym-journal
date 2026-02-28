import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { YStack, XStack, Text, Button, useTheme, Theme } from "tamagui";
import { LineChart } from "react-native-gifted-charts";

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
      return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K lbs";
    }
    return value.toFixed(0) + " lbs";
  }
  return value.toFixed(0) + " lbs";
}

export function ProgressChart({ data }: ProgressChartProps) {
  // Resolve base-theme colors — gray/neutral tokens aren't in the accent theme's extra
  const baseTheme = useTheme();
  const gridColor = baseTheme.color5.val;
  const labelColor = baseTheme.color9.val;
  return (
    <Theme name="accent">
      <ProgressChartContent data={data} gridColor={gridColor} labelColor={labelColor} />
    </Theme>
  );
}

function ProgressChartContent({
  data,
  gridColor,
  labelColor,
}: ProgressChartProps & { gridColor: string; labelColor: string }) {
  const [metric, setMetric] = useState<MetricType>("volume");
  const { width: screenWidth } = useWindowDimensions();
  // Inside <Theme name="accent">, useTheme() resolves accent palette tokens
  const theme = useTheme();

  // Resolved colors for gifted-charts (requires plain strings, not tokens)
  const lineColor = theme.color10.val;
  const stripColor = theme.color7.val;
  const tooltipBg = theme.color3.val;
  const tooltipValueColor = theme.color12.val;
  const tooltipDateColor = theme.color10.val;

  if (data.length === 0) {
    return (
      <YStack p="$4" items="center" justify="center" height={200}>
        <Text opacity={0.5}>No progress data available</Text>
      </YStack>
    );
  }

  // The wrapper adds visual padding so data point dots aren't clipped at edges.
  // initialSpacing MUST be 0: gifted-charts puts paddingLeft=initialSpacing on the
  // ScrollView content, but the SVG wrapper uses explicit left:0 (ignoring padding)
  // while the pointer overlay has no left and inherits paddingLeft — causing a
  // persistent right-shift equal to initialSpacing. Setting it to 0 removes this.
  const DOT_RADIUS = 4;
  const WRAPPER_PADDING = DOT_RADIUS + 2;
  const Y_LABEL_WIDTH = 40;
  const outerWidth = Math.min(screenWidth - 64, 400);
  const chartWidth = outerWidth - WRAPPER_PADDING * 2 - Y_LABEL_WIDTH;
  const chartHeight = 180;
  const spacing = data.length > 1 ? Math.max(16, chartWidth / (data.length - 1)) : 60;

  // First point gets pointerShiftX because gifted-charts clamps pointerX to 0.1
  // when initialSpacing=0 (getX(0)=0 → z=-radius-1 → clamped), shifting the
  // pointer right. pointerShiftX in Pointer.js is broken (reads from the number
  // pointerX, not pointerItemLocal), so it's applied manually via pointerComponent.
  const POINTER_SHIFT_FIRST_X = -(DOT_RADIUS + 1);
  const chartData = data.map((d, i) => ({
    value: metric === "volume" ? d.volume : d.maxWeight,
    week: d.week,
    ...(i === 0 ? { pointerShiftX: POINTER_SHIFT_FIRST_X } : {}),
  }));

  const values = chartData.map((d) => d.value);
  // Round up to a "nice" ceiling so section lines fall on round numbers
  const rawMax = Math.max(...values, 1);
  const noOfSections = 4;
  const roughStep = rawMax / noOfSections;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const maxValue = Math.ceil(roughStep / magnitude) * magnitude * noOfSections;

  const formatYLabel = (val: string) => {
    const num = parseFloat(val);
    if (num === 0) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(num));
  };

  return (
    <YStack gap="$3" width={outerWidth} alignSelf="center">
      <XStack gap="$2" justify="center">
        <Button
          size="$2"
          chromeless={metric !== "volume"}
          bg={metric === "volume" ? "$color3" : "$gray3"}
          onPress={() => setMetric("volume")}
          borderRadius="$3"
          px="$3"
        >
          <Text
            fontSize="$2"
            fontWeight={metric === "volume" ? "600" : "400"}
            color={metric === "volume" ? "$color11" : "$gray11"}
          >
            Volume
          </Text>
        </Button>
        <Button
          size="$2"
          chromeless={metric !== "maxWeight"}
          bg={metric === "maxWeight" ? "$color3" : "$gray3"}
          onPress={() => setMetric("maxWeight")}
          borderRadius="$3"
          px="$3"
        >
          <Text
            fontSize="$2"
            fontWeight={metric === "maxWeight" ? "600" : "400"}
            color={metric === "maxWeight" ? "$color11" : "$gray11"}
          >
            Max Weight
          </Text>
        </Button>
      </XStack>

      <View style={{ paddingHorizontal: WRAPPER_PADDING }}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          spacing={spacing}
          initialSpacing={0}
          endSpacing={0}
          color={lineColor}
          thickness={2}
          curved
          hideDataPoints={false}
          dataPointsColor={lineColor}
          dataPointsRadius={DOT_RADIUS}
          noOfSections={noOfSections}
          maxValue={maxValue}
          rulesType="dashed"
          rulesColor={gridColor}
          yAxisColor="transparent"
          xAxisColor={gridColor}
          hideXAxisText
          yAxisLabelWidth={Y_LABEL_WIDTH}
          yAxisThickness={0}
          yAxisTextStyle={{ color: labelColor, fontSize: 10 }}
          formatYLabel={formatYLabel}
          pointerConfig={{
            pointerStripHeight: chartHeight,
            pointerStripColor: stripColor,
            pointerStripWidth: 1,
            pointerColor: lineColor,
            radius: DOT_RADIUS,
            pointerLabelWidth: 80,
            pointerLabelHeight: 48,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerComponent: (item: { pointerShiftX?: number }) => (
              <View
                style={{
                  height: DOT_RADIUS * 2,
                  width: DOT_RADIUS * 2,
                  backgroundColor: lineColor,
                  borderRadius: DOT_RADIUS,
                  marginLeft: item?.pointerShiftX ?? 0,
                }}
              />
            ),
            pointerLabelComponent: (items: Array<{ value: number; week?: string }>) => {
              const item = items[0];
              const date = item?.week
                ? new Date(item.week).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "";
              return (
                <View
                  style={{
                    backgroundColor: tooltipBg,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                  }}
                >
                  <Text style={{ color: tooltipValueColor, fontSize: 12, fontWeight: "600" }}>
                    {formatValue(item?.value ?? 0, metric)}
                  </Text>
                  <Text style={{ color: tooltipDateColor, fontSize: 10 }}>{date}</Text>
                </View>
              );
            },
          }}
        />
      </View>

      <XStack justify="space-between" pl={WRAPPER_PADDING + Y_LABEL_WIDTH} pr={WRAPPER_PADDING}>
        <Text fontSize="$1" color="$gray10">
          {new Date(data[0].week).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </Text>
        <Text fontSize="$1" color="$gray10">
          {new Date(data[data.length - 1].week).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </XStack>
    </YStack>
  );
}
