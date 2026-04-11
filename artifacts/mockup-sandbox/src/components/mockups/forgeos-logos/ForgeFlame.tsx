export function ForgeFlame() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <svg width="52" height="64" viewBox="0 0 52 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M26 0C26 0 8 16 8 36C8 50 16 60 26 64C36 60 44 50 44 36C44 16 26 0 26 0Z" fill="#0f172a" />
            <path d="M26 10C26 10 16 22 16 36C16 46 20 54 26 58C32 54 36 46 36 36C36 22 26 10 26 10Z" fill="#1e293b" />
            <path d="M26 20C26 20 20 28 20 36C20 42 22 48 26 52C30 48 32 42 32 36C32 28 26 20 26 20Z" fill="#f97316" />
            <path d="M26 30C26 30 23 34 23 38C23 42 24 44 26 46C28 44 29 42 29 38C29 34 26 30 26 30Z" fill="#fbbf24" />
          </svg>
          <div className="flex flex-col">
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "34px", letterSpacing: "-1px", color: "#0f172a", lineHeight: 1 }}>
              FORGE
            </span>
            <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 800, fontSize: "34px", letterSpacing: "-1px", lineHeight: 1 }}>
              <span style={{ background: "linear-gradient(135deg, #f97316, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>OS</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-2">Forge Flame — Dynamic & Powerful</p>
        <div className="flex gap-8 mt-4 items-end">
          <div className="flex flex-col items-center gap-2">
            <svg width="36" height="44" viewBox="0 0 52 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26 0C26 0 8 16 8 36C8 50 16 60 26 64C36 60 44 50 44 36C44 16 26 0 26 0Z" fill="#0f172a" />
              <path d="M26 20C26 20 20 28 20 36C20 42 22 48 26 52C30 48 32 42 32 36C32 28 26 20 26 20Z" fill="#f97316" />
              <path d="M26 30C26 30 23 34 23 38C23 42 24 44 26 46C28 44 29 42 29 38C29 34 26 30 26 30Z" fill="#fbbf24" />
            </svg>
            <span className="text-[10px] text-slate-400">Icon only</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-lg">
            <svg width="24" height="30" viewBox="0 0 52 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26 0C26 0 8 16 8 36C8 50 16 60 26 64C36 60 44 50 44 36C44 16 26 0 26 0Z" fill="#334155" />
              <path d="M26 20C26 20 20 28 20 36C20 42 22 48 26 52C30 48 32 42 32 36C32 28 26 20 26 20Z" fill="#f97316" />
              <path d="M26 30C26 30 23 34 23 38C23 42 24 44 26 46C28 44 29 42 29 38C29 34 26 30 26 30Z" fill="#fbbf24" />
            </svg>
            <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: "16px", color: "white", letterSpacing: "-0.5px" }}>
              FORGE<span style={{ color: "#f97316" }}>OS</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
