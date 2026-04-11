import React from "react";

interface ForgeOSLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  className?: string;
}

const SIZES = {
  sm: { icon: 24, text: "text-lg", gap: "gap-2" },
  md: { icon: 32, text: "text-xl", gap: "gap-3" },
  lg: { icon: 40, text: "text-2xl", gap: "gap-3" },
  xl: { icon: 48, text: "text-3xl", gap: "gap-4" },
};

function FlameIcon({ size, id }: { size: number; id: string }) {
  const viewBox = "0 0 48 58";
  return (
    <svg
      width={size}
      height={size * (58 / 48)}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`ember-${id}`}
          x1="24"
          y1="0"
          x2="24"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <path
        d="M24 0C24 0 4 18 4 34C4 48 13 55 24 58C35 55 44 48 44 34C44 18 24 0 24 0Z"
        fill={`url(#ember-${id})`}
      />
      <path
        d="M24 16C24 16 14 26 14 36C14 44 18 50 24 53C30 50 34 44 34 36C34 26 24 16 24 16Z"
        fill="#0f172a"
        opacity="0.9"
      />
      <path
        d="M24 26C24 26 19 32 19 37C19 42 21 46 24 48C27 46 29 42 29 37C29 32 24 26 24 26Z"
        fill="#f97316"
      />
      <path
        d="M24 34C24 34 22 36 22 38C22 40 23 42 24 43C25 42 26 40 26 38C26 36 24 34 24 34Z"
        fill="#fbbf24"
      />
    </svg>
  );
}

export function ForgeOSLogo({ size = "md", variant = "full", className = "" }: ForgeOSLogoProps) {
  const s = SIZES[size];
  const id = React.useId().replace(/:/g, "");

  if (variant === "icon") {
    return (
      <div className={className}>
        <FlameIcon size={s.icon} id={id} />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <FlameIcon size={s.icon * 0.75} id={id} />
      <span className={`font-display font-bold ${s.text} tracking-tight text-slate-900 dark:text-slate-100`}>
        FORGE<span className="text-orange-500">OS</span>
      </span>
    </div>
  );
}
