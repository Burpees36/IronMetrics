export const BANNED_PHRASES = [
  "consider reaching out",
  "optimize your revenue",
  "you might want to",
  "it could be beneficial",
  "improve retention by engaging more",
  "keep doing what's working",
  "there may be room to improve",
  "worth investigating",
  "this is manageable",
  "we suggest exploring",
  "you may want to consider",
  "proactively engage",
  "leverage your community",
  "unlock potential",
  "take your gym to the next level",
  "maximize your results",
  "elevate your business",
  "supercharge your growth",
  "we recommend",
  "it might be helpful to",
];

export const INTENSITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type IntensityLevel = (typeof INTENSITY)[keyof typeof INTENSITY];

export function dataFirst(metric: string, value: string | number, unit?: string): string {
  const u = unit ? `${unit}` : "";
  return `${value}${u} ${metric}`;
}

export function actionItem(verb: string, target: string, timeframe?: string): string {
  const tf = timeframe ? ` ${timeframe}` : "";
  return `${verb} ${target}${tf}`;
}

export function threePartMessage(
  whatsHappening: string,
  whyItMatters: string,
  whatToDo: string,
): string {
  return `${whatsHappening} ${whyItMatters} ${whatToDo}`;
}

export function fmtDollars(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${Math.round(val).toLocaleString()}`;
}

export function fmtPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}
