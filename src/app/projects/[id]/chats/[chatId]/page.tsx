import { notFound } from "next/navigation";
import { ChatLayout } from "@/components/ChatLayout";
import { getProject, getProjectsWithChats } from "@/lib/db-helpers";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>;
}) {
  const { id, chatId } = await params;
  const projectId = Number(id);
  const chatIdNum = Number(chatId);

  const [projects, project] = await Promise.all([getProjectsWithChats(), getProject(projectId)]);

  if (!project) {
    notFound();
  }

  return (
    <ChatLayout
      projects={projects}
      currentProjectId={projectId}
      currentChatId={chatIdNum}
      projectName={project.name}
    />
  );
}
