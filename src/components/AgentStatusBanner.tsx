"use client";

interface AgentStatusBannerProps {
  /** Current activity description, or null when idle */
  activity: string | null;
}

export function AgentStatusBanner({ activity }: AgentStatusBannerProps) {
  if (!activity) return null;

  return (
    <div className="px-4 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b flex items-center gap-2">
      <span
        className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse"
        aria-hidden="true"
      />
      <span>{activity}</span>
    </div>
  );
}
