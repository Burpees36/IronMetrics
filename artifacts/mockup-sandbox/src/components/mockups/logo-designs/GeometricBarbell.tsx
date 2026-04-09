export function GeometricBarbell() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <svg width="72" height="48" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="10" width="14" height="28" rx="3" fill="#0f172a" />
            <rect x="16" y="14" width="8" height="20" rx="2" fill="#1e293b" />
            <rect x="26" y="20" width="20" height="8" rx="1" fill="#3b82f6" />
            <rect x="48" y="14" width="8" height="20" rx="2" fill="#1e293b" />
            <rect x="58" y="10" width="14" height="28" rx="3" fill="#0f172a" />
            <circle cx="36" cy="24" r="6" fill="white" stroke="#3b82f6" strokeWidth="2" />
            <path d="M33 24L35 26L39 22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, fontSize: "30px", letterSpacing: "3px", color: "#0f172a", lineHeight: 1 }}>
              IRON
            </span>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 400, fontSize: "30px", letterSpacing: "3px", color: "#3b82f6", lineHeight: 1 }}>
              METRICS
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Geometric Barbell — Bold & Athletic</p>
        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="48" height="32" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="10" width="14" height="28" rx="3" fill="#0f172a" />
              <rect x="16" y="14" width="8" height="20" rx="2" fill="#1e293b" />
              <rect x="26" y="20" width="20" height="8" rx="1" fill="#3b82f6" />
              <rect x="48" y="14" width="8" height="20" rx="2" fill="#1e293b" />
              <rect x="58" y="10" width="14" height="28" rx="3" fill="#0f172a" />
              <circle cx="36" cy="24" r="6" fill="white" stroke="#3b82f6" strokeWidth="2" />
              <path d="M33 24L35 26L39 22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] text-slate-400">Icon only</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="36" height="24" viewBox="0 0 72 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="10" width="14" height="28" rx="3" fill="#60a5fa" />
              <rect x="16" y="14" width="8" height="20" rx="2" fill="#3b82f6" />
              <rect x="26" y="20" width="20" height="8" rx="1" fill="#93c5fd" />
              <rect x="48" y="14" width="8" height="20" rx="2" fill="#3b82f6" />
              <rect x="58" y="10" width="14" height="28" rx="3" fill="#60a5fa" />
            </svg>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "16px", color: "white", letterSpacing: "2px" }}>
              IRONMETRICS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
