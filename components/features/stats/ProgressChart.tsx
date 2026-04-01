import { useState, useMemo, useEffect } from "react";
import { useWindowDimensions, View, LayoutChangeEvent } from "react-native";
import { YStack, XStack, Text, Button, useTheme, Theme } from "tamagui";
import { LineChart } from "react-native-gifted-charts";
import { formatDurationSeconds, formatPace } from "@/lib/utils/formatters";

interface ProgressDataPoint {
  week: string;
  volume: number;
  maxWeight: number;
  maxReps: number | null;
  distance: number | null;
  avgPace: number | null;
  maxDuration: number | null;
  maxResistance: number | null;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  weightUnit?: string | null;
  distanceUnit?: string | null;
}

type MetricType = "volume" | "maxWeight" | "maxReps" | "distance" | "avgPace" | "maxDuration" | "maxResistance";

const METRIC_LABELS: Record<MetricType, string> = {
  volume: "Volume",
  maxWeight: "Max Weight",
  maxReps: "Max Reps",
  distance: "Distance",
  avgPace: "Avg Pace",
  maxDuration: "Max Duration",
  maxResistance: "Max Resistance",
};

function getValue(d: ProgressDataPoint, metric: MetricType): number {
  switch (metric) {
    case "volume": return d.volume;
    case "maxWeight": return d.maxWeight;
    case "maxReps": return d.maxReps ?? 0;
    case "distance": return d.distance ?? 0;
    case "avgPace": return d.avgPace ?? 0;
    case "maxDuration": return d.maxDuration ?? 0;
    case "maxResistance": return d.maxResistance ?? 0;
  }
}

export function ProgressChart({ data, weightUnit, distanceUnit }: ProgressChartProps) {
  const baseTheme = useTheme();
  const gridColor = baseTheme.color5.val;
  const labelColor = baseTheme.color9.val;
  return (
    <Theme name="accent">
      <ProgressChartContent
        data={data}
        gridColor={gridColor}
        labelColor={labelColor}
        weightUnit={weightUnit}
        distanceUnit={distanceUnit}
      />
    </Theme>
  );
}

function ProgressChartContent({
  data,
  gridColor,
  labelColor,
  weightUnit,
  distanceUnit,
}: ProgressChartProps & { gridColor: string; labelColor: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(screenWidth * 0.9);
  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);
  const theme = useTheme();

  const lineColor = theme.color10.val;
  const stripColor = theme.color7.val;
  const tooltipBg = theme.color3.val;
  const tooltipValueColor = theme.color12.val;
  const tooltipDateColor = theme.color10.val;

  const wUnit = weightUnit ?? 'lbs';
  const dUnit = distanceUnit ?? 'miles';

  const availableMetrics = useMemo<MetricType[]>(() => {
    const metrics: MetricType[] = [];
    if (data.some((d) => d.maxWeight > 0)) metrics.push("maxWeight");
    if (data.some((d) => d.volume > 0)) metrics.push("volume");
    if (data.some((d) => (d.maxReps ?? 0) > 0)) metrics.push("maxReps");
    if (data.some((d) => (d.distance ?? 0) > 0)) metrics.push("distance");
    if (data.some((d) => (d.avgPace ?? 0) > 0)) metrics.push("avgPace");
    if (data.some((d) => (d.maxDuration ?? 0) > 0)) metrics.push("maxDuration");
    if (data.some((d) => (d.maxResistance ?? 0) > 0)) metrics.push("maxResistance");
    return metrics;
  }, [data]);

  const [metric, setMetric] = useState<MetricType>(() => availableMetrics[0] ?? "maxWeight");

  useEffect(() => {
    if (!availableMetrics.includes(metric)) {
      setMetric(availableMetrics[0] ?? "maxWeight");
    }
  }, [availableMetrics, metric]);

  if (data.length === 0 || availableMetrics.length === 0) {
    return (
      <YStack p="$4" items="center" justify="center" height={200}>
        <Text opacity={0.5}>No progress data available</Text>
      </YStack>
    );
  }

  const formatValue = (value: number, m: MetricType): string => {
    switch (m) {
      case "volume":
        if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, "") + `K ${wUnit}`;
        return value.toFixed(0) + ` ${wUnit}`;
      case "maxWeight":
        return value.toFixed(0) + ` ${wUnit}`;
      case "maxReps":
        return value.toFixed(0) + " reps";
      case "distance":
        return value.toFixed(1) + ` ${dUnit}`;
      case "avgPace":
        return formatPace(value, distanceUnit ?? null);
      case "maxDuration": {
        const totalSecs = Math.round(value);
        const m2 = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        return s > 0 ? `${m2}m ${s}s` : `${m2}m`;
      }
      case "maxResistance":
        return "Level " + value.toFixed(0);
    }
  };

  const formatYLabel = (val: string): string => {
    const num = parseFloat(val);
    if (metric === "avgPace") {
      const mins = Math.floor(num);
      const secs = Math.round((num - mins) * 60);
      return `${mins}:${String(secs).padStart(2, "0")}`;
    }
    if (metric === "maxDuration") {
      const totalSecs = Math.round(num);
      const m2 = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      return s > 0 ? `${m2}:${String(s).padStart(2, "0")}` : `${m2}m`;
    }
    if (metric === "maxResistance") {
      return String(Math.round(num));
    }
    if (num === 0) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(num));
  };

  const DOT_RADIUS = 4;
  const WRAPPER_PADDING = DOT_RADIUS + 2;
  const Y_LABEL_WIDTH = 40;
  const outerWidth = containerWidth;
  const chartWidth = outerWidth - WRAPPER_PADDING * 2 - Y_LABEL_WIDTH;
  const chartHeight = 180;
  const spacing = data.length > 1 ? chartWidth / (data.length - 1) : 60;

  const POINTER_SHIFT_FIRST_X = -(DOT_RADIUS + 1);
  const chartData = data.map((d, i) => ({
    value: getValue(d, metric),
    week: d.week,
    ...(i === 0 ? { pointerShiftX: POINTER_SHIFT_FIRST_X } : {}),
  }));

  const values = chartData.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values, 1);
  const noOfSections = 4;
  const roughStep = rawMax / noOfSections;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const niceStep = Math.ceil(roughStep / magnitude) * magnitude;
  const maxValue = niceStep * noOfSections;
  const minValue = Math.max(0, Math.floor(rawMin / niceStep) * niceStep);

  const MAX_X_LABELS = Math.min(data.length, 4);
  const xLabelIndices =
    MAX_X_LABELS <= 1
      ? [0]
      : Array.from({ length: MAX_X_LABELS }, (_, k) =>
          Math.round((k * (data.length - 1)) / (MAX_X_LABELS - 1))
        ).filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <YStack gap="$3" width="100%" onLayout={handleLayout}>
      {availableMetrics.length > 0 && (
        <XStack gap="$2" justify="center" flexWrap="wrap">
          {availableMetrics.map((m) => (
            <Button
              key={m}
              size="$2"
              $sm={{ size: "$5" }}
              chromeless={metric !== m}
              bg={metric === m ? "$color3" : "$gray3"}
              onPress={() => setMetric(m)}
              borderRadius="$3"
              px="$3"
            >
              <Text
                fontSize="$2"
                $sm={{ fontSize: "$4" }}
                fontWeight={metric === m ? "600" : "400"}
                color={metric === m ? "$color11" : "$gray11"}
              >
                {METRIC_LABELS[m]}
              </Text>
            </Button>
          ))}
        </XStack>
      )}

      <View style={{ paddingHorizontal: WRAPPER_PADDING }}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          spacing={spacing}
          initialSpacing={0}
          endSpacing={data.length > 1 ? 10 - spacing : 0}
          rulesLength={chartWidth}
          xAxisLength={chartWidth}
          disableScroll
          color={lineColor}
          thickness={2}
          curved
          hideDataPoints={false}
          dataPointsColor={lineColor}
          dataPointsRadius={DOT_RADIUS}
          noOfSections={noOfSections}
          maxValue={maxValue - minValue}
          yAxisOffset={minValue}
          rulesType="dashed"
          rulesColor={gridColor}
          yAxisColor="transparent"
          xAxisColor={gridColor}
          hideXAxisText
          xAxisLabelsHeight={0}
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
            pointerLabelWidth: 100,
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

      <View style={{ height: 16, position: "relative", marginTop: -18 }}>
        {xLabelIndices.map((i) => {
          const x = WRAPPER_PADDING + Y_LABEL_WIDTH + i * spacing;
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const date = new Date(data[i].week).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <Text
              key={i}
              style={{
                position: "absolute",
                ...(isLast
                  ? { right: WRAPPER_PADDING }
                  : { left: isFirst ? x : x - 18 }),
                ...(!isFirst && !isLast ? { width: 36 } : {}),
                fontSize: 10,
                color: labelColor,
                textAlign: isFirst ? "left" : isLast ? "right" : "center",
              }}
            >
              {date}
            </Text>
          );
        })}
      </View>
    </YStack>
  );
}
