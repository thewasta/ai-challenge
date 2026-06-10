"use client";

import type { UIMessage } from "ai";
import { Bot } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: UIMessage;
}

function MarkdownImage({ alt, ...props }: ComponentPropsWithoutRef<"img">) {
  const resolvedAlt = alt?.trim() ? alt : "Imagen generada por el asistente";

  return <img alt={resolvedAlt} {...props} />;
}

const markdownComponents = {
  img: MarkdownImage,
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
          <Bot aria-hidden="true" className="size-4 text-primary-foreground" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.parts.map((part, i) => {
          const partKey = `${message.id}-${i}`;
          if (part.type === "text") {
            return isUser ? (
              <p key={partKey} className="whitespace-pre-wrap break-words">
                {part.text}
              </p>
            ) : (
              <div
                key={partKey}
                className="prose prose-sm dark:prose-invert max-w-none
                  [&_table]:w-full [&_table]:border-collapse
                  [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold
                  [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
                  [&_pre]:bg-zinc-950 [&_pre]:text-zinc-50 [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:overflow-x-auto
                  [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
                  [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                  [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic
                  [&_a]:text-primary [&_a]:underline"
              >
                <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                  {part.text}
                </ReactMarkdown>
              </div>
            );
          }
          if (part.type === "tool-load_skill" || part.type === "tool-delegate_to_subagent") {
            // Tool parts are handled visually by AgentStatusBanner.
            // We render nothing inline to avoid clutter.
            return null;
          }
          return null;
        })}
      </div>
    </div>
  );
}
