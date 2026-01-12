import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ElevationBand } from "@shared/schema";

interface ElevationChartProps {
  data: ElevationBand;
}

const ELEVATION_LABELS: Record<keyof ElevationBand, string> = {
  aboveTreeline: "Above Treeline (ATL)",
  nearTreeline: "Near Treeline (NTL)",
  belowTreeline: "Below Treeline (BTL)",
};

const ELEVATION_COLORS: Record<keyof ElevationBand, string> = {
  aboveTreeline: "hsl(200, 75%, 45%)",
  nearTreeline: "hsl(160, 60%, 45%)",
  belowTreeline: "hsl(120, 50%, 40%)",
};

export function ElevationChart({ data }: ElevationChartProps) {
  const chartData = (Object.entries(data) as [keyof ElevationBand, number][]).map(([key, count]) => ({
    elevation: ELEVATION_LABELS[key],
    shortLabel: key === "aboveTreeline" ? "ATL" : key === "nearTreeline" ? "NTL" : "BTL",
    count,
    fill: ELEVATION_COLORS[key],
  }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No avalanche data by elevation
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          layout="vertical" 
          margin={{ top: 10, right: 10, left: 80, bottom: 0 }}
        >
          <XAxis 
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis 
            type="category"
            dataKey="shortLabel"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            labelFormatter={(label) => chartData.find(d => d.shortLabel === label)?.elevation || label}
            formatter={(value: number) => [value, "Avalanches"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
