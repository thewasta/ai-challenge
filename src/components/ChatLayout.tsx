"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { ProjectWithChats } from "@/lib/db-helpers";
import { AppSidebar } from "./AppSidebar";
import { ChatArea } from "./ChatArea";

interface ChatLayoutProps {
  projects: ProjectWithChats[];
  currentProjectId: number;
  currentChatId: number;
  projectName: string;
}

export function ChatLayout({
  projects,
  currentProjectId,
  currentChatId,
  projectName,
}: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        currentChatId={currentChatId}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground truncate">{projectName}</span>
        </header>
        <ChatArea />
      </SidebarInset>
    </SidebarProvider>
  );
}
