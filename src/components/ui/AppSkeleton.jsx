const Pulse = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex flex-col h-screen w-64 flex-shrink-0 border-r border-gray-100 bg-white">
      {/* header */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <Pulse className="h-5 w-36 rounded-lg" />
      </div>
      {/* nav items */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Pulse className="w-5 h-5 rounded-lg flex-shrink-0" />
            <Pulse className="h-3.5 w-24 rounded-lg" />
          </div>
        ))}
      </nav>
      {/* footer */}
      <div className="p-3 border-t border-gray-100 space-y-3">
        <div>
          <Pulse className="h-1.5 w-full rounded-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <Pulse className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Pulse className="h-3 w-24 rounded-lg" />
            <Pulse className="h-2.5 w-16 rounded-lg" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBarSkeleton() {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <Pulse className="h-5 w-28 rounded-lg" />
      <div className="flex items-center gap-2">
        <Pulse className="w-9 h-9 rounded-xl" />
        <Pulse className="w-9 h-9 rounded-full" />
      </div>
    </header>
  );
}

function ContentSkeleton() {
  return (
    <main className="flex-1 overflow-y-auto bg-white p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      {/* greeting */}
      <div className="space-y-2">
        <Pulse className="h-6 w-48 rounded-lg" />
        <Pulse className="h-4 w-64 rounded-lg" />
      </div>

      {/* stat chips row */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-16 w-28 flex-shrink-0 rounded-2xl" />
        ))}
      </div>

      {/* section heading + cards row */}
      {Array.from({ length: 2 }).map((_, s) => (
        <div key={s} className="space-y-3">
          <Pulse className="h-4 w-36 rounded-lg" />
          <div className="flex gap-3 overflow-hidden -mx-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Pulse key={i} className="h-32 w-40 flex-shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}

function BottomNavSkeleton() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <Pulse className="w-5 h-5 rounded-lg" />
          <Pulse className="w-10 h-2 rounded" />
        </div>
      ))}
    </nav>
  );
}

export default function AppSkeleton() {
  return (
    <div className="flex h-screen bg-white text-black overflow-hidden">
      <SidebarSkeleton />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBarSkeleton />
        <ContentSkeleton />
      </div>
      <BottomNavSkeleton />
    </div>
  );
}
