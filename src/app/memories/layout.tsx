import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getProjectsWithChats } from "@/lib/db-helpers";

export default async function MemoriesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const projects = await getProjectsWithChats();

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar currentChatId={0} currentProjectId={0} projects={projects} />
      <SidebarInset>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground"
        >
          Saltar al contenido principal
        </a>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="truncate text-sm font-medium text-muted-foreground">Memorias</span>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
