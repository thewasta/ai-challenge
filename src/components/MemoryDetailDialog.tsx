"use client";

import { CalendarClock, FolderOpen, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemoryDetailDialogProps {
  children: React.ReactElement;
  content: string;
  createdAtLabel: string;
  projectName: string;
  title: string;
  topicLabel: string;
  onDeleteRequest: () => void;
}

export function MemoryDetailDialog({
  children,
  content,
  createdAtLabel,
  projectName,
  title,
  topicLabel,
  onDeleteRequest,
}: MemoryDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Revisa el contenido completo de esta memoria antes de volver al listado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            <Tag aria-hidden="true" data-icon="inline-start" />
            {topicLabel}
          </Badge>
          <Badge variant="outline">
            <FolderOpen aria-hidden="true" data-icon="inline-start" />
            {projectName}
          </Badge>
          <Badge variant="outline">
            <CalendarClock aria-hidden="true" data-icon="inline-start" />
            {createdAtLabel}
          </Badge>
        </div>

        <ScrollArea className="max-h-[70vh] rounded-lg border bg-muted/20 p-4">
          <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{content}</div>
        </ScrollArea>

        <DialogFooter>
          <button
            aria-label={`Eliminar memoria: ${title}`}
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={onDeleteRequest}
          >
            Eliminar memoria
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
