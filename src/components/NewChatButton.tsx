"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

interface NewChatButtonProps {
  projectId: number;
}

export function NewChatButton({ projectId }: NewChatButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chats`, {
        method: "POST",
      });
      const chat = await res.json();
      router.push(`/projects/${projectId}/chats/${chat.id}`);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <SidebarMenuButton
      onClick={handleCreate}
      disabled={isLoading}
      className="text-muted-foreground text-xs"
    >
      {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
      <span>Nuevo chat</span>
    </SidebarMenuButton>
  );
}
