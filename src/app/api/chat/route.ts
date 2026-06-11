import type { UIMessage } from "ai";
import { createAgentUIStreamResponse, createIdGenerator, type InferAgentUIMessage } from "ai";
import {
  createOrchestratorAgent,
  dataforseoAgent,
  ONBOARDING_COMPLETE_DIRECTIVE,
  ONBOARDING_INCOMPLETE_DIRECTIVE,
} from "@/agents/tools";
import type { MemorySearchResult } from "@/db/schema";
import {
  getChat,
  getMessagesByChat,
  getProject,
  isProjectProfileComplete,
  saveMessage,
  searchMemoriesFTS,
} from "@/lib/db-helpers";

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

export function formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
  if (memories.length === 0) return "";

  return memories
    .map(
      (memory, index) =>
        `## Memoria ${index + 1}: ${memory.title} (topic: ${memory.topic})\n${memory.content}`,
    )
    .join("\n\n---\n\n");
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

  // ── Normal orchestration path ──
  const chat = await getChat(chatId);

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const project = await getProject(chat.projectId);
  const onboardingDirective = isProjectProfileComplete(project)
    ? ONBOARDING_COMPLETE_DIRECTIVE
    : ONBOARDING_INCOMPLETE_DIRECTIVE;

  console.log(`Project ID: ${chat.projectId}`);
  const retrievedMemories = formatMemoriesForPrompt(
    searchMemoriesFTS(chat.projectId, lastUserText, 3),
  );

  const orchestratorAgent = createOrchestratorAgent(chat.projectId, {
    retrievedMemories,
    onboardingDirective,
  });

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
