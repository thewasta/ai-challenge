import type { UIMessage } from "ai";
import { createAgentUIStreamResponse, createIdGenerator, type InferAgentUIMessage } from "ai";
import { dataforseoAgent, orchestratorAgent, subAgent } from "@/agents/tools";
import { getMessagesByChat, saveMessage } from "@/lib/db-helpers";

export const maxDuration = 60;

/** Extracts the last user text from the messages array */
function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const textPart = messages[i].parts.find((p) => p.type === "text");
    if (messages[i].role === "user" && textPart) {
      return (textPart as { text: string }).text;
    }
  }
  return "";
}

export async function POST(req: Request) {
  const { messages, chatId }: { messages: UIMessage[]; chatId: number } = await req.json();

  // Load previous messages from the database
  const previousMessages = await getMessagesByChat(chatId);

  // Merge: previous messages + new client messages (deduped by id)
  const existingIds = new Set(previousMessages.map((m) => m.id));
  const newMessages = messages.filter((m) => !existingIds.has(m.id));
  const allMessages = [...previousMessages, ...newMessages];

  const generateId = createIdGenerator({ prefix: "msg", size: 16 });

  // ── [DELEGATE] pre-processing ──
  // gpt-4.1-nano is a small model that doesn't reliably follow tool-calling
  // instructions. We intercept [DELEGATE] before it reaches the LLM and call
  // the sub-agent directly for a robust, deterministic delegation path.
  const lastUserText = getLastUserText(allMessages);

  const dataforseoMatch = /^\[delegate:dataforseo\]\s*/i.exec(lastUserText.trim());
  if (dataforseoMatch) {
    const task = lastUserText.trim().slice(dataforseoMatch[0].length);

    const result = await dataforseoAgent.stream({
      prompt:
        task || "Analiza la palabra clave más genérica del nicho y genera un plan SEO básico.",
    });

    return result.toUIMessageStreamResponse({
      originalMessages: allMessages,
      generateMessageId: generateId,
      onFinish: async ({ messages: finalMessages }) => {
        for (const msg of finalMessages) {
          await saveMessage(chatId, msg);
        }
      },
    });
  }

  const delegateMatch = /^\[delegate\]\s*/i.exec(lastUserText.trim());

  if (delegateMatch) {
    const task = lastUserText.trim().slice(delegateMatch[0].length);

    const result = await subAgent.stream({
      prompt: task || "Responde al saludo del usuario de manera amable.",
    });

    return result.toUIMessageStreamResponse({
      originalMessages: allMessages,
      generateMessageId: generateId,
      onFinish: async ({ messages: finalMessages }) => {
        for (const msg of finalMessages) {
          await saveMessage(chatId, msg);
        }
      },
    });
  }

  // ── Normal orchestration path ──
  const typedMessages = allMessages as InferAgentUIMessage<typeof orchestratorAgent>[];

  return createAgentUIStreamResponse({
    agent: orchestratorAgent,
    uiMessages: typedMessages,
    originalMessages: typedMessages,
    generateMessageId: generateId,
    onFinish: async ({ messages: finalMessages }) => {
      for (const msg of finalMessages) {
        await saveMessage(chatId, msg);
      }
    },
  });
}
