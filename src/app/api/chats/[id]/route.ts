import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats, messages } from "@/db/schema";

interface ChatDetailsResponse {
  chat: {
    id: number;
    projectId: number;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: UIMessage[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const chatId = Number(id);

    // Validate chatId is a number
    if (Number.isNaN(chatId)) {
      return NextResponse.json<ErrorResponse>(
        { error: "Chat ID debe ser un número" },
        { status: 400 },
      );
    }

    // Fetch chat metadata
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return NextResponse.json<ErrorResponse>({ error: "Chat no encontrado" }, { status: 404 });
    }

    // Fetch messages for this chat, ordered by creation time
    const messageRows = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    // Parse messageData JSON for each message
    const parsedMessages: UIMessage[] = messageRows.map((row) => {
      try {
        const data =
          typeof row.messageData === "string" ? JSON.parse(row.messageData) : row.messageData;
        return data as UIMessage;
      } catch (err) {
        console.error(`Failed to parse messageData for message ${row.id}:`, err);
        // Return a minimal valid UIMessage as fallback
        return {
          id: row.id,
          role: "assistant" as const,
          content: "",
          parts: [{ type: "text" as const, text: "[Error al cargar mensaje]" }],
        };
      }
    });

    const response: ChatDetailsResponse = {
      chat: {
        id: chat.id,
        projectId: chat.projectId,
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
      },
      messages: parsedMessages,
    };

    return NextResponse.json<ChatDetailsResponse>(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
