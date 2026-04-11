export function AnvilMark() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-5">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="#0f172a" />
            <path d="M16 42H48V46C48 47.1 47.1 48 46 48H18C16.9 48 16 47.1 16 46V42Z" fill="#f97316" />
            <path d="M20 42V34C20 32.9 20.9 32 22 32H42C43.1 32 44 32.9 44 34V42H20Z" fill="#cbd5e1" />
            <path d="M24 32V26L32 18L40 26V32H24Z" fill="#94a3b8" />
            <path d="M30 18H34V14C34 13.4 33.1 13 32 13C30.9 13 30 13.4 30 14V18Z" fill="#f97316" />
            <circle cx="32" cy="28" r="3" fill="#0f172a" opacity="0.3" />
          </svg>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 900, fontSize: "32px", letterSpacing: "-0.5px", color: "#0f172a", lineHeight: 1 }}>
              Forge<span style={{ color: "#f97316" }}>OS</span>
            </span>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 400, fontSize: "11px", letterSpacing: "3px", color: "#94a3b8", textTransform: "uppercase", marginTop: "4px" }}>
              Gym Operating System
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Anvil Mark — Solid & Timeless</p>
        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#0f172a" />
              <path d="M16 42H48V46C48 47.1 47.1 48 46 48H18C16.9 48 16 47.1 16 46V42Z" fill="#f97316" />
              <path d="M20 42V34C20 32.9 20.9 32 22 32H42C43.1 32 44 32.9 44 34V42H20Z" fill="#cbd5e1" />
              <path d="M24 32V26L32 18L40 26V32H24Z" fill="#94a3b8" />
              <path d="M30 18H34V14C34 13.4 33.1 13 32 13C30.9 13 30 13.4 30 14V18Z" fill="#f97316" />
            </svg>
            <span className="text-[10px] text-slate-400">Icon only</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#f97316" />
              <path d="M16 42H48V46C48 47.1 47.1 48 46 48H18C16.9 48 16 47.1 16 46V42Z" fill="white" />
              <path d="M20 42V34C20 32.9 20.9 32 22 32H42C43.1 32 44 32.9 44 34V42H20Z" fill="white" opacity="0.8" />
              <path d="M24 32V26L32 18L40 26V32H24Z" fill="white" opacity="0.6" />
              <path d="M30 18H34V14C34 13.4 33.1 13 32 13C30.9 13 30 13.4 30 14V18Z" fill="white" />
            </svg>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "16px", color: "white", letterSpacing: "-0.3px" }}>
              Forge<span style={{ color: "#fb923c" }}>OS</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
