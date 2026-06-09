"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";

export function ChatArea() {
  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

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

      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
          Ocurrió un error al comunicarse con el asistente.
        </div>
      )}
    </div>
  );
}
