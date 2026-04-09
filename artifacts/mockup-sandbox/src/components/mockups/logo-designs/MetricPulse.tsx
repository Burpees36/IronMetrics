export function MetricPulse() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="27" stroke="#0f172a" strokeWidth="2" />
              <circle cx="28" cy="28" r="22" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M10 28H18L22 18L28 38L34 22L38 28H46" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="28" cy="28" r="3" fill="#3b82f6" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 700,
              fontSize: "26px",
              letterSpacing: "1px",
              color: "#0f172a",
              lineHeight: 1,
            }}>
              iron<span style={{ color: "#3b82f6" }}>metrics</span>
            </span>
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 400,
              fontSize: "10px",
              letterSpacing: "3px",
              color: "#94a3b8",
              textTransform: "uppercase",
              marginTop: "4px",
            }}>
              fitness intelligence
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Metric Pulse — Modern & Data-Forward</p>

        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="44" height="44" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="27" stroke="#0f172a" strokeWidth="2" />
              <path d="M10 28H18L22 18L28 38L34 22L38 28H46" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="28" cy="28" r="3" fill="#3b82f6" />
            </svg>
            <span className="text-[10px] text-slate-400">Icon only</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="27" stroke="#60a5fa" strokeWidth="2" />
              <path d="M10 28H18L22 18L28 38L34 22L38 28H46" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="28" cy="28" r="3" fill="#60a5fa" />
            </svg>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: "16px", color: "white", letterSpacing: "0.5px" }}>
              iron<span style={{ color: "#60a5fa" }}>metrics</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
