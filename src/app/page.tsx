import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/HomePageClient";
import { getLatestProjectWithChat } from "@/lib/db-helpers";

export default async function HomePage() {
  const result = await getLatestProjectWithChat();

  if (result?.chat) {
    redirect(`/projects/${result.project.id}/chats/${result.chat.id}`);
  }

  return <HomePageClient />;
}
