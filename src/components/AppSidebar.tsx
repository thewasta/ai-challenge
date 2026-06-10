"use client";

import { ChevronDown, Folder, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { ProjectWithChats } from "@/lib/db-helpers";
import { NewChatButton } from "./NewChatButton";
import { NewProjectButton } from "./NewProjectButton";

interface AppSidebarProps {
  projects: ProjectWithChats[];
  currentProjectId: number;
  currentChatId: number;
}

export function AppSidebar({ projects, currentProjectId, currentChatId }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/">
                  <Zap aria-hidden="true" className="size-5 text-primary" />
                  <span className="font-semibold">Consultor SEO</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <NewProjectButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {projects.map((project) => {
          const chatsPanelId = `project-${project.id}-chats`;

          return (
            <SidebarGroup key={project.id}>
              <Collapsible
                defaultOpen={project.id === currentProjectId}
                className="group/collapsible"
              >
                <SidebarGroupLabel
                  render={
                    <CollapsibleTrigger
                      aria-controls={chatsPanelId}
                      className="flex w-full cursor-pointer items-center gap-2"
                    >
                      <Folder aria-hidden="true" className="size-4" />
                      <span className="flex-1 truncate text-left">{project.name}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180"
                      />
                    </CollapsibleTrigger>
                  }
                />

                <CollapsibleContent id={chatsPanelId}>
                  <SidebarMenu>
                    {project.chats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          isActive={chat.id === currentChatId && project.id === currentProjectId}
                          render={
                            <Link href={`/projects/${project.id}/chats/${chat.id}`}>
                              <MessageSquare aria-hidden="true" className="size-4" />
                              <span>{chat.title}</span>
                            </Link>
                          }
                        />
                      </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                      <NewChatButton projectId={project.id} />
                    </SidebarMenuItem>
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <p className="text-xs text-muted-foreground px-2 py-1">MVP — Consultor SEO</p>
      </SidebarFooter>
    </Sidebar>
  );
}
