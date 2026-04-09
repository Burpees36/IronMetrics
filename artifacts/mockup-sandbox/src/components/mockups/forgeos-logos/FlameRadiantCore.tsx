export function FlameRadiantCore() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Flame Variation 3 — Radiant Core</p>

        <div className="flex items-center gap-4">
          <svg width="50" height="56" viewBox="0 0 50 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="32" r="22" fill="#0f172a" />
            <path d="M25 6C25 6 12 18 12 30C12 40 17 48 25 52C33 48 38 40 38 30C38 18 25 6 25 6Z" fill="#f97316" />
            <path d="M25 16C25 16 18 24 18 32C18 38 21 44 25 47C29 44 32 38 32 32C32 24 25 16 25 16Z" fill="#fbbf24" />
            <path d="M25 26C25 26 22 30 22 34C22 38 23 40 25 42C27 40 28 38 28 34C28 30 25 26 25 26Z" fill="#fef3c7" />
          </svg>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "32px", letterSpacing: "-1px", color: "#0f172a", lineHeight: 1 }}>
                forge
              </span>
              <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "32px", letterSpacing: "-1px", lineHeight: 1, color: "#f97316" }}>
                os
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">App Store Icon</p>
            <div style={{ width: 120, height: 120, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#0f172a" />
                <defs>
                  <radialGradient id="glow1" cx="60" cy="70" r="44" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#f97316" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="60" cy="70" r="44" fill="url(#glow1)" />
                <path d="M60 14C60 14 30 38 30 58C30 78 42 92 60 98C78 92 90 78 90 58C90 38 60 14 60 14Z" fill="#f97316" />
                <path d="M60 30C60 30 40 46 40 62C40 76 48 86 60 92C72 86 80 76 80 62C80 46 60 30 60 30Z" fill="#fbbf24" />
                <path d="M60 48C60 48 50 56 50 66C50 74 54 80 60 84C66 80 70 74 70 66C70 56 60 48 60 48Z" fill="#fef3c7" />
              </svg>
            </div>
            <p className="text-[8px] text-slate-300">1024 x 1024 · No transparency</p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Small Sizes</p>
            <div className="flex gap-3 items-end">
              <div style={{ width: 60, height: 60, borderRadius: 13, overflow: "hidden" }}>
                <svg width="60" height="60" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M60 14C60 14 30 38 30 58C30 78 42 92 60 98C78 92 90 78 90 58C90 38 60 14 60 14Z" fill="#f97316" />
                  <path d="M60 30C60 30 40 46 40 62C40 76 48 86 60 92C72 86 80 76 80 62C80 46 60 30 60 30Z" fill="#fbbf24" />
                  <path d="M60 48C60 48 50 56 50 66C50 74 54 80 60 84C66 80 70 74 70 66C70 56 60 48 60 48Z" fill="#fef3c7" />
                </svg>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: "hidden" }}>
                <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M60 18C60 18 32 40 32 58C32 78 44 92 60 98C76 92 88 78 88 58C88 40 60 18 60 18Z" fill="#f97316" />
                  <path d="M60 36C60 36 42 50 42 64C42 78 50 86 60 92C70 86 78 78 78 64C78 50 60 36 60 36Z" fill="#fbbf24" />
                </svg>
              </div>
              <div style={{ width: 29, height: 29, borderRadius: 6, overflow: "hidden" }}>
                <svg width="29" height="29" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M60 20C60 20 32 42 32 60C32 80 44 94 60 100C76 94 88 80 88 60C88 42 60 20 60 20Z" fill="#f97316" />
                  <path d="M60 42C60 42 44 54 44 66C44 78 50 86 60 92C70 86 76 78 76 66C76 54 60 42 60 42Z" fill="#fbbf24" />
                </svg>
              </div>
            </div>
            <p className="text-[8px] text-slate-300">60pt · 40pt · 29pt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
