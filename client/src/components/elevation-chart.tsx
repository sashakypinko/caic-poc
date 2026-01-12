import type { ElevationBand } from "@shared/schema";

interface ElevationChartProps {
  data: ElevationBand;
}

export function ElevationChart({ data }: ElevationChartProps) {
  const total = data.aboveTreeline + data.nearTreeline + data.belowTreeline;
  const maxCount = Math.max(data.aboveTreeline, data.nearTreeline, data.belowTreeline, 1);

  const elevationData = [
    { key: "aboveTreeline", label: ">TL", count: data.aboveTreeline, description: "Above Treeline" },
    { key: "nearTreeline", label: "TL", count: data.nearTreeline, description: "At Treeline" },
    { key: "belowTreeline", label: "<TL", count: data.belowTreeline, description: "Below Treeline" },
  ];

  return (
    <div className="relative" data-testid="elevation-mountain-chart">
      <div className="flex items-stretch h-64 gap-2">
        <div className="relative w-32 flex-shrink-0">
          <svg viewBox="0 0 100 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="mountainFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" className="[stop-color:hsl(var(--muted))]" stopOpacity="0.3" />
                <stop offset="50%" className="[stop-color:hsl(var(--muted))]" stopOpacity="0.5" />
                <stop offset="100%" className="[stop-color:hsl(var(--muted))]" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            
            <polygon 
              points="50,10 95,190 5,190" 
              fill="url(#mountainFill)"
              className="stroke-border"
              strokeWidth="1.5"
            />
            
            <line x1="5" y1="60" x2="95" y2="60" className="stroke-border" strokeWidth="1" strokeDasharray="4,3" />
            <line x1="5" y1="130" x2="95" y2="130" className="stroke-border" strokeWidth="1" strokeDasharray="4,3" />
            
            <circle cx="50" cy="35" r="4" className="fill-primary" opacity={data.aboveTreeline > 0 ? 1 : 0.2} />
            <circle cx="50" cy="95" r="4" className="fill-primary" opacity={data.nearTreeline > 0 ? 1 : 0.2} />
            <circle cx="50" cy="160" r="4" className="fill-primary" opacity={data.belowTreeline > 0 ? 1 : 0.2} />
          </svg>
        </div>

        <div className="flex-1 flex flex-col justify-between py-2">
          {elevationData.map((item, idx) => (
            <div key={item.key} className="flex items-center gap-3" data-testid={`elevation-row-${item.key}`}>
              <div className="w-12 text-right">
                <span className="text-sm font-mono font-semibold text-foreground">{item.label}</span>
              </div>
              <div className="flex-1 h-8 bg-muted/30 rounded overflow-hidden relative">
                <div 
                  className="h-full bg-primary/80 rounded transition-all duration-500"
                  style={{ width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)}%` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-xs font-medium text-foreground">
                  {item.count > 0 && item.count}
                </span>
              </div>
              <div className="w-24 text-xs text-muted-foreground hidden sm:block">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {total === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
          <span className="text-muted-foreground text-sm">No avalanche data by elevation</span>
        </div>
      )}

      <div className="text-right mt-2 text-xs text-muted-foreground">
        Total: {total} avalanche{total !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
