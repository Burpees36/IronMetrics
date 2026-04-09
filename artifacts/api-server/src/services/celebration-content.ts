import type { MilestoneType } from "./milestone-detection";
import type { MemberContext } from "./personalization-context";

interface CelebrationContent {
  subject: string;
  content: string;
  title: string;
  description: string;
}

export function buildCelebrationContent(
  milestoneType: MilestoneType,
  detail: string,
  firstName: string,
  lastName: string,
  value: number | undefined,
  ctx: MemberContext | null,
  gymName: string
): CelebrationContent {
  switch (milestoneType) {
    case "birthday":
      return buildBirthdayContent(firstName, lastName, ctx, gymName);
    case "anniversary":
      return buildAnniversaryContent(firstName, lastName, value ?? 1, ctx, gymName);
    case "attendance_milestone":
      return buildAttendanceMilestoneContent(firstName, lastName, value ?? 0, ctx, gymName);
    case "streak":
      return buildStreakContent(firstName, lastName, value ?? 0, ctx, gymName);
    case "comeback":
      return buildComebackContent(firstName, lastName, ctx, gymName);
    default:
      return {
        subject: `A note for you, ${firstName}`,
        content: `Hi ${firstName},\n\nJust wanted to reach out and say we appreciate you being part of ${gymName}.\n\nKeep it up!`,
        title: `Celebrate ${firstName} ${lastName}`,
        description: `${firstName} ${lastName} has a milestone worth celebrating.`,
      };
  }
}

function buildBirthdayContent(
  firstName: string,
  lastName: string,
  ctx: MemberContext | null,
  gymName: string
): CelebrationContent {
  const tenureLine = ctx && ctx.tenureMonths > 0
    ? ` You've been part of ${gymName} for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""} — glad you're here.`
    : "";

  return {
    subject: `Happy birthday, ${firstName}!`,
    content: `Hi ${firstName},\n\nHappy birthday from all of us at ${gymName}!${tenureLine}\n\nHope today is a great one. See you in the gym!`,
    title: `Happy birthday: ${firstName} ${lastName}`,
    description: `Today is ${firstName} ${lastName}'s birthday. Send a personal message to make their day.`,
  };
}

function buildAnniversaryContent(
  firstName: string,
  lastName: string,
  years: number,
  ctx: MemberContext | null,
  gymName: string
): CelebrationContent {
  const yearLabel = years === 1 ? "1 year" : `${years} years`;
  const classLine = ctx?.favoriteClassName
    ? ` From ${ctx.favoriteClassName} to everything else — you've put in the work.`
    : "";

  return {
    subject: `${yearLabel} strong, ${firstName}!`,
    content: `Hi ${firstName},\n\n${yearLabel} at ${gymName}. That's real commitment.${classLine}\n\nThank you for being part of this community. Here's to the next year.`,
    title: `${yearLabel} anniversary: ${firstName} ${lastName}`,
    description: `${firstName} ${lastName} has been a member for ${yearLabel}. Celebrate their commitment.`,
  };
}

function buildAttendanceMilestoneContent(
  firstName: string,
  lastName: string,
  milestone: number,
  ctx: MemberContext | null,
  gymName: string
): CelebrationContent {
  const coachLine = ctx?.lastCoachName
    ? ` Coach ${ctx.lastCoachName} and the whole team see the work you're putting in.`
    : "";

  return {
    subject: `${milestone} classes, ${firstName}. That's not nothing.`,
    content: `Hi ${firstName},\n\n${milestone} classes at ${gymName}. That's serious consistency.${coachLine}\n\nKeep showing up. The results compound.`,
    title: `${milestone} classes: ${firstName} ${lastName}`,
    description: `${firstName} ${lastName} just crossed ${milestone} total class sign-ins. Recognize the consistency.`,
  };
}

function buildStreakContent(
  firstName: string,
  lastName: string,
  weeks: number,
  ctx: MemberContext | null,
  gymName: string
): CelebrationContent {
  const className = ctx?.favoriteClassName ? ` in ${ctx.favoriteClassName}` : "";

  return {
    subject: `${weeks} weeks straight, ${firstName}. Keep it rolling.`,
    content: `Hi ${firstName},\n\n${weeks}-week streak${className}. That kind of consistency is rare.\n\nDon't break the chain. See you this week.`,
    title: `${weeks}-week streak: ${firstName} ${lastName}`,
    description: `${firstName} ${lastName} has maintained a ${weeks}-week attendance streak. Recognize the discipline.`,
  };
}

function buildComebackContent(
  firstName: string,
  lastName: string,
  ctx: MemberContext | null,
  gymName: string
): CelebrationContent {
  const className = ctx?.favoriteClassName
    ? ` ${ctx.favoriteClassName} is still going strong — jump back in anytime.`
    : "";

  return {
    subject: `Good to see you back, ${firstName}`,
    content: `Hi ${firstName},\n\nNoticed you're back at ${gymName}. Glad to see it.${className}\n\nLet's keep the momentum going. Welcome back.`,
    title: `Welcome back: ${firstName} ${lastName}`,
    description: `${firstName} ${lastName} returned after 30+ days away. Send a warm welcome back message.`,
  };
}
