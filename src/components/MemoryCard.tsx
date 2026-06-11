"use client";

import { CalendarClock, Tag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MemoryDetailDialog } from "@/components/MemoryDetailDialog";

export interface MemoryCardItem {
  id: number;
  title: string;
  topic: string;
  topicLabel: string;
  preview: string;
  content: string;
  createdAt: string;
}

interface MemoryCardProps {
  memory: MemoryCardItem;
  onDelete: (memory: MemoryCardItem) => Promise<void>;
  projectName: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getDeletePreview(memory: MemoryCardItem) {
  const source = memory.title.trim().length > 0 ? memory.title : memory.preview;
  return source.length > 100 ? `${source.slice(0, 100)}…` : source;
}

export function MemoryCard({ memory, onDelete, projectName }: MemoryCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createdAtLabel, setCreatedAtLabel] = useState("Cargando fecha...");

  useEffect(() => {
    setCreatedAtLabel(dateFormatter.format(new Date(memory.createdAt)));
  }, [memory.createdAt]);

  const deletePreview = useMemo(() => getDeletePreview(memory), [memory]);

  const requestDelete = () => {
    setErrorMessage(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await onDelete(memory);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo eliminar la memoria. Intentá de nuevo.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <article aria-labelledby={`memory-card-${memory.id}`} className="[content-visibility:auto]">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    <Tag aria-hidden="true" data-icon="inline-start" />
                    {memory.topicLabel}
                  </Badge>
                  <Badge variant="outline">
                    <CalendarClock aria-hidden="true" data-icon="inline-start" />
                    <span suppressHydrationWarning>{createdAtLabel}</span>
                  </Badge>
                </div>
                <h2 id={`memory-card-${memory.id}`} className="text-base font-medium leading-snug">
                  {memory.title}
                </h2>
              </div>

              <Button
                aria-label={`Eliminar memoria: ${memory.title}`}
                disabled={isDeleting}
                onClick={requestDelete}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <MemoryDetailDialog
              content={memory.content}
              createdAtLabel={createdAtLabel}
              onDeleteRequest={requestDelete}
              projectName={projectName}
              title={memory.title}
              topicLabel={memory.topicLabel}
            >
              <button
                type="button"
                className="flex w-full min-h-11 rounded-lg border border-border/70 bg-background p-4 text-left text-sm leading-6 text-muted-foreground transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onKeyDown={(event) => {
                  if (event.key === "Delete") {
                    event.preventDefault();
                    requestDelete();
                  }
                }}
              >
                {memory.preview}
              </button>
            </MemoryDetailDialog>

            {errorMessage ? (
              <p aria-live="polite" className="text-sm text-destructive" role="status">
                {errorMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </article>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Eliminar memoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la memoria “{deletePreview}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={confirmDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
