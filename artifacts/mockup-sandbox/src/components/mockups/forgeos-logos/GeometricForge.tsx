export function GeometricForge() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30 2L56 16V44L30 58L4 44V16L30 2Z" fill="#0f172a" />
            <path d="M30 8L50 18V42L30 52L10 42V18L30 8Z" fill="#1e293b" />
            <path d="M30 18L20 24V36L30 42L40 36V24L30 18Z" fill="#f97316" />
            <path d="M30 24L25 27V33L30 36L35 33V27L30 24Z" fill="#fbbf24" />
            <path d="M30 8V18M10 18L20 24M50 18L40 24M10 42L20 36M50 42L40 36M30 52V42" stroke="#334155" strokeWidth="0.5" opacity="0.4" />
          </svg>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 700, fontSize: "30px", letterSpacing: "2px", color: "#0f172a", lineHeight: 1 }}>
              FORGE
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-[2px] rounded-full" style={{ background: "#f97316" }} />
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600, fontSize: "16px", letterSpacing: "4px", color: "#f97316", lineHeight: 1 }}>
                OS
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Geometric Forge — Precise & Technical</p>
        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="44" height="44" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 2L56 16V44L30 58L4 44V16L30 2Z" fill="#0f172a" />
              <path d="M30 18L20 24V36L30 42L40 36V24L30 18Z" fill="#f97316" />
              <path d="M30 24L25 27V33L30 36L35 33V27L30 24Z" fill="#fbbf24" />
            </svg>
            <span className="text-[10px] text-slate-400">Icon only</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="28" height="28" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 2L56 16V44L30 58L4 44V16L30 2Z" fill="#334155" />
              <path d="M30 18L20 24V36L30 42L40 36V24L30 18Z" fill="#f97316" />
              <path d="M30 24L25 27V33L30 36L35 33V27L30 24Z" fill="#fbbf24" />
            </svg>
            <div className="flex flex-col">
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: "14px", color: "white", letterSpacing: "2px" }}>FORGE</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600, fontSize: "9px", color: "#fb923c", letterSpacing: "3px" }}>OS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
