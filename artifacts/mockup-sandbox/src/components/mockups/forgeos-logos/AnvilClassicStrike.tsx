export function AnvilClassicStrike() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] text-slate-400 tracking-widest uppercase font-medium">Anvil Variation 1 — Classic Strike</p>

        <div className="flex items-center gap-4">
          <svg width="56" height="52" viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 32H48L52 40H4L8 32Z" fill="#0f172a" />
            <path d="M6 40H50V44C50 46.2 48.2 48 46 48H10C7.8 48 6 46.2 6 44V40Z" fill="#1e293b" />
            <path d="M12 32V22C12 20 14 18 16 18H40C42 18 44 20 44 22V32H12Z" fill="#475569" />
            <rect x="14" y="18" width="28" height="4" rx="1" fill="#64748b" />
            <path d="M22 18V10L28 4L34 10V18" stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="10" x2="40" y2="10" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
            <circle cx="28" cy="10" r="2.5" fill="#f97316" />
          </svg>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "-0.5px", color: "#0f172a", lineHeight: 1 }}>
              FORGE<span style={{ color: "#f97316" }}>OS</span>
            </span>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 400, fontSize: "10px", letterSpacing: "3px", color: "#94a3b8", textTransform: "uppercase", marginTop: "3px" }}>
              Gym Operating System
            </span>
          </div>
        </div>

        <div className="flex gap-6 items-start mt-2">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">App Store Icon</p>
            <div style={{ width: 120, height: 120, borderRadius: 26, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <rect width="120" height="120" fill="#0f172a" />
                <path d="M20 72H100L106 86H14L20 72Z" fill="#334155" />
                <path d="M16 86H104V94C104 97 101 100 98 100H22C19 100 16 97 16 94V86Z" fill="#475569" />
                <path d="M26 72V52C26 49 29 46 32 46H88C91 46 94 49 94 52V72H26Z" fill="#64748b" />
                <rect x="28" y="46" width="64" height="6" rx="2" fill="#94a3b8" />
                <path d="M46 46V32L60 18L74 32V46" stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="34" y1="32" x2="86" y2="32" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                <circle cx="60" cy="32" r="5" fill="#fbbf24" />
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
                  <path d="M20 72H100L106 86H14L20 72Z" fill="#334155" />
                  <path d="M16 86H104V94C104 97 101 100 98 100H22C19 100 16 97 16 94V86Z" fill="#475569" />
                  <path d="M26 72V52C26 49 29 46 32 46H88C91 46 94 49 94 52V72H26Z" fill="#64748b" />
                  <path d="M46 46V32L60 18L74 32V46" stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="60" cy="32" r="5" fill="#fbbf24" />
                </svg>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 9, overflow: "hidden" }}>
                <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M22 74H98L104 88H16L22 74Z" fill="#334155" />
                  <path d="M18 88H102V96C102 98 100 100 98 100H22C20 100 18 98 18 96V88Z" fill="#475569" />
                  <path d="M28 74V52C28 50 30 48 32 48H88C90 48 92 50 92 52V74H28Z" fill="#64748b" />
                  <path d="M48 48V34L60 22L72 34V48" stroke="#f97316" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <circle cx="60" cy="34" r="6" fill="#fbbf24" />
                </svg>
              </div>
              <div style={{ width: 29, height: 29, borderRadius: 6, overflow: "hidden" }}>
                <svg width="29" height="29" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" fill="#0f172a" />
                  <path d="M20 74H100L106 90H14L20 74Z" fill="#475569" />
                  <path d="M16 90H104V100H16V90Z" fill="#64748b" />
                  <path d="M28 74V50H92V74H28Z" fill="#64748b" />
                  <path d="M48 50V36L60 24L72 36V50" stroke="#f97316" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <circle cx="60" cy="36" r="7" fill="#fbbf24" />
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
