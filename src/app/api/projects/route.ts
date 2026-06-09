import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats, projects } from "@/db/schema";
import { getProjectsWithChats } from "@/lib/db-helpers";

export async function GET() {
  const rows = await getProjectsWithChats();
  return NextResponse.json(rows);
}

export async function POST() {
  const count = await db.$count(projects);
  const n = count + 1;
  const today = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [project] = await db
    .insert(projects)
    .values({
      name: `Proyecto #${n} — ${today}`,
      description: "",
      buyerPersona: "",
      competitors: "",
      brandContext: "{}",
    })
    .returning();

  const [chat] = await db
    .insert(chats)
    .values({
      projectId: project.id,
      title: "Chat #1",
    })
    .returning();

  return NextResponse.json({ project, chat }, { status: 201 });
}
