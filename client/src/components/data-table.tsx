import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InstabilityCounts } from "@shared/schema";

interface DataTableProps {
  data: InstabilityCounts;
  title: string;
  testIdPrefix?: string;
}

export function DataTable({ data, title, testIdPrefix }: DataTableProps) {
  const entries = Object.entries(data).filter(([_, value]) => value >= 0);
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case "None":
        return "text-green-600 dark:text-green-400";
      case "Minor":
        return "text-yellow-600 dark:text-yellow-400";
      case "Moderate":
        return "text-orange-600 dark:text-orange-400";
      case "Major":
        return "text-red-600 dark:text-red-400";
      case "Severe":
        return "text-red-700 dark:text-red-300";
      default:
        return "text-foreground";
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/2">{title}</TableHead>
          <TableHead className="text-right">Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([level, count]) => (
          <TableRow key={level}>
            <TableCell className={getLevelColor(level)}>{level}</TableCell>
            <TableCell 
              className="text-right font-medium"
              data-testid={testIdPrefix ? `${testIdPrefix}-${level.toLowerCase()}` : undefined}
            >
              {count}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
