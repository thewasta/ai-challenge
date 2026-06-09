"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function NewProjectButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/projects", { method: "POST" });
      const { project, chat } = await res.json();
      router.push(`/projects/${project.id}/chats/${chat.id}`);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <SidebarMenuButton onClick={handleCreate} disabled={isLoading}>
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      <span>Nuevo proyecto</span>
    </SidebarMenuButton>
  );
}
