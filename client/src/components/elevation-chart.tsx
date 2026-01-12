import type { ElevationBand } from "@shared/schema";

interface ElevationChartProps {
  data: ElevationBand;
}

const ELEVATION_CONFIG = [
  { key: "aboveTreeline" as const, label: ">TL", fullLabel: "Above Treeline", color: "hsl(210, 70%, 50%)" },
  { key: "nearTreeline" as const, label: "TL", fullLabel: "At Treeline", color: "hsl(170, 60%, 45%)" },
  { key: "belowTreeline" as const, label: "<TL", fullLabel: "Below Treeline", color: "hsl(140, 50%, 40%)" },
];

export function ElevationChart({ data }: ElevationChartProps) {
  const total = data.aboveTreeline + data.nearTreeline + data.belowTreeline;
  const maxCount = Math.max(data.aboveTreeline, data.nearTreeline, data.belowTreeline, 1);

  return (
    <div className="relative h-80" data-testid="elevation-mountain-chart">
      <svg viewBox="0 0 400 320" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(210, 80%, 85%)" />
            <stop offset="100%" stopColor="hsl(200, 70%, 95%)" />
          </linearGradient>
          <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(220, 15%, 65%)" />
            <stop offset="40%" stopColor="hsl(220, 12%, 55%)" />
            <stop offset="100%" stopColor="hsl(140, 25%, 35%)" />
          </linearGradient>
          <linearGradient id="snowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(0, 0%, 100%)" />
            <stop offset="100%" stopColor="hsl(210, 20%, 92%)" />
          </linearGradient>
          <pattern id="treePattern" patternUnits="userSpaceOnUse" width="12" height="16">
            <polygon points="6,0 12,12 0,12" fill="hsl(140, 40%, 30%)" />
            <rect x="4.5" y="12" width="3" height="4" fill="hsl(30, 40%, 35%)" />
          </pattern>
        </defs>

        <rect x="0" y="0" width="400" height="320" fill="url(#skyGradient)" />

        <polygon 
          points="200,20 380,280 20,280" 
          fill="url(#mountainGradient)"
          stroke="hsl(220, 15%, 50%)"
          strokeWidth="1"
        />

        <polygon 
          points="200,20 280,100 120,100" 
          fill="url(#snowGradient)"
          opacity="0.9"
        />

        <line x1="20" y1="100" x2="380" y2="100" stroke="hsl(0, 0%, 50%)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
        <line x1="20" y1="190" x2="380" y2="190" stroke="hsl(0, 0%, 50%)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

        <g transform="translate(280, 55)">
          <rect 
            x="0" 
            y="0" 
            width={Math.max((data.aboveTreeline / maxCount) * 80, data.aboveTreeline > 0 ? 8 : 0)} 
            height="30" 
            rx="4"
            fill={ELEVATION_CONFIG[0].color}
            opacity="0.9"
          />
          <text x="-8" y="20" textAnchor="end" className="text-xs font-medium" fill="hsl(var(--foreground))">
            {">TL"}
          </text>
          <text 
            x={Math.max((data.aboveTreeline / maxCount) * 80, data.aboveTreeline > 0 ? 8 : 0) + 8} 
            y="20" 
            textAnchor="start" 
            className="text-sm font-semibold" 
            fill="hsl(var(--foreground))"
          >
            {data.aboveTreeline}
          </text>
        </g>

        <g transform="translate(280, 145)">
          <rect 
            x="0" 
            y="0" 
            width={Math.max((data.nearTreeline / maxCount) * 80, data.nearTreeline > 0 ? 8 : 0)} 
            height="30" 
            rx="4"
            fill={ELEVATION_CONFIG[1].color}
            opacity="0.9"
          />
          <text x="-8" y="20" textAnchor="end" className="text-xs font-medium" fill="hsl(var(--foreground))">
            TL
          </text>
          <text 
            x={Math.max((data.nearTreeline / maxCount) * 80, data.nearTreeline > 0 ? 8 : 0) + 8} 
            y="20" 
            textAnchor="start" 
            className="text-sm font-semibold" 
            fill="hsl(var(--foreground))"
          >
            {data.nearTreeline}
          </text>
        </g>

        <g transform="translate(280, 235)">
          <rect 
            x="0" 
            y="0" 
            width={Math.max((data.belowTreeline / maxCount) * 80, data.belowTreeline > 0 ? 8 : 0)} 
            height="30" 
            rx="4"
            fill={ELEVATION_CONFIG[2].color}
            opacity="0.9"
          />
          <text x="-8" y="20" textAnchor="end" className="text-xs font-medium" fill="hsl(var(--foreground))">
            {"<TL"}
          </text>
          <text 
            x={Math.max((data.belowTreeline / maxCount) * 80, data.belowTreeline > 0 ? 8 : 0) + 8} 
            y="20" 
            textAnchor="start" 
            className="text-sm font-semibold" 
            fill="hsl(var(--foreground))"
          >
            {data.belowTreeline}
          </text>
        </g>

        <rect x="110" y="175" width="80" height="30" fill="url(#treePattern)" opacity="0.7" />

        <text x="15" y="70" className="text-[10px]" fill="hsl(var(--muted-foreground))">Alpine</text>
        <text x="15" y="145" className="text-[10px]" fill="hsl(var(--muted-foreground))">Treeline</text>
        <text x="15" y="220" className="text-[10px]" fill="hsl(var(--muted-foreground))">Below TL</text>
      </svg>

      {total === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
          <span className="text-muted-foreground text-sm">No avalanche data by elevation</span>
        </div>
      )}

      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        Total: {total} avalanche{total !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
