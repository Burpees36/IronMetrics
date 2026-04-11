export function StackedIndustrial() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="56" height="56" rx="12" fill="#0f172a" />
              <rect x="12" y="16" width="6" height="24" rx="1.5" fill="#3b82f6" />
              <rect x="21" y="22" width="6" height="18" rx="1.5" fill="#60a5fa" />
              <rect x="30" y="12" width="6" height="28" rx="1.5" fill="#3b82f6" />
              <rect x="39" y="18" width="6" height="22" rx="1.5" fill="#60a5fa" />
              <path d="M15 38L24 30L33 34L42 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col items-center mt-3">
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              fontSize: "32px",
              letterSpacing: "8px",
              color: "#0f172a",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}>
              IRON
            </span>
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              letterSpacing: "10px",
              color: "#3b82f6",
              lineHeight: 1,
              textTransform: "uppercase",
              marginTop: "2px",
            }}>
              METRICS
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Stacked Industrial — Strong & Data-Driven</p>

        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="56" height="56" rx="12" fill="#0f172a" />
              <rect x="12" y="16" width="6" height="24" rx="1.5" fill="#3b82f6" />
              <rect x="21" y="22" width="6" height="18" rx="1.5" fill="#60a5fa" />
              <rect x="30" y="12" width="6" height="28" rx="1.5" fill="#3b82f6" />
              <rect x="39" y="18" width="6" height="22" rx="1.5" fill="#60a5fa" />
              <path d="M15 38L24 30L33 34L42 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] text-slate-400">App icon</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="56" height="56" rx="12" fill="#3b82f6" />
              <rect x="12" y="16" width="6" height="24" rx="1.5" fill="white" opacity="0.9" />
              <rect x="21" y="22" width="6" height="18" rx="1.5" fill="white" opacity="0.7" />
              <rect x="30" y="12" width="6" height="28" rx="1.5" fill="white" opacity="0.9" />
              <rect x="39" y="18" width="6" height="22" rx="1.5" fill="white" opacity="0.7" />
              <path d="M15 38L24 30L33 34L42 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex flex-col">
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 900, fontSize: "14px", color: "white", letterSpacing: "4px" }}>IRON</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 400, fontSize: "8px", color: "#93c5fd", letterSpacing: "5px" }}>METRICS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
