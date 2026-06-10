import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatLayout } from "@/components/ChatLayout";
import { getChat, getProject, getProjectsWithChats } from "@/lib/db-helpers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>;
}): Promise<Metadata> {
  const { id, chatId } = await params;
  const projectId = Number(id);
  const chatIdNum = Number(chatId);

  if (Number.isNaN(projectId) || Number.isNaN(chatIdNum)) {
    return {
      title: "Consultor SEO",
      description: "Proyecto no encontrado.",
    };
  }

  const [project, chat] = await Promise.all([getProject(projectId), getChat(chatIdNum)]);

  if (!project) {
    return {
      title: "Consultor SEO",
      description: "Proyecto no encontrado.",
    };
  }

  if (!chat) {
    return {
      title: "Chat no encontrado — Consultor SEO",
      description: `Proyecto: ${project.name} — Chat no encontrado.`,
    };
  }

  return {
    title: `${chat.title} — Consultor SEO`,
    description: `Chat: ${chat.title} | Proyecto: ${project.name}`,
  };
}

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
