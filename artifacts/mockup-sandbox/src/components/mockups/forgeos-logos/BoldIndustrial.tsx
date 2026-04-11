export function BoldIndustrial() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="60" height="60" rx="6" fill="#0f172a" stroke="#f97316" strokeWidth="3" />
            <text x="32" y="30" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" fill="white" letterSpacing="-1">F</text>
            <rect x="14" y="38" width="36" height="3" rx="1.5" fill="#f97316" />
            <rect x="20" y="44" width="24" height="3" rx="1.5" fill="#f97316" opacity="0.6" />
            <rect x="26" y="50" width="12" height="3" rx="1.5" fill="#f97316" opacity="0.3" />
          </svg>
          <div className="flex flex-col">
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              fontSize: "36px",
              letterSpacing: "-1px",
              color: "#0f172a",
              lineHeight: 1,
              textTransform: "uppercase",
            }}>
              Forge
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-[3px] flex-1 rounded-full" style={{ background: "#f97316" }} />
              <span style={{
                fontFamily: "system-ui, sans-serif",
                fontWeight: 900,
                fontSize: "16px",
                letterSpacing: "6px",
                color: "#f97316",
                lineHeight: 1,
              }}>
                OS
              </span>
              <div className="h-[3px] flex-1 rounded-full" style={{ background: "#f97316" }} />
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Bold Industrial — Heavy & Commanding</p>
        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="60" height="60" rx="6" fill="#0f172a" stroke="#f97316" strokeWidth="3" />
              <text x="32" y="30" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" fill="white" letterSpacing="-1">F</text>
              <rect x="14" y="38" width="36" height="3" rx="1.5" fill="#f97316" />
              <rect x="20" y="44" width="24" height="3" rx="1.5" fill="#f97316" opacity="0.6" />
              <rect x="26" y="50" width="12" height="3" rx="1.5" fill="#f97316" opacity="0.3" />
            </svg>
            <span className="text-[10px] text-slate-400">App icon</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="60" height="60" rx="6" fill="#f97316" stroke="#fb923c" strokeWidth="2" />
              <text x="32" y="30" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" fill="white" letterSpacing="-1">F</text>
              <rect x="14" y="38" width="36" height="3" rx="1.5" fill="white" />
              <rect x="20" y="44" width="24" height="3" rx="1.5" fill="white" opacity="0.6" />
              <rect x="26" y="50" width="12" height="3" rx="1.5" fill="white" opacity="0.3" />
            </svg>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 900, fontSize: "16px", color: "white", letterSpacing: "-0.5px" }}>
              FORGE<span style={{ color: "#fb923c" }}>OS</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
