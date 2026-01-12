import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  progress: number;
  stage: string;
  message: string;
}

const STAGES = [
  { key: "fetching", label: "Fetching Reports", threshold: 25 },
  { key: "aggregating", label: "Aggregating Data", threshold: 40 },
  { key: "synthesizing", label: "Generating Summaries", threshold: 95 },
  { key: "complete", label: "Complete", threshold: 100 },
];

export function ProgressTracker({ progress, stage, message }: ProgressTrackerProps) {
  return (
    <div className="space-y-4" data-testid="progress-tracker">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      
      <Progress value={progress} className="h-2" data-testid="progress-bar" />
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STAGES.map((s, index) => {
          const isComplete = progress >= s.threshold;
          const isActive = stage === s.key || (progress > 0 && progress < s.threshold && STAGES[index - 1]?.threshold <= progress);
          
          return (
            <div 
              key={s.key}
              className={cn(
                "flex items-center gap-2 text-xs p-2 rounded-md",
                isComplete ? "bg-primary/10 text-primary" : isActive ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              {isComplete ? (
                <CheckCircle className="h-3 w-3" />
              ) : isActive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
              )}
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
