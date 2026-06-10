"use client";

import { Loader2, Send } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  status: string;
}

export function ChatInput({ onSend, disabled, status }: ChatInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="mx-auto flex max-w-3xl items-end gap-2">
      <label htmlFor="chat-input" className="sr-only">
        Escribe tu mensaje (Shift+Enter para nueva línea)
      </label>
      <textarea
        id="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu mensaje..."
        disabled={disabled}
        rows={3}
        className={cn(
          "flex min-h-24 w-full flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-70 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
        )}
      />
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        size="icon"
        className="disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <Send aria-hidden="true" />
        )}
        <span className="sr-only">{isLoading ? "Enviando..." : "Enviar mensaje"}</span>
      </Button>
    </div>
  );
}
