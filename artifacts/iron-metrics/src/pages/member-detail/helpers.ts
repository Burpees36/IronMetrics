export function statusColor(status: string): string {
  switch (status) {
    case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "hold": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "inactive": return "bg-muted text-muted-foreground border-border";
    default: return "bg-destructive/10 text-destructive border-destructive/20";
  }
}

export function riskColor(tier: string | null | undefined): string {
  switch (tier) {
    case "critical": return "text-red-500";
    case "high": return "text-orange-500";
    case "healthy": return "text-emerald-500";
    default: return "text-yellow-500";
  }
}

export function subStatusColor(s: string): string {
  switch (s) {
    case "active": case "succeeded": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "paused": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "cancelled": case "cancel_at_period_end": case "failed": return "bg-destructive/10 text-destructive border-destructive/20";
    case "past_due": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function formatDate(d: any): string {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}
