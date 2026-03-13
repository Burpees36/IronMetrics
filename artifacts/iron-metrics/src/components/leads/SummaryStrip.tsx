import { motion } from "framer-motion";
import { Users, AlertTriangle, CalendarClock, TrendingUp } from "lucide-react";

interface SummaryStripProps {
  totalActive: number;
  staleCount: number;
  needsFollowUp: number;
  conversionsThisMonth: number;
}

export function SummaryStrip({ totalActive, staleCount, needsFollowUp, conversionsThisMonth }: SummaryStripProps) {
  const metrics = [
    {
      label: "Active Leads",
      value: totalActive,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Needs Follow-up",
      value: needsFollowUp,
      icon: CalendarClock,
      color: needsFollowUp > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      bgColor: needsFollowUp > 0 ? "bg-amber-500/10" : "bg-muted/30",
    },
    {
      label: "Stale",
      value: staleCount,
      icon: AlertTriangle,
      color: staleCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      bgColor: staleCount > 0 ? "bg-amber-500/10" : "bg-muted/30",
    },
    {
      label: "Converted This Month",
      value: conversionsThisMonth,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <div className={`h-9 w-9 rounded-lg ${metric.bgColor} flex items-center justify-center shrink-0`}>
            <metric.icon className={`h-4.5 w-4.5 ${metric.color}`} />
          </div>
          <div className="min-w-0">
            <div className={`text-xl font-bold ${metric.color}`}>{metric.value}</div>
            <div className="text-xs text-muted-foreground truncate">{metric.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
