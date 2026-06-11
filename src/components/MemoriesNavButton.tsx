"use client";

import { Brain } from "lucide-react";
import Link from "next/link";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function MemoriesNavButton() {
  return (
    <SidebarMenuButton
      render={
        <Link href="/memories">
          <Brain aria-hidden="true" className="size-4" />
          <span>Memorias</span>
        </Link>
      }
    />
  );
}
