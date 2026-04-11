export function MinimalistWordmark() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-0">
          <span style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 300,
            fontSize: "38px",
            letterSpacing: "6px",
            color: "#0f172a",
            lineHeight: 1,
            textTransform: "uppercase",
          }}>
            Iron
          </span>
          <span style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 300,
            fontSize: "38px",
            letterSpacing: "6px",
            color: "#0f172a",
            lineHeight: 1,
            textTransform: "uppercase",
          }}>
            <span style={{ color: "#3b82f6", fontWeight: 600 }}>|</span>
          </span>
          <span style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            fontSize: "38px",
            letterSpacing: "6px",
            color: "#0f172a",
            lineHeight: 1,
            textTransform: "uppercase",
          }}>
            Metrics
          </span>
        </div>
        <div className="w-full max-w-[320px] h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Minimalist Wordmark — Clean & Sophisticated</p>

        <div className="flex gap-10 mt-6 items-end">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-0">
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 300, fontSize: "22px", letterSpacing: "4px", color: "#0f172a", textTransform: "uppercase" }}>
                Iron
              </span>
              <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: "22px", margin: "0 2px" }}>|</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: "22px", letterSpacing: "4px", color: "#0f172a", textTransform: "uppercase" }}>
                Metrics
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Compact</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-slate-900 px-5 py-3 rounded-lg">
            <div className="flex items-center gap-0">
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 300, fontSize: "18px", letterSpacing: "4px", color: "white", textTransform: "uppercase" }}>
                Iron
              </span>
              <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: "18px", margin: "0 2px" }}>|</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: "18px", letterSpacing: "4px", color: "white", textTransform: "uppercase" }}>
                Metrics
              </span>
            </div>
            <span className="text-[10px] text-slate-500">Dark variant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
