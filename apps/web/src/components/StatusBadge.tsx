import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  value: string | null;
}

export function StatusBadge({ value }: StatusBadgeProps) {
  if (!value) return <Badge variant="outline" className="text-gray-400">Unknown</Badge>;

  const map: Record<string, { label: string; className: string }> = {
    success: { label: "Success", className: "bg-green-50 text-green-700 border-green-200" },
    failure: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" },
    unknown: { label: "Unknown", className: "bg-gray-50 text-gray-600 border-gray-200" },
    done: { label: "Done", className: "bg-blue-50 text-blue-700 border-blue-200" },
    "in-progress": { label: "In Progress", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  };

  const config = map[value] ?? { label: value, className: "bg-gray-50 text-gray-600 border-gray-200" };

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
