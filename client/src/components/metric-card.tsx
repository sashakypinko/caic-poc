import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
  variant?: "default" | "warning" | "danger";
  testId?: string;
}

export function MetricCard({ title, value, icon: Icon, description, variant = "default", testId }: MetricCardProps) {
  const variantStyles = {
    default: "text-primary",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  const bgStyles = {
    default: "bg-primary/10",
    warning: "bg-amber-500/10",
    danger: "bg-red-500/10",
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p 
              className={cn("text-3xl font-bold", variantStyles[variant])}
              data-testid={testId}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn("p-3 rounded-md", bgStyles[variant])}>
            <Icon className={cn("h-5 w-5", variantStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
