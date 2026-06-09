import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats, projects } from "@/db/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const chatCount = await db.$count(chats, eq(chats.projectId, projectId));
  const n = chatCount + 1;

  const [chat] = await db
    .insert(chats)
    .values({
      projectId,
      title: `Chat #${n}`,
    })
    .returning();

  return NextResponse.json(chat, { status: 201 });
}
