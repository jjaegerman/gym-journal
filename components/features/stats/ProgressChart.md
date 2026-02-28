# ProgressChart — Implementation Spec

## Location
`components/features/stats/ProgressChart.tsx`

## Consumers
- `components/features/stats/StatsDetailView.tsx` — imports and renders `ProgressChart`

---

## Component Interface

```ts
interface ProgressDataPoint {
  week: string;    // ISO date string, e.g. "2024-01-08"
  volume: number;  // total volume for that week (lbs)
  maxWeight: number; // heaviest weight lifted that week (lbs)
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
}
```

---

## Requirements

### Functional
- Render a line chart of weekly progress for the selected exercise
- Toggle between **Volume** (total lbs moved) and **Max Weight** (heaviest lift)
- Drag/press anywhere on the chart to show a tooltip with the exact value at that point
- Display the date range (first week → last week) below the chart
- When `data` is empty, show a "No progress data available" placeholder

### Visual
- Chart width: `min(screenWidth - 64, 400)`, centered via `alignSelf="center"`
- Chart height: `180`
- Line color: `#3b82f6` (blue)
- Line thickness: `2`, curved
- Data point dots: radius `4`, same blue
- Grid lines: dashed, color `#e0e0e0`
- X-axis line: `#e0e0e0`; Y-axis: transparent / no labels / no thickness
- Tooltip bubble: dark navy `#1e3a5f`, white text, rounded corners

### Metric toggle buttons
- Both buttons always visible side by side, centered
- Active state: `$blue4` background, `$blue11` text, `600` weight
- Inactive state: `$gray3` background, `$gray11` text, `400` weight

---

## Library
`react-native-gifted-charts` (`LineChart`) — already installed.

### Known internal quirks (must account for all of these)

#### 1. Pointer horizontal offset from `initialSpacing`
The ScrollView content gets `paddingLeft: initialSpacing`. The SVG wrapper uses `left: 0` (ignores padding) but the pointer overlay inherits `paddingLeft`, shifting the pointer right by `initialSpacing` px.

**Fix:** always pass `initialSpacing={0}`. Wrap `<LineChart>` in a `<View style={{ paddingHorizontal: DOT_RADIUS + 2 }}>` so edge dots aren't clipped.

#### 2. Leftmost-point pointer clamped right
When `initialSpacing=0`, `getX(0) = 0`, so `z = 0 - DOT_RADIUS - 1 = -5 < 0`, clamped to `0.1`. The pointer circle ends up ~5px to the right of the first dot.

The intended fix `pointerShiftX: -(DOT_RADIUS + 1)` on the first data item is silently broken: `Pointer.js` reads `pointerShiftX` off the number `pointerX` (`pointerX.pointerShiftX`) instead of off `pointerItemLocal` — always `undefined`.

**Fix:** use `pointerComponent` in `pointerConfig`. It receives the data item directly, so read `item.pointerShiftX` and apply it as `marginLeft`:
```tsx
pointerComponent: (item: { pointerShiftX?: number }) => (
  <View style={{ ..., marginLeft: item?.pointerShiftX ?? 0 }} />
)
```
Keep `pointerShiftX: -(DOT_RADIUS + 1)` on the first data item — `pointerComponent` will pick it up correctly.

#### 3. Vertical pointer offset
`Pointer.js` uses `top: pointerYLocal - 4` (hardcoded) and `pointerRadius` cancels in the Y formula, so the net baked-in offset is `+6 + xAxisThickness = +7` (default `xAxisThickness=1`). The pointer center naturally lands on the data dot when `pointerShiftY = 0` — no per-item shift needed. Setting any non-zero value moves the dot off the data point.

**Fix:** do **not** set `pointerShiftY` on data items (omit it entirely).

#### 4. Y-axis layout offset
Default `yAxisLabelWidth=35` and `yAxisThickness=1` shift chart content inward.

**Fix:** `yAxisLabelWidth={0}`, `yAxisThickness={0}`, `hideYAxisText`.

#### 5. Dynamic spacing
With `initialSpacing=0` and `endSpacing=0`, the full `chartWidth` covers `n-1` intervals.

**Fix:** `spacing = data.length > 1 ? Math.max(16, chartWidth / (data.length - 1)) : 60`

#### 6. X-axis label clipping
gifted-charts clips label text aggressively.

**Fix:** `hideXAxisText` on the chart; render a footer `XStack` manually with the first and last week dates.

---

## Layout constants

```ts
const DOT_RADIUS = 4;
const WRAPPER_PADDING = DOT_RADIUS + 2;          // prevents dot clipping at edges
const outerWidth = Math.min(screenWidth - 64, 400);
const chartWidth = outerWidth - WRAPPER_PADDING * 2;
const chartHeight = 180;
const spacing = data.length > 1
  ? Math.max(16, chartWidth / (data.length - 1))
  : 60;
const POINTER_SHIFT_FIRST_X = -(DOT_RADIUS + 1); // = -5
```

---

## Data mapping

```ts
const chartData = data.map((d, i) => ({
  value: metric === "volume" ? d.volume : d.maxWeight,
  ...(i === 0 ? { pointerShiftX: POINTER_SHIFT_FIRST_X } : {}),
}));

const maxValue = Math.max(...chartData.map(d => d.value), 1);
```

---

## pointerConfig

```ts
pointerConfig={{
  pointerStripHeight: chartHeight,
  pointerStripColor: "#93c5fd",
  pointerStripWidth: 1,
  pointerColor: "#3b82f6",
  radius: DOT_RADIUS,
  pointerLabelWidth: 80,
  pointerLabelHeight: 36,
  activatePointersOnLongPress: false,
  autoAdjustPointerLabelPosition: true,
  pointerLabelComponent: (items) => (
    <View style={{
      backgroundColor: "#1e3a5f", borderRadius: 6,
      paddingHorizontal: 8, paddingVertical: 4,
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
        {formatValue(items[0]?.value ?? 0, metric)}
      </Text>
    </View>
  ),
}}
```

---

## formatValue helper

```ts
function formatValue(value: number, metric: MetricType): string {
  if (metric === "volume") {
    return value >= 1000
      ? (value / 1000).toFixed(0) + "K lbs"
      : value.toFixed(0) + " lbs";
  }
  return value.toFixed(0) + " lbs";
}
```

---

## Footer (date range)

```tsx
<XStack justify="space-between" px="$2">
  <Text fontSize="$1" color="$gray10">
    {new Date(data[0].week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
  </Text>
  <Text fontSize="$1" color="$gray10">
    {new Date(data[data.length - 1].week).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
  </Text>
</XStack>
```

---

## Verification checklist
1. `yarn ios`
2. Stats tab → pick exercise with multiple weeks of data
3. Press and drag — tooltip follows touch exactly on dots
4. Toggle Volume ↔ Max Weight — chart re-renders correctly
5. Drag to leftmost point — pointer sits directly on first dot
6. Drag to rightmost point — same
