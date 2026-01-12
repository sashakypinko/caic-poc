import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SummaryCardProps {
  title: string;
  content: string;
  icon: LucideIcon;
  testId?: string;
}

export function SummaryCard({ title, content, icon: Icon, testId }: SummaryCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <p 
            className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap"
            data-testid={testId}
          >
            {content || "No data available for synthesis."}
          </p>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
