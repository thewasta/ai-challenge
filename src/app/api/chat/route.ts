import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, createIdGenerator, streamText, type UIMessage } from "ai";
import { getMessagesByChat, saveMessage } from "@/lib/db-helpers";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, chatId }: { messages: UIMessage[]; chatId: number } = await req.json();

  // Load previous messages from the database
  const previousMessages = await getMessagesByChat(chatId);

  // Merge: previous messages + new client messages (deduped by id)
  const existingIds = new Set(previousMessages.map((m) => m.id));
  const newMessages = messages.filter((m) => !existingIds.has(m.id));
  const allMessages = [...previousMessages, ...newMessages];

  const result = streamText({
    model: openai("gpt-4.1-nano"),
    messages: await convertToModelMessages(allMessages),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: allMessages,
    // Server-side ID generation for persistence consistency
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    onFinish: async ({ messages: finalMessages }) => {
      // Persist ALL messages server-side (UPSERT by message.id ensures idempotency)
      for (const msg of finalMessages) {
        await saveMessage(chatId, msg);
      }
    },
  });
}
