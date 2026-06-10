"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";

interface ChatAreaProps {
  chatId: number;
}

export function ChatArea({ chatId }: ChatAreaProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Persistence is handled server-side by the /api/chat route.
  // The client only sends the last message; the server loads history,
  // streams the response, and saves everything via onFinish.
  const { messages, status, sendMessage, error } = useChat({
    id: String(chatId),
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // Only send the last message + chat id to the server.
      // The server loads previous messages from the database.
      prepareSendMessagesRequest({ messages: allMessages, id }) {
        return {
          body: {
            messages: allMessages,
            chatId: Number(id),
          },
        };
      },
    }),
  });

  // Load persisted messages on mount
  useEffect(() => {
    async function loadChatHistory() {
      try {
        setIsLoadingHistory(true);
        setLoadError(null);
        const response = await fetch(`/api/chats/${chatId}`);
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Error al cargar el historial");
        }
        const data = (await response.json()) as { messages: UIMessage[] };
        setInitialMessages(data.messages);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        setLoadError(message);
        console.error("Error loading chat history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadChatHistory();
  }, [chatId]);

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] items-center justify-center">
        <MessageSquare className="size-12 mb-4 stroke-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <MessageSquare className="size-16 mb-4 stroke-1" />
              <p className="text-lg font-medium">Escribe tu primer mensaje</p>
              <p className="text-sm mt-1">para comenzar la consultoría de SEO</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <ChatInput
          onSend={(text) => sendMessage({ text })}
          disabled={status !== "ready"}
          status={status}
        />
      </div>

      {loadError && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
          {loadError}
        </div>
      )}

      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
          Ocurrió un error al comunicarse con el asistente.
        </div>
      )}
    </div>
  );
}
