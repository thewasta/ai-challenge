"use client";

import { useState } from "react";
import { MemoryCard, type MemoryCardItem } from "@/components/MemoryCard";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteMemoryAction } from "@/app/memories/actions";
import { Brain } from "lucide-react";

interface ProjectMemoriesListProps {
  initialMemories: MemoryCardItem[];
  projectId: number;
  projectName: string;
}

export function ProjectMemoriesList({
  initialMemories,
  projectId,
  projectName,
}: ProjectMemoriesListProps) {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [memories, setMemories] = useState(initialMemories);

  const handleDelete = async (memory: MemoryCardItem) => {
    const previousMemories = memories;
    setAnnouncement(null);
    setMemories((currentMemories) => currentMemories.filter((item) => item.id !== memory.id));

    try {
      await deleteMemoryAction(memory.id, projectId);
      setAnnouncement(`Memoria eliminada: ${memory.title}`);
    } catch (error) {
      setMemories(previousMemories);
      setAnnouncement(null);
      throw error;
    }
  };

  if (memories.length === 0) {
    return (
      <>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Brain aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No hay memorias para este proyecto</EmptyTitle>
            <EmptyDescription>
              Cuando guardes nuevas memorias en {projectName}, van a aparecer listadas acá.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <p aria-live="polite" className="sr-only" role="status">
          {announcement}
        </p>
      </>
    );
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1 rounded-xl border">
        <section aria-label={`Memorias del proyecto ${projectName}`} className="grid gap-4 p-4">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onDelete={handleDelete}
              projectName={projectName}
            />
          ))}
        </section>
      </ScrollArea>

      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </>
  );
}
