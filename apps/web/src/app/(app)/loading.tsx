export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full w-full">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute w-16 h-16 border-4 border-primary/20 rounded-full animate-pulse" />
        {/* Inner spinning ring */}
        <div className="absolute w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        {/* Icon */}
        <span className="material-symbols-outlined text-primary text-xl relative z-10 animate-pulse">
          hourglass_empty
        </span>
      </div>
      <p className="mt-6 text-sm font-semibold text-muted-foreground animate-pulse tracking-widest uppercase">
        Loading Workspace...
      </p>
    </div>
  );
}
