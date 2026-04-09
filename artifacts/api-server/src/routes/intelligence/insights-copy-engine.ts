interface RSIBreakdownItem {
  metric: string;
  value: number;
  normalized: number;
  weight: number;
  contribution: number;
}

interface RSIData {
  score: number;
  band: string;
  breakdown: RSIBreakdownItem[];
  components: {
    churnRate: number;
    avgRevPerMember: number;
    netMemberGrowth: number;
    avgTenure: number;
  };
}

interface RevenueForecast {
  currentMrr: number;
  expectedMrr3m: number;
  upsideMrr3m: number;
  downsideMrr3m: number;
  expectedMrr6m: number;
  upsideMrr6m: number;
  downsideMrr6m: number;
  expectedMrr12m: number;
  upsideMrr12m: number;
  downsideMrr12m: number;
}

interface BenchmarkComparison {
  metric: string;
  gymValue: number;
  industryMedian: number | null;
  percentileRank: number | null;
  label: string;
  format: string;
  lowerIsBetter?: boolean;
}

interface BriefingSnapshot {
  activeMembers: number;
  mrr: number;
  rsiScore: number;
  rsiBand: string;
  atRiskMembers: number;
  atRiskCritical: number;
  atRiskHigh: number;
  revenueAtRisk: number;
  engagementRate: number;
  staleLeads: number;
  newLeads: number;
  activeLeads: number;
  failedPayments: number;
  todayClasses: number;
  classFillRate: number;
}

function fmtDollars(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${Math.round(val).toLocaleString()}`;
}

function fmtPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function generateRSIComponentInsight(item: RSIBreakdownItem, components: RSIData["components"]): { explanation: string; lever: string; ctaLabel: string; ctaRoute: string } {
  switch (item.metric) {
    case "Churn Rate":
      if (components.churnRate <= 3) {
        return {
          explanation: `${fmtPercent(components.churnRate)} churn. Your members are staying. That's the foundation everything else is built on.`,
          lever: "Double down on your onboarding sequence. It's working — protect it.",
          ctaLabel: "View retention",
          ctaRoute: "/retention",
        };
      } else if (components.churnRate <= 7) {
        return {
          explanation: `${fmtPercent(components.churnRate)} churn. You're losing roughly ${Math.round(components.churnRate / 100 * 50)} out of every 50 members per cycle. That adds up.`,
          lever: "Open the at-risk list. Call the top 3 flagged members today. Personal outreach is the fastest way to stop the bleeding.",
          ctaLabel: "View at-risk members",
          ctaRoute: "/retention",
        };
      }
      return {
        explanation: `${fmtPercent(components.churnRate)} churn. Members are leaving faster than you can replace them. This is your biggest problem right now.`,
        lever: "Open the at-risk list and call your top 3 flagged members today. Saving 2-3 per month changes the math.",
        ctaLabel: "View at-risk members",
        ctaRoute: "/retention",
      };

    case "Avg Revenue/Member":
      if (components.avgRevPerMember >= 150) {
        return {
          explanation: `${fmtDollars(components.avgRevPerMember)}/member. Strong. Your pricing is doing its job.`,
          lever: "Add a premium add-on — personal training or nutrition — to push this higher without raising base rates.",
          ctaLabel: "View billing",
          ctaRoute: "/billing",
        };
      } else if (components.avgRevPerMember >= 80) {
        return {
          explanation: `${fmtDollars(components.avgRevPerMember)}/member. Decent, but there's money left on the table.`,
          lever: "Add a tiered plan or premium add-on. Personal training, nutrition coaching, or open gym access — pick one and launch it.",
          ctaLabel: "View billing",
          ctaRoute: "/billing",
        };
      }
      return {
        explanation: `${fmtDollars(components.avgRevPerMember)}/member. That's low. You're working too hard for too little per head.`,
        lever: "Raise your base rate $10/mo or add a premium tier. You don't need more members — you need more revenue per member.",
        ctaLabel: "View billing",
        ctaRoute: "/billing",
      };

    case "Net Member Growth":
      if (components.netMemberGrowth > 3) {
        return {
          explanation: `+${components.netMemberGrowth} net members/month. You're growing. Keep the lead pipeline full and the referral asks going.`,
          lever: "Stay aggressive on follow-ups. Growth stalls the moment you take your foot off the gas.",
          ctaLabel: "View leads",
          ctaRoute: "/leads",
        };
      } else if (components.netMemberGrowth >= 0) {
        return {
          explanation: `${components.netMemberGrowth} net members/month. You're treading water. Not shrinking, but not growing either.`,
          lever: "Pick one: reduce churn or increase sign-ups. Check your lead pipeline — there are probably quick wins sitting there.",
          ctaLabel: "View leads",
          ctaRoute: "/leads",
        };
      }
      return {
        explanation: `${components.netMemberGrowth} net members/month. Your base is shrinking. More people are leaving than joining.`,
        lever: "Fix retention first — it's cheaper than acquisition. Then re-engage your stale leads to refill the pipeline.",
        ctaLabel: "View leads",
        ctaRoute: "/leads",
      };

    case "Avg Tenure (months)":
      if (components.avgTenure >= 12) {
        return {
          explanation: `${components.avgTenure.toFixed(1)} months average tenure. Your members stay. That's a strong community.`,
          lever: "Ask your longest-tenured members for referrals. They're your best sales channel and they'll do it if you ask.",
          ctaLabel: "View members",
          ctaRoute: "/members",
        };
      } else if (components.avgTenure >= 6) {
        return {
          explanation: `${components.avgTenure.toFixed(1)} months average tenure. Decent, but getting members past 6 months changes their lifetime value dramatically.`,
          lever: "Tighten your first-30-day experience. Check-ins at day 7, 14, and 30. Members who build habits early stay years.",
          ctaLabel: "View members",
          ctaRoute: "/members",
        };
      }
      return {
        explanation: `${components.avgTenure.toFixed(1)} months average tenure. That's short. Members aren't staying long enough to build habits or loyalty.`,
        lever: "Your onboarding is the problem. Build structured check-ins at day 7, 14, and 30. No check-in, no habit, no retention.",
        ctaLabel: "View members",
        ctaRoute: "/members",
      };

    default:
      return {
        explanation: `${item.metric}: ${item.value}`,
        lever: "Dig into this metric — find the root cause and fix it.",
        ctaLabel: "View details",
        ctaRoute: "/intelligence",
      };
  }
}

export function generateRSIOverallInsight(rsi: RSIData): string {
  const { score, band, components } = rsi;
  const weakest = rsi.breakdown.reduce((min, b) => b.normalized < min.normalized ? b : min, rsi.breakdown[0]);

  if (band === "Strong") {
    return `RSI: ${score.toFixed(1)}. Your retention engine is solid. The one place to push: ${weakest.metric.toLowerCase()}. That's your ceiling right now.`;
  } else if (band === "Moderate") {
    return `RSI: ${score.toFixed(1)}. Not bad, not great. Your weakest link is ${weakest.metric.toLowerCase()}. Fix that first — everything else improves when you do.`;
  }
  return `RSI: ${score.toFixed(1)}. Your retention is fragile. Start with ${weakest.metric.toLowerCase()} — it's dragging everything else down. Small fixes here compound fast.`;
}

export function generateRevenueForecastInsight(forecast: RevenueForecast, openLeads: number, churnRate: number, activeMembers: number): {
  headline: string;
  currentPace: string;
  leadScenario: string | null;
  churnScenario: string | null;
  ctaLabel: string;
  ctaRoute: string;
} {
  const currentMrr = forecast.currentMrr;
  const expected6m = forecast.expectedMrr6m;
  const avgRevPerMember = activeMembers > 0 ? currentMrr / activeMembers : 0;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const target6m = new Date();
  target6m.setMonth(target6m.getMonth() + 6);
  const targetMonthName = monthNames[target6m.getMonth()];

  const headline = `${fmtDollars(currentMrr)} MRR. ${activeMembers} active members. Here's where it's headed.`;

  const currentPace = `Current trajectory: ${fmtDollars(expected6m)} MRR by ${targetMonthName}. ${
    expected6m > currentMrr
      ? `That's +${fmtDollars(expected6m - currentMrr)}/mo. Keep pushing.`
      : expected6m < currentMrr
      ? `That's -${fmtDollars(currentMrr - expected6m)}/mo. Churn is outpacing growth. Fix it now.`
      : "Flat. You need to move the needle."
  }`;

  let leadScenario: string | null = null;
  if (openLeads > 0 && avgRevPerMember > 0) {
    const convertibleLeads = Math.min(openLeads, Math.ceil(openLeads * 0.4));
    const additionalMrr = Math.round(convertibleLeads * avgRevPerMember);
    const newTotal = currentMrr + additionalMrr;
    leadScenario = `${openLeads} open leads. Close ${convertibleLeads} and that's +${fmtDollars(additionalMrr)}/mo — ${fmtDollars(newTotal)} MRR. Follow up today.`;
  }

  let churnScenario: string | null = null;
  if (churnRate > 2 && activeMembers > 0) {
    const currentChurnMembers = Math.round((churnRate / 100) * activeMembers);
    const halfChurnMembers = Math.round(currentChurnMembers / 2);
    const savedRevenue = Math.round(halfChurnMembers * avgRevPerMember);
    if (savedRevenue > 0) {
      churnScenario = `Cut churn from ${fmtPercent(churnRate)} to ${fmtPercent(churnRate / 2)} and you keep ${halfChurnMembers} more member${halfChurnMembers !== 1 ? "s" : ""} — that's ${fmtDollars(savedRevenue)}/mo you stop losing.`;
    }
  }

  return {
    headline,
    currentPace,
    leadScenario,
    churnScenario,
    ctaLabel: openLeads > 0 ? "View open leads" : "View billing",
    ctaRoute: openLeads > 0 ? "/leads" : "/billing",
  };
}

export function generateBenchmarkInsight(comparison: BenchmarkComparison): {
  conversational: string;
  recommendation: string;
  ctaLabel: string;
  ctaRoute: string;
} {
  const { metric, gymValue, industryMedian, percentileRank, label, format, lowerIsBetter } = comparison;
  const fmtVal = format === "currency" ? fmtDollars(gymValue) : format === "percent" ? fmtPercent(gymValue) : `${gymValue.toFixed(1)}`;
  const fmtMedian = industryMedian != null ? (format === "currency" ? fmtDollars(industryMedian) : format === "percent" ? fmtPercent(industryMedian) : `${industryMedian.toFixed(1)}`) : null;

  if (percentileRank == null || industryMedian == null) {
    return {
      conversational: `Your ${label.toLowerCase()} is ${fmtVal}. We don't have enough comparison data yet.`,
      recommendation: "Keep tracking — benchmarks will update as more data comes in.",
      ctaLabel: "View details",
      ctaRoute: "/intelligence",
    };
  }

  const isGood = lowerIsBetter ? gymValue < industryMedian : gymValue > industryMedian;

  const routeMap: Record<string, string> = {
    churn_rate: "/retention",
    avg_revenue_per_member: "/billing",
    retention_rate: "/retention",
    engagement_rate: "/retention",
    rsi_score: "/intelligence",
  };
  const ctaRoute = routeMap[metric] || "/intelligence";

  if (percentileRank >= 75) {
    return {
      conversational: `${label} (${fmtVal}) — top 25% vs the ${fmtMedian} median. This is working.`,
      recommendation: `Protect this. Stay consistent with what got you here.`,
      ctaLabel: "Keep it up",
      ctaRoute,
    };
  } else if (percentileRank >= 50) {
    return {
      conversational: `${label} (${fmtVal}) — above the ${fmtMedian} median. Solid, not standout.`,
      recommendation: `One focused push and you're in the top tier. ${getSpecificBenchmarkAdvice(metric, lowerIsBetter)}`,
      ctaLabel: "Improve this",
      ctaRoute,
    };
  } else if (percentileRank >= 25) {
    return {
      conversational: `${label} (${fmtVal}) — below the ${fmtMedian} median. Most similar businesses are doing better here.`,
      recommendation: `Clear improvement opportunity. ${getSpecificBenchmarkAdvice(metric, lowerIsBetter)}`,
      ctaLabel: "Take action",
      ctaRoute,
    };
  }
  return {
    conversational: `${label} (${fmtVal}) — bottom 25% vs the ${fmtMedian} median. This needs to be fixed.`,
    recommendation: `This is dragging your business down. ${getSpecificBenchmarkAdvice(metric, lowerIsBetter)}`,
    ctaLabel: "Fix this now",
    ctaRoute,
  };
}

function getSpecificBenchmarkAdvice(metric: string, lowerIsBetter?: boolean): string {
  switch (metric) {
    case "churn_rate":
      return "Open the at-risk list. Call the top 3 flagged members today. Saving 2-3 per month changes everything.";
    case "avg_revenue_per_member":
      return "Add a premium tier or raise your base rate. One pricing change can close this gap entirely.";
    case "retention_rate":
      return "Tighten your first-30-day experience. Check-ins at day 7, 14, and 30. That's where you're losing people.";
    case "engagement_rate":
      return "Launch a 2-week attendance challenge. Move your best coach to the weakest time slot. Make showing up the norm.";
    case "rsi_score":
      return "RSI is a composite — check each component to find your weakest link. Fix that one thing first.";
    default:
      return "Benchmark against similar businesses and close the gap on this metric.";
  }
}

export function generateConversationalBriefingItem(
  type: string,
  data: {
    count?: number;
    amount?: number;
    names?: string[];
    avgRevPerMember?: number;
    rsiScore?: number;
    rsiBand?: string;
    classFillRate?: number;
    classCount?: number;
    enrolled?: number;
    capacity?: number;
  }
): { message: string; action: string; link: string } {
  switch (type) {
    case "at_risk_critical": {
      const revenueStr = data.amount ? ` — ${fmtDollars(data.amount)}/mo on the line` : "";
      return {
        message: `${data.count} member${data.count !== 1 ? "s at" : " at"} critical risk${revenueStr}. Call ${data.count === 1 ? "them" : "each one"} today. Not tomorrow. A 2-minute check-in is the cheapest save you'll ever make.`,
        action: "View at-risk members",
        link: "/retention",
      };
    }
    case "failed_payments": {
      const amountStr = data.amount ? ` — ${fmtDollars(data.amount)}/mo at stake` : "";
      return {
        message: `${data.count} payment${data.count !== 1 ? "s" : ""} failed${amountStr}. Expired cards, most likely. Send the update link now. 80% fix it within 48 hours when you act fast.`,
        action: "Recover payments",
        link: "/billing",
      };
    }
    case "auto_suspended": {
      const nameStr = data.names && data.names.length > 0
        ? `: ${data.names.length <= 3 ? data.names.join(", ") : `${data.names.slice(0, 3).join(", ")} and ${data.names.length - 3} more`}`
        : "";
      return {
        message: `${data.count} member${data.count !== 1 ? "s" : ""} auto-suspended${nameStr}. Check these — some are just card issues. Override the ones worth keeping before the relationship goes cold.`,
        action: "Review members",
        link: "/members",
      };
    }
    case "stale_leads": {
      const revenueStr = data.avgRevPerMember && data.count ? ` That's ${fmtDollars(data.count * data.avgRevPerMember * 0.25)}/mo if you close even a quarter.` : "";
      return {
        message: `${data.count} lead${data.count !== 1 ? "s" : ""} went stale — no follow-up.${revenueStr} Every hour you wait, the close rate drops. Contact them now.`,
        action: "Follow up now",
        link: "/leads",
      };
    }
    case "new_leads": {
      return {
        message: `${data.count} new lead${data.count !== 1 ? "s" : ""} in the last 24 hours. Contact them now — not later. Leads reached within 1 hour close at 7x the rate.`,
        action: "View new leads",
        link: "/leads",
      };
    }
    case "class_schedule": {
      if ((data.classFillRate ?? 0) >= 80) {
        return {
          message: `${data.classCount} class${data.classCount !== 1 ? "es" : ""} today at ${data.classFillRate}% capacity (${data.enrolled}/${data.capacity} spots). Schedule is working. Keep it tight.`,
          action: "View schedule",
          link: "/schedule",
        };
      }
      return {
        message: `${data.classCount} class${data.classCount !== 1 ? "es" : ""} today at ${data.classFillRate}% capacity (${data.enrolled}/${data.capacity} spots). Empty spots = wasted capacity. Post "open spots today" right now or text your regulars.`,
        action: "View schedule",
        link: "/schedule",
      };
    }
    case "rsi_strong": {
      return {
        message: `RSI: ${data.rsiScore?.toFixed(1)} (${data.rsiBand}). Your retention engine is running well. Stay disciplined — complacency kills momentum.`,
        action: "View RSI breakdown",
        link: "/intelligence",
      };
    }
    case "active_leads": {
      return {
        message: `${data.count} active lead${data.count !== 1 ? "s" : ""} in your pipeline. Follow up today. Speed is everything — the ones you wait on are the ones you lose.`,
        action: "Open pipeline",
        link: "/leads",
      };
    }
    default:
      return {
        message: "",
        action: "View details",
        link: "/dashboard",
      };
  }
}

export function generateConversationalSummary(snapshot: BriefingSnapshot): string {
  const parts: string[] = [];

  if (snapshot.atRiskCritical > 0) {
    parts.push(`${snapshot.atRiskCritical} member${snapshot.atRiskCritical > 1 ? "s" : ""} at critical risk — ${fmtDollars(snapshot.revenueAtRisk)}/mo on the line`);
  }

  if (snapshot.failedPayments > 0) {
    parts.push(`${snapshot.failedPayments} failed payment${snapshot.failedPayments > 1 ? "s" : ""} to recover`);
  }

  if (snapshot.staleLeads > 0) {
    parts.push(`${snapshot.staleLeads} stale lead${snapshot.staleLeads > 1 ? "s" : ""} — follow up now`);
  }

  if (parts.length === 0) {
    return `Nothing urgent. ${fmtDollars(snapshot.mrr)} MRR, ${snapshot.activeMembers} active members, RSI ${snapshot.rsiScore.toFixed(1)} (${snapshot.rsiBand}). Use today to build — the fires are out.`;
  }

  const actionPart = parts.join(". ");
  return `${actionPart}. ${fmtDollars(snapshot.mrr)} MRR, ${snapshot.activeMembers} active members. Handle these first.`;
}
