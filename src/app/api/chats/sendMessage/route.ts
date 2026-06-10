import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats, messages } from "@/db/schema";

interface SendMessageRequest {
  chatId: number;
  message: UIMessage;
}

interface SendMessageResponse {
  success: true;
  messageId: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function POST(req: Request) {
  try {
    const body: SendMessageRequest = await req.json();

    // Validate required fields
    if (typeof body.chatId !== "number" || Number.isNaN(body.chatId)) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "chatId debe ser un número" },
        { status: 400 },
      );
    }

    if (!body.message || typeof body.message !== "object") {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "message es requerido" },
        { status: 400 },
      );
    }

    if (!body.message.id || typeof body.message.id !== "string") {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "message.id es requerido" },
        { status: 400 },
      );
    }

    if (
      !body.message.role ||
      !["user", "assistant", "system", "tool"].includes(body.message.role)
    ) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "message.role es requerido" },
        { status: 400 },
      );
    }

    // Verify chat exists
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, body.chatId),
    });

    if (!chat) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: "Chat no encontrado" },
        { status: 404 },
      );
    }

    // Serialize message to JSON
    const serializedMessage = JSON.stringify(body.message);

    // Use UPSERT: insert or update if message.id already exists
    await db
      .insert(messages)
      .values({
        id: body.message.id,
        chatId: body.chatId,
        messageData: serializedMessage,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          messageData: serializedMessage,
        },
      });

    return NextResponse.json<SendMessageResponse>(
      { success: true, messageId: body.message.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json<ErrorResponse>(
      { success: false, error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
