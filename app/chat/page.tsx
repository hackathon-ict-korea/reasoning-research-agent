"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MessageSquareIcon } from "lucide-react";

export default function ChatPage() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport(),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const promptStatus = status === "error" ? "error" : status;

  const getMessageText = (message: any) => {
    return (
      message.parts
        ?.filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("") || ""
    );
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const parts: any[] = [];

    if (message.text.trim()) {
      parts.push({ type: "text", text: message.text });
    }

    if (message.files?.length) {
      for (const file of message.files) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        parts.push({
          type: "file",
          mimeType: file.type,
          data: base64,
          name: file.name,
        });
      }
    }

    sendMessage({
      role: "user",
      parts,
    });
  };

  return (
    <div className="flex h-screen flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-3xl">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <p className="text-sm font-medium">Error</p>
              <p className="mt-1 text-sm opacity-90">{error.message}</p>
            </div>
          )}

          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Start a conversation with AI"
              icon={<MessageSquareIcon className="size-6" />}
              title="What would you like to know?"
            />
          ) : (
            messages.map((message: any) => {
              const fileParts =
                message.parts?.filter((part: any) => part.type === "file") ||
                [];
              const messageText = getMessageText(message);
              const isStreaming =
                message.role === "assistant" &&
                status === "streaming" &&
                message.id === messages[messages.length - 1]?.id;

              return (
                <Message from={message.role} key={message.id}>
                  <div className="w-full">
                    {fileParts.length > 0 && (
                      <MessageAttachments className="mb-2">
                        {fileParts.map((filePart: any, index: number) => (
                          <MessageAttachment
                            data={{
                              type: "file",
                              url: filePart.data || filePart.url || "",
                              mediaType:
                                filePart.mimeType || filePart.contentType,
                              filename: filePart.name || `file-${index}`,
                            }}
                            key={
                              filePart.data || filePart.url || `file-${index}`
                            }
                          />
                        ))}
                      </MessageAttachments>
                    )}

                    <MessageContent>
                      {isStreaming && !messageText ? (
                        <Shimmer duration={1}>
                          <div className="h-4 w-32" />
                        </Shimmer>
                      ) : (
                        <MessageResponse>{messageText}</MessageResponse>
                      )}
                    </MessageContent>
                  </div>
                </Message>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <PromptInputProvider>
            <PromptInput globalDrop multiple onSubmit={handleSubmit}>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>

              <PromptInputBody>
                <PromptInputTextarea
                  ref={textareaRef}
                  disabled={isLoading}
                  placeholder="Type your message..."
                />
              </PromptInputBody>

              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>

                  <PromptInputSpeechButton textareaRef={textareaRef} />
                </PromptInputTools>

                <PromptInputSubmit status={promptStatus} />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
        </div>
      </div>
    </div>
  );
}
