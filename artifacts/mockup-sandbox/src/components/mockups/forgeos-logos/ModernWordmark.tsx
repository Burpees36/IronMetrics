export function ModernWordmark() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-0">
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 300,
              fontSize: "42px",
              letterSpacing: "8px",
              color: "#0f172a",
              lineHeight: 1,
              textTransform: "uppercase",
            }}>
              Forge
            </span>
            <span style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 800,
              fontSize: "42px",
              letterSpacing: "8px",
              lineHeight: 1,
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              OS
            </span>
          </div>
          <div className="w-full max-w-[280px] h-[3px] mt-2 rounded-full" style={{ background: "linear-gradient(90deg, #0f172a, #f97316, #fbbf24)" }} />
          <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 400, fontSize: "10px", letterSpacing: "6px", color: "#94a3b8", textTransform: "uppercase", marginTop: "8px" }}>
            Fitness Platform
          </span>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Modern Wordmark — Clean & Premium</p>
        <div className="flex gap-10 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center">
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 300, fontSize: "20px", letterSpacing: "4px", color: "#0f172a", textTransform: "uppercase" }}>
                Forge
              </span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "20px", letterSpacing: "4px", textTransform: "uppercase", color: "#f97316" }}>
                OS
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Compact</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-slate-900 px-5 py-3 rounded-lg">
            <div className="flex items-center">
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 300, fontSize: "18px", letterSpacing: "4px", color: "white", textTransform: "uppercase" }}>
                Forge
              </span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "18px", letterSpacing: "4px", textTransform: "uppercase", color: "#fb923c" }}>
                OS
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Dark variant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
