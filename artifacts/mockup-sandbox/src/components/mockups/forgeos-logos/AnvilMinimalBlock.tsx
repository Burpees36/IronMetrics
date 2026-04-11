export function AnvilMinimalBlock() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Anvil Variation 3 — Minimal Block</p>

        <div className="flex items-center gap-4">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="10" fill="#0f172a" />
            <rect x="8" y="30" width="32" height="6" rx="1" fill="#f97316" />
            <rect x="12" y="20" width="24" height="10" rx="2" fill="#64748b" />
            <path d="M18 20V14L24 8L30 14V20" fill="#94a3b8" />
            <rect x="8" y="36" width="32" height="4" rx="1" fill="#ea580c" />
          </svg>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-1px", color: "#0f172a", lineHeight: 1 }}>
              forge<span style={{ color: "#f97316" }}>os</span>
            </span>
          </div>
        </div>

        <div className="flex gap-6 items-start mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">App Store Icon</p>
            <div style={{ width: 120, height: 120, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#0f172a" />
                <rect x="16" y="70" width="88" height="14" rx="3" fill="#f97316" />
                <rect x="24" y="44" width="72" height="26" rx="4" fill="#64748b" />
                <path d="M42 44V30L60 14L78 30V44" fill="#94a3b8" />
                <rect x="16" y="84" width="88" height="10" rx="3" fill="#ea580c" />
                <circle cx="60" cy="58" r="4" fill="#0f172a" opacity="0.2" />
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
                  <rect x="16" y="70" width="88" height="14" rx="3" fill="#f97316" />
                  <rect x="24" y="44" width="72" height="26" rx="4" fill="#64748b" />
                  <path d="M42 44V30L60 14L78 30V44" fill="#94a3b8" />
                  <rect x="16" y="84" width="88" height="10" rx="3" fill="#ea580c" />
                </svg>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: "hidden" }}>
                <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <rect x="16" y="68" width="88" height="16" rx="3" fill="#f97316" />
                  <rect x="22" y="42" width="76" height="26" rx="4" fill="#64748b" />
                  <path d="M44 42V30L60 16L76 30V42" fill="#94a3b8" />
                  <rect x="16" y="84" width="88" height="12" rx="3" fill="#ea580c" />
                </svg>
              </div>
              <div style={{ width: 29, height: 29, borderRadius: 6, overflow: "hidden" }}>
                <svg width="29" height="29" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <rect x="14" y="66" width="92" height="18" rx="3" fill="#f97316" />
                  <rect x="20" y="40" width="80" height="26" rx="4" fill="#64748b" />
                  <path d="M44 40V28L60 14L76 28V40" fill="#94a3b8" />
                  <rect x="14" y="84" width="92" height="14" rx="3" fill="#ea580c" />
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
