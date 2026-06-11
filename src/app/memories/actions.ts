"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { memories } from "@/db/schema";
import { deleteMemory } from "@/lib/db-helpers";

export async function deleteMemoryAction(memoryId: number, projectId: number): Promise<void> {
  const memory = await db.query.memories.findFirst({
    where: and(eq(memories.id, memoryId), eq(memories.projectId, projectId)),
  });

  if (!memory) {
    throw new Error("La memoria no existe o ya fue eliminada.");
  }

  await deleteMemory(memoryId);
  revalidatePath("/memories");
  revalidatePath(`/memories/${projectId}`);
}
