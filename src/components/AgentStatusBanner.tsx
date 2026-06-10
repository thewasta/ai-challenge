"use client";

interface AgentStatusBannerProps {
  /** Current activity description, or null when idle */
  activity: string | null;
}

export function AgentStatusBanner({ activity }: AgentStatusBannerProps) {
  if (!activity) return null;

  return (
    <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
      <span
        className="inline-block size-2 rounded-full bg-emerald-500 motion-safe:animate-pulse motion-reduce:opacity-60"
        aria-hidden="true"
      />
      <span>{activity}</span>
    </div>
  );
}
