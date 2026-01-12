import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { AspectCounts } from "@shared/schema";

interface AspectChartProps {
  data: AspectCounts;
}

const ASPECT_COLORS: Record<string, string> = {
  N: "hsl(200, 70%, 50%)",
  NE: "hsl(180, 60%, 45%)",
  E: "hsl(160, 60%, 45%)",
  SE: "hsl(45, 70%, 50%)",
  S: "hsl(25, 75%, 50%)",
  SW: "hsl(15, 80%, 50%)",
  W: "hsl(280, 60%, 55%)",
  NW: "hsl(220, 65%, 55%)",
};

export function AspectChart({ data }: AspectChartProps) {
  const chartData = Object.entries(data).map(([aspect, count]) => ({
    aspect,
    count,
    fill: ASPECT_COLORS[aspect],
  }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No avalanche data by aspect
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis 
            dataKey="aspect" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [value, "Avalanches"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
