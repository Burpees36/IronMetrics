export function MonogramShield() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width="64" height="72" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 0L62 12V36C62 54 48 66 32 72C16 66 2 54 2 36V12L32 0Z" fill="#0f172a" />
              <path d="M32 4L58 14.5V36C58 52 45.5 63 32 68.5C18.5 63 6 52 6 36V14.5L32 4Z" fill="#1e293b" />
              <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="32" fill="white" letterSpacing="-1">IM</text>
            </svg>
          </div>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px", color: "#0f172a", lineHeight: 1 }}>
              IRON
            </span>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px", color: "#3b82f6", lineHeight: 1 }}>
              METRICS
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Monogram Shield — Premium & Trustworthy</p>
        <div className="flex gap-8 mt-4">
          <div className="flex items-center gap-3">
            <svg width="40" height="45" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 0L62 12V36C62 54 48 66 32 72C16 66 2 54 2 36V12L32 0Z" fill="#0f172a" />
              <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="32" fill="white" letterSpacing="-1">IM</text>
            </svg>
            <span className="text-[10px] text-slate-400">Icon only</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg">
            <svg width="28" height="32" viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 0L62 12V36C62 54 48 66 32 72C16 66 2 54 2 36V12L32 0Z" fill="#3b82f6" />
              <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="32" fill="white" letterSpacing="-1">IM</text>
            </svg>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 700, fontSize: "16px", color: "white", letterSpacing: "-0.3px" }}>
              IRON<span style={{ color: "#60a5fa" }}>METRICS</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
