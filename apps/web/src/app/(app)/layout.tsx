export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#0F172A]">
      {/* SideNav — W3 */}
      <aside className="w-[260px] shrink-0 bg-[#1f1f27] border-r border-[#334155] flex flex-col">
        <div className="p-6 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6366F1] rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#e4e1ed]">Axiom</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#64748B] font-bold">V1.2.0-stable</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {/* Nav items — filled in W3 */}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
