import { useState } from "react";
import { useWindowDimensions, View, LayoutChangeEvent } from "react-native";
import { YStack, Text, useTheme, Theme } from "tamagui";
import { LineChart } from "react-native-gifted-charts";

export interface TrendPoint {
  /** ISO date (week start, day, etc.) used both for X-label and tooltip secondary. */
  x: string;
  value: number;
  /** Interpolated gap-fill point — hides the data dot and skips the tooltip body. */
  empty?: boolean;
}

interface Props {
  series: TrendPoint[];
  /** Y-axis label formatter. Receives raw numeric string from the chart lib. */
  formatY: (raw: string) => string;
  /** Tooltip primary line (the value). */
  formatTooltipValue: (value: number) => string;
  /** Tooltip secondary line (the date or date range). */
  formatTooltipDate: (x: string) => string;
  /** X-axis footer label formatter. Receives the same x string. */
  formatXLabel: (x: string) => string;
  /** Force integer Y-axis steps (e.g. for workout counts). */
  integerYAxis?: boolean;
  /** Message when series is empty. */
  emptyMessage?: string;
  /** Message when series has fewer than 2 points. */
  insufficientMessage?: string;
}

export function BaseTrendChart(props: Props) {
  const baseTheme = useTheme();
  const gridColor = baseTheme.color6.val;
  const labelColor = baseTheme.color11.val;
  return (
    <Theme name="accent">
      <ChartBody {...props} gridColor={gridColor} labelColor={labelColor} />
    </Theme>
  );
}

function ChartBody({
  series,
  formatY,
  formatTooltipValue,
  formatTooltipDate,
  formatXLabel,
  integerYAxis,
  emptyMessage = "No data",
  insufficientMessage = "Need 2+ points to chart",
  gridColor,
  labelColor,
}: Props & { gridColor: string; labelColor: string }) {
  const accentTheme = useTheme();
  const lineColor = accentTheme.color10.val;
  const tooltipBg = accentTheme.color3.val;
  const tooltipValueColor = accentTheme.color12.val;
  const tooltipDateColor = accentTheme.color10.val;

  const { width: screenWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(screenWidth * 0.9);
  const handleLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  if (series.length === 0) {
    return (
      <YStack height={200} items="center" justify="center">
        <Text color="$color10">{emptyMessage}</Text>
      </YStack>
    );
  }

  if (series.length < 2) {
    return (
      <YStack height={200} items="center" justify="center">
        <Text color="$color10">{insufficientMessage}</Text>
      </YStack>
    );
  }

  const values = series.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values, 1);
  const noOfSections = 4;
  const roughStep = rawMax / noOfSections;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  let niceStep = Math.ceil(roughStep / magnitude) * magnitude;
  if (integerYAxis) niceStep = Math.max(Math.ceil(niceStep), 1);
  const maxValue = niceStep * noOfSections;
  const minValue = Math.max(0, Math.floor(rawMin / niceStep) * niceStep);

  const DOT_RADIUS = 4;
  const ACTIVE_DOT_RADIUS = DOT_RADIUS + DOT_RADIUS / 2;
  const DENSE_POINT_THRESHOLD = 12;
  const showDots = series.length <= DENSE_POINT_THRESHOLD;
  const WRAPPER_PADDING = DOT_RADIUS + 2;
  const Y_LABEL_WIDTH = 44;
  const chartWidth = containerWidth - WRAPPER_PADDING * 2 - Y_LABEL_WIDTH;
  const chartHeight = 180;
  const spacing = series.length > 1 ? chartWidth / (series.length - 1) : 60;

  const POINTER_SHIFT_FIRST_X = -(DOT_RADIUS + 1);
  const chartData = series.map((d, i) => ({
    value: d.value,
    x: d.x,
    empty: d.empty,
    ...(d.empty ? { hideDataPoint: true } : {}),
    ...(i === 0 ? { pointerShiftX: POINTER_SHIFT_FIRST_X } : {}),
  }));

  const MAX_X_LABELS = Math.min(series.length, 4);
  const xLabelIndices =
    MAX_X_LABELS <= 1
      ? [0]
      : Array.from({ length: MAX_X_LABELS }, (_, k) =>
          Math.round((k * (series.length - 1)) / (MAX_X_LABELS - 1))
        ).filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <YStack gap="$3" width="100%" onLayout={handleLayout}>
      <View style={{ paddingHorizontal: WRAPPER_PADDING, overflow: "hidden" }}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          spacing={spacing}
          initialSpacing={0}
          endSpacing={series.length > 1 ? 10 - spacing : 0}
          rulesLength={chartWidth}
          xAxisLength={chartWidth}
          disableScroll
          color={lineColor}
          thickness={2}
          curved
          curvature={0.05}
          hideDataPoints={!showDots}
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
          formatYLabel={formatY}
          pointerConfig={{
            pointerStripHeight: chartHeight,
            pointerStripColor: "transparent",
            pointerStripWidth: 1,
            pointerColor: lineColor,
            radius: DOT_RADIUS,
            pointerLabelWidth: 120,
            pointerLabelHeight: 48,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerComponent: (item: { pointerShiftX?: number; empty?: boolean }) => {
              if (item?.empty) return <View />;
              return (
                <View
                  style={{
                    height: ACTIVE_DOT_RADIUS * 2,
                    width: ACTIVE_DOT_RADIUS * 2,
                    backgroundColor: lineColor,
                    borderRadius: ACTIVE_DOT_RADIUS,
                    marginTop: DOT_RADIUS / 4 - (ACTIVE_DOT_RADIUS - DOT_RADIUS),
                    marginLeft: (item?.pointerShiftX ?? 0) - (ACTIVE_DOT_RADIUS - DOT_RADIUS),
                  }}
                />
              );
            },
            pointerLabelComponent: (items: Array<{ value: number; x?: string; empty?: boolean }>) => {
              const item = items[0];
              if (item?.empty) return <View />;
              const dateLabel = item?.x ? formatTooltipDate(item.x) : "";
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
                    {formatTooltipValue(item?.value ?? 0)}
                  </Text>
                  <Text style={{ color: tooltipDateColor, fontSize: 10 }}>{dateLabel}</Text>
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
          const isLast = i === series.length - 1;
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
              {formatXLabel(series[i].x)}
            </Text>
          );
        })}
      </View>
    </YStack>
  );
}
