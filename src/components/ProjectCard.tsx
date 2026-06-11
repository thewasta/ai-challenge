"use client";

import { FolderOpen, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  id: number;
  name: string;
  memoryCount: number;
}

export function ProjectCard({ id, name, memoryCount }: ProjectCardProps) {
  const router = useRouter();

  const navigateToProject = () => {
    router.push(`/memories/${id}`);
  };

  return (
    <article aria-labelledby={`project-card-${id}`}>
      <Card
        className={cn(
          "cursor-pointer border-border/70 transition-colors motion-safe:hover:border-primary/40 motion-safe:hover:bg-muted/30",
          "focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        onClick={navigateToProject}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigateToProject();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <FolderOpen aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id={`project-card-${id}`} className="truncate text-base font-medium leading-snug">
                  {name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explorá las memorias guardadas.
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              <Hash aria-hidden="true" data-icon="inline-start" />
              {memoryCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {memoryCount === 1 ? "1 memoria disponible" : `${memoryCount} memorias disponibles`}
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
