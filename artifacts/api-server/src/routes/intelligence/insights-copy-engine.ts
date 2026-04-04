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
          explanation: `Your churn rate is ${fmtPercent(components.churnRate)} — that's excellent. You're keeping members longer than most gyms.`,
          lever: "Keep doing what's working. Focus on onboarding quality to maintain this.",
          ctaLabel: "View retention",
          ctaRoute: "/retention",
        };
      } else if (components.churnRate <= 7) {
        return {
          explanation: `Your churn rate is ${fmtPercent(components.churnRate)}. You're losing roughly ${Math.round(components.churnRate / 100 * 50)} out of every 50 members per cycle. That's manageable, but there's room to improve.`,
          lever: "Check your at-risk members list — personal outreach to flagged members before they cancel is the fastest fix.",
          ctaLabel: "View at-risk members",
          ctaRoute: "/retention",
        };
      }
      return {
        explanation: `Your churn rate is ${fmtPercent(components.churnRate)} — that's higher than healthy. Members are leaving faster than you can replace them.`,
        lever: "This is your biggest lever right now. Review your at-risk members and reach out today. Even saving 2-3 members makes a measurable difference.",
        ctaLabel: "View at-risk members",
        ctaRoute: "/retention",
      };

    case "Avg Revenue/Member":
      if (components.avgRevPerMember >= 150) {
        return {
          explanation: `Each member pays an average of ${fmtDollars(components.avgRevPerMember)}/mo — strong revenue per head.`,
          lever: "Your pricing is working well. Consider adding premium add-ons to push this even higher.",
          ctaLabel: "View billing",
          ctaRoute: "/billing",
        };
      } else if (components.avgRevPerMember >= 80) {
        return {
          explanation: `Each member pays an average of ${fmtDollars(components.avgRevPerMember)}/mo. That's decent, but there may be room to increase it.`,
          lever: "Consider introducing tiered pricing or premium add-ons like personal training, nutrition coaching, or open gym access.",
          ctaLabel: "View billing",
          ctaRoute: "/billing",
        };
      }
      return {
        explanation: `Each member pays an average of ${fmtDollars(components.avgRevPerMember)}/mo — that's on the low side.`,
        lever: "Review your pricing structure. Even a $10/mo increase across your base could significantly boost revenue without adding members.",
        ctaLabel: "View billing",
        ctaRoute: "/billing",
      };

    case "Net Member Growth":
      if (components.netMemberGrowth > 3) {
        return {
          explanation: `You're adding a net ${components.netMemberGrowth} members per month — great momentum.`,
          lever: "Keep your lead pipeline active and referral programs running. You're on a growth trajectory.",
          ctaLabel: "View leads",
          ctaRoute: "/leads",
        };
      } else if (components.netMemberGrowth >= 0) {
        return {
          explanation: `Your net growth is ${components.netMemberGrowth} members/month — you're roughly breaking even on membership count.`,
          lever: "To grow, you either need to reduce churn or increase new member acquisition. Check your lead pipeline for quick wins.",
          ctaLabel: "View leads",
          ctaRoute: "/leads",
        };
      }
      return {
        explanation: `You're losing a net ${Math.abs(components.netMemberGrowth)} members per month — your base is shrinking.`,
        lever: "Prioritize retention (cheaper than acquisition) and re-engage your stale leads to refill the pipeline.",
        ctaLabel: "View leads",
        ctaRoute: "/leads",
      };

    case "Avg Tenure (months)":
      if (components.avgTenure >= 12) {
        return {
          explanation: `Members stay an average of ${components.avgTenure.toFixed(1)} months — your community and culture are clearly strong.`,
          lever: "Long tenure = loyal community. Leverage referrals from your longest-tenured members — they're your best advocates.",
          ctaLabel: "View members",
          ctaRoute: "/members",
        };
      } else if (components.avgTenure >= 6) {
        return {
          explanation: `Members stay an average of ${components.avgTenure.toFixed(1)} months. That's decent, but getting members past the 6-month mark dramatically increases lifetime value.`,
          lever: "Focus on your first-30-day experience and engagement milestones. Members who build habits early stay longer.",
          ctaLabel: "View members",
          ctaRoute: "/members",
        };
      }
      return {
        explanation: `Members stay an average of ${components.avgTenure.toFixed(1)} months — that's short. Most members aren't sticking around long enough to build habits.`,
        lever: "Your onboarding needs attention. Create structured check-ins at day 7, 14, and 30 to build early connection.",
        ctaLabel: "View members",
        ctaRoute: "/members",
      };

    default:
      return {
        explanation: `${item.metric}: ${item.value}`,
        lever: "Review this metric for improvement opportunities.",
        ctaLabel: "View details",
        ctaRoute: "/intelligence",
      };
  }
}

export function generateRSIOverallInsight(rsi: RSIData): string {
  const { score, band, components } = rsi;
  const weakest = rsi.breakdown.reduce((min, b) => b.normalized < min.normalized ? b : min, rsi.breakdown[0]);

  if (band === "Strong") {
    return `Your RSI is ${score.toFixed(1)} — your gym's retention foundation is solid. Your biggest opportunity to move from good to great is ${weakest.metric.toLowerCase()}, which is your softest spot right now.`;
  } else if (band === "Moderate") {
    return `Your RSI is ${score.toFixed(1)} — things are OK, but there's meaningful room to improve. Your weakest area is ${weakest.metric.toLowerCase()}. Focusing there first will give you the biggest lift.`;
  }
  return `Your RSI is ${score.toFixed(1)} — your retention is fragile and needs attention. Start with ${weakest.metric.toLowerCase()}, which is dragging your score down the most. Small improvements here will compound quickly.`;
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

  const headline = `You're at ${fmtDollars(currentMrr)} MRR right now with ${activeMembers} active members.`;

  const currentPace = `At your current pace, you'll hit ${fmtDollars(expected6m)} MRR by ${targetMonthName}. ${
    expected6m > currentMrr
      ? `That's ${fmtDollars(expected6m - currentMrr)} more per month.`
      : expected6m < currentMrr
      ? `That's a ${fmtDollars(currentMrr - expected6m)} drop — mainly from churn outpacing growth.`
      : "You're projected to hold steady."
  }`;

  let leadScenario: string | null = null;
  if (openLeads > 0 && avgRevPerMember > 0) {
    const convertibleLeads = Math.min(openLeads, Math.ceil(openLeads * 0.4));
    const additionalMrr = Math.round(convertibleLeads * avgRevPerMember);
    const newTotal = currentMrr + additionalMrr;
    leadScenario = `You have ${openLeads} open leads. If you close ${convertibleLeads} of them, that's ${fmtDollars(additionalMrr)} more per month — jumping you to ${fmtDollars(newTotal)} MRR.`;
  }

  let churnScenario: string | null = null;
  if (churnRate > 2 && activeMembers > 0) {
    const currentChurnMembers = Math.round((churnRate / 100) * activeMembers);
    const halfChurnMembers = Math.round(currentChurnMembers / 2);
    const savedRevenue = Math.round(halfChurnMembers * avgRevPerMember);
    if (savedRevenue > 0) {
      churnScenario = `If you cut churn in half (from ${fmtPercent(churnRate)} to ${fmtPercent(churnRate / 2)}), you'd save roughly ${halfChurnMembers} member${halfChurnMembers !== 1 ? "s" : ""} and keep ${fmtDollars(savedRevenue)}/mo that's currently walking out the door.`;
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
      conversational: `Your ${label.toLowerCase()} (${fmtVal}) puts you in the top 25% — that's ${fmtVal} vs the ${fmtMedian} median.`,
      recommendation: `You're outperforming most gyms here. Protect this advantage by staying consistent with what's working.`,
      ctaLabel: "Keep it up",
      ctaRoute,
    };
  } else if (percentileRank >= 50) {
    return {
      conversational: `Your ${label.toLowerCase()} (${fmtVal}) is above the ${fmtMedian} median — solid, but not standout.`,
      recommendation: `You're above average. A focused effort here could push you into the top tier. ${getSpecificBenchmarkAdvice(metric, lowerIsBetter)}`,
      ctaLabel: "Improve this",
      ctaRoute,
    };
  } else if (percentileRank >= 25) {
    return {
      conversational: `Your ${label.toLowerCase()} (${fmtVal}) is below the ${fmtMedian} median. Most similar gyms are doing better here.`,
      recommendation: `This is a clear improvement opportunity. ${getSpecificBenchmarkAdvice(metric, lowerIsBetter)}`,
      ctaLabel: "Take action",
      ctaRoute,
    };
  }
  return {
    conversational: `Your ${label.toLowerCase()} (${fmtVal}) is in the bottom 25% vs the ${fmtMedian} median. This needs attention.`,
    recommendation: `This is significantly dragging your business down. ${getSpecificBenchmarkAdvice(metric, lowerIsBetter)}`,
    ctaLabel: "Fix this now",
    ctaRoute,
  };
}

function getSpecificBenchmarkAdvice(metric: string, lowerIsBetter?: boolean): string {
  switch (metric) {
    case "churn_rate":
      return "Review your at-risk member list and set up personal outreach. Even saving 2-3 members per month adds up fast.";
    case "avg_revenue_per_member":
      return "Consider tiered pricing, premium add-ons, or repricing your entry-level plan to increase average revenue.";
    case "retention_rate":
      return "Focus on your first-30-day experience — that's where most members are lost. Structured onboarding makes a big difference.";
    case "engagement_rate":
      return "Run attendance challenges, improve class scheduling, or add accountability check-ins to boost engagement.";
    case "rsi_score":
      return "Your RSI is a composite score — check each component (churn, revenue, growth, tenure) to find the weakest link.";
    default:
      return "Review this area for improvement opportunities relative to similar gyms.";
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
      const revenueStr = data.amount ? ` — that's about ${fmtDollars(data.amount)}/mo at risk` : "";
      return {
        message: `${data.count} member${data.count !== 1 ? "s are" : " is"} at critical risk of leaving${revenueStr}. A quick personal check-in could save ${data.count === 1 ? "them" : "most of them"} — people rarely leave when they feel noticed.`,
        action: "View at-risk members",
        link: "/retention",
      };
    }
    case "failed_payments": {
      const amountStr = data.amount ? ` totaling ${fmtDollars(data.amount)}/mo` : "";
      return {
        message: `${data.count} payment${data.count !== 1 ? "s" : ""} failed${amountStr}. Most of these are just expired cards — a friendly heads-up usually resolves it within 48 hours.`,
        action: "Recover payments",
        link: "/billing",
      };
    }
    case "auto_suspended": {
      const nameStr = data.names && data.names.length > 0
        ? `: ${data.names.length <= 3 ? data.names.join(", ") : `${data.names.slice(0, 3).join(", ")} and ${data.names.length - 3} more`}`
        : "";
      return {
        message: `${data.count} member${data.count !== 1 ? "s were" : " was"} auto-suspended for non-payment${nameStr}. Review these — some may be accidental and worth overriding to keep the relationship.`,
        action: "Review members",
        link: "/members",
      };
    }
    case "stale_leads": {
      const revenueStr = data.avgRevPerMember && data.count ? ` That's potentially ${fmtDollars(data.count * data.avgRevPerMember * 0.25)}/mo in new revenue if you convert even a quarter of them.` : "";
      return {
        message: `${data.count} lead${data.count !== 1 ? "s" : ""} went stale — they were interested but nobody followed up.${revenueStr} Speed matters with leads.`,
        action: "Follow up now",
        link: "/leads",
      };
    }
    case "new_leads": {
      return {
        message: `${data.count} new lead${data.count !== 1 ? "s" : ""} came in over the last 24 hours. Reach out today while they're still warm — leads contacted within 1 hour are 7x more likely to convert.`,
        action: "View new leads",
        link: "/leads",
      };
    }
    case "class_schedule": {
      if ((data.classFillRate ?? 0) >= 80) {
        return {
          message: `${data.classCount} class${data.classCount !== 1 ? "es" : ""} today at ${data.classFillRate}% capacity (${data.enrolled}/${data.capacity} spots). Nice work — your schedule is well-utilized.`,
          action: "View schedule",
          link: "/schedule",
        };
      }
      return {
        message: `${data.classCount} class${data.classCount !== 1 ? "es" : ""} today at ${data.classFillRate}% capacity (${data.enrolled}/${data.capacity} spots). There's room to fill more spots — consider a quick "open spots today" post or text blast.`,
        action: "View schedule",
        link: "/schedule",
      };
    }
    case "rsi_strong": {
      return {
        message: `Your RSI is ${data.rsiScore?.toFixed(1)} (${data.rsiBand}) — your gym is in great shape. Don't get complacent though — invest in systems and community to stay here.`,
        action: "View RSI breakdown",
        link: "/intelligence",
      };
    }
    case "active_leads": {
      return {
        message: `You have ${data.count} active lead${data.count !== 1 ? "s" : ""} in your pipeline. Keep the momentum going — consistent follow-up is the difference between a growing and a stagnant gym.`,
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
    parts.push(`${snapshot.atRiskCritical} member${snapshot.atRiskCritical > 1 ? "s" : ""} ${snapshot.atRiskCritical > 1 ? "are" : "is"} at critical risk — ${fmtDollars(snapshot.revenueAtRisk)}/mo could walk out the door`);
  }

  if (snapshot.failedPayments > 0) {
    parts.push(`${snapshot.failedPayments} payment${snapshot.failedPayments > 1 ? "s" : ""} need${snapshot.failedPayments === 1 ? "s" : ""} recovery`);
  }

  if (snapshot.staleLeads > 0) {
    parts.push(`${snapshot.staleLeads} lead${snapshot.staleLeads > 1 ? "s" : ""} went cold and need${snapshot.staleLeads === 1 ? "s" : ""} follow-up`);
  }

  if (parts.length === 0) {
    return `All clear today. Your gym is running at ${fmtDollars(snapshot.mrr)} MRR with ${snapshot.activeMembers} active members. RSI: ${snapshot.rsiScore.toFixed(1)} (${snapshot.rsiBand}). Focus on growth — everything else is handled.`;
  }

  const actionPart = parts.join(", ");
  return `Here's what matters today: ${actionPart}. You're at ${fmtDollars(snapshot.mrr)} MRR with ${snapshot.activeMembers} active members.`;
}
