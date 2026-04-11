import { Link } from "wouter";
import { motion } from "framer-motion";
import { PartyPopper, Cake, Award, Flame, RotateCcw, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MorningBriefingCelebration } from "@workspace/api-client-react";

const milestoneConfig: Record<string, { icon: typeof Cake; label: string; color: string; badgeBg: string }> = {
  birthday: { icon: Cake, label: "Birthday", color: "text-pink-500", badgeBg: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  anniversary: { icon: Award, label: "Anniversary", color: "text-amber-500", badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  attendance_milestone: { icon: Star, label: "Attendance", color: "text-blue-500", badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  streak: { icon: Flame, label: "Streak", color: "text-orange-500", badgeBg: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  comeback: { icon: RotateCcw, label: "Comeback", color: "text-emerald-500", badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

function getMilestoneConfig(type: string) {
  return milestoneConfig[type] || { icon: Star, label: "Milestone", color: "text-purple-500", badgeBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" };
}

function CelebrationItem({ celebration }: { celebration: MorningBriefingCelebration }) {
  const config = getMilestoneConfig(celebration.type);
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 bg-white/60 dark:bg-white/5 rounded-lg px-3 py-2 min-w-0">
      <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 dark:bg-white/10", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{celebration.memberName}</p>
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none flex-shrink-0", config.badgeBg)}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{celebration.detail}</p>
      </div>
      <Link href={`/members/${celebration.memberId}`}>
        <Button variant="ghost" size="sm" className="flex-shrink-0 h-7 px-2 text-xs hover:bg-white/50 dark:hover:bg-white/10">
          View
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Button>
      </Link>
    </div>
  );
}

export function CelebrationsBanner({ celebrations }: { celebrations: MorningBriefingCelebration[] }) {
  if (!celebrations || celebrations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-testid="celebrations-banner"
      className="relative overflow-hidden rounded-xl border border-amber-200/60 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/20 p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <PartyPopper className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {celebrations.length === 1
              ? "1 Member Milestone Today"
              : `${celebrations.length} Member Milestones Today`}
          </h3>
          <p className="text-xs text-muted-foreground">
            Take a moment to recognize these wins — it means a lot.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {celebrations.map((c, i) => (
          <CelebrationItem key={`${c.memberName}-${c.type}-${i}`} celebration={c} />
        ))}
      </div>
    </motion.div>
  );
}
