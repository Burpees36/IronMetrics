export function AnvilModernFlat() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Anvil Variation 2 — Modern Flat</p>

        <div className="flex items-center gap-4">
          <div style={{ width: 52, height: 52, background: "#0f172a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 22H30V26C30 27.1 29.1 28 28 28H6C4.9 28 4 27.1 4 26V22Z" fill="#f97316" />
              <rect x="6" y="14" width="22" height="8" rx="2" fill="#cbd5e1" />
              <path d="M12 14V8L17 3L22 8V14" fill="#94a3b8" />
              <circle cx="17" cy="8" r="2" fill="#f97316" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "1px", color: "#0f172a", lineHeight: 1 }}>
              FORGE
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-[2px] w-4 bg-orange-500 rounded-full" />
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: "14px", letterSpacing: "4px", color: "#f97316", lineHeight: 1 }}>OS</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">App Store Icon</p>
            <div style={{ width: 120, height: 120, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#0f172a" />
                <path d="M18 72H102V82C102 85 99 88 96 88H24C21 88 18 85 18 82V72Z" fill="#f97316" />
                <rect x="22" y="50" width="76" height="22" rx="4" fill="#cbd5e1" />
                <path d="M42 50V34L60 18L78 34V50" fill="#94a3b8" />
                <circle cx="60" cy="34" r="7" fill="#f97316" />
                <path d="M18 88H102V94C102 97 99 100 96 100H24C21 100 18 97 18 94V88Z" fill="#ea580c" />
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
                  <path d="M18 72H102V82C102 85 99 88 96 88H24C21 88 18 85 18 82V72Z" fill="#f97316" />
                  <rect x="22" y="50" width="76" height="22" rx="4" fill="#cbd5e1" />
                  <path d="M42 50V34L60 18L78 34V50" fill="#94a3b8" />
                  <circle cx="60" cy="34" r="7" fill="#f97316" />
                  <path d="M18 88H102V94C102 97 99 100 96 100H24C21 100 18 97 18 94V88Z" fill="#ea580c" />
                </svg>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: "hidden" }}>
                <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M18 72H102V84C102 88 99 90 96 90H24C21 90 18 88 18 84V72Z" fill="#f97316" />
                  <rect x="24" y="50" width="72" height="22" rx="4" fill="#cbd5e1" />
                  <path d="M44 50V34L60 20L76 34V50" fill="#94a3b8" />
                  <circle cx="60" cy="34" r="8" fill="#f97316" />
                  <path d="M18 90H102V98C102 100 100 102 96 102H24C20 102 18 100 18 98V90Z" fill="#ea580c" />
                </svg>
              </div>
              <div style={{ width: 29, height: 29, borderRadius: 6, overflow: "hidden" }}>
                <svg width="29" height="29" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M16 70H104V86H16V70Z" fill="#f97316" />
                  <rect x="22" y="48" width="76" height="22" rx="4" fill="#cbd5e1" />
                  <path d="M44 48V34L60 20L76 34V48" fill="#94a3b8" />
                  <circle cx="60" cy="34" r="9" fill="#f97316" />
                  <path d="M16 86H104V100H16V86Z" fill="#ea580c" />
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
