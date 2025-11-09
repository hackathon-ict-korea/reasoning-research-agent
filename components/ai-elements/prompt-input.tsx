"use client";

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaperclipIcon, SendIcon, XIcon } from "lucide-react";
import { nanoid } from "nanoid";

export type PromptInputMessage = {
  text: string;
  files?: File[];
};

type AttachmentFile = {
  id: string;
  file: File;
  preview?: string;
};

type PromptInputContextType = {
  textInput: {
    input: string;
    setInput: (value: string) => void;
    clear: () => void;
  };
  attachments: {
    files: AttachmentFile[];
    add: (files: File[]) => void;
    remove: (id: string) => void;
    clear: () => void;
  };
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

const PromptInputContext = createContext<PromptInputContextType | null>(null);

export const usePromptInputController = () => {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error(
      "usePromptInputController must be used within PromptInputProvider"
    );
  }
  return context;
};

export const PromptInputProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contextValue: PromptInputContextType = {
    textInput: {
      input,
      setInput,
      clear: () => setInput(""),
    },
    attachments: {
      files,
      add: (newFiles: File[]) => {
        const attachments = newFiles.map((file) => ({
          id: nanoid(),
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
        }));
        setFiles((prev) => [...prev, ...attachments]);
      },
      remove: (id: string) => {
        setFiles((prev) => {
          const attachment = prev.find((a) => a.id === id);
          if (attachment?.preview) {
            URL.revokeObjectURL(attachment.preview);
          }
          return prev.filter((a) => a.id !== id);
        });
      },
      clear: () => {
        files.forEach((attachment) => {
          if (attachment.preview) {
            URL.revokeObjectURL(attachment.preview);
          }
        });
        setFiles([]);
      },
    },
    fileInputRef,
  };

  return (
    <PromptInputContext.Provider value={contextValue}>
      {children}
    </PromptInputContext.Provider>
  );
};

export type PromptInputProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit: (message: PromptInputMessage) => void;
  globalDrop?: boolean;
  multiple?: boolean;
};

export const PromptInput = ({
  onSubmit,
  globalDrop = false,
  multiple = false,
  className,
  children,
  ...props
}: PromptInputProps) => {
  const controller = usePromptInputController();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const message: PromptInputMessage = {
      text: controller.textInput.input,
      files: controller.attachments.files.map((a) => a.file),
    };
    
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }
    
    onSubmit(message);
    
    // Clear inputs after submit
    controller.textInput.clear();
    controller.attachments.clear();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      controller.attachments.add(droppedFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <form
      className={cn("relative w-full", className)}
      onDragOver={globalDrop ? handleDragOver : undefined}
      onDrop={globalDrop ? handleDrop : undefined}
      onSubmit={handleSubmit}
      {...props}
    >
      <input
        ref={controller.fileInputRef}
        accept="image/*,application/pdf,.pdf"
        className="hidden"
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files) {
            controller.attachments.add(Array.from(e.target.files));
          }
        }}
        type="file"
      />
      {children}
    </form>
  );
};

export type PromptInputAttachmentsProps = {
  children: (attachment: AttachmentFile) => React.ReactNode;
};

export const PromptInputAttachments = ({
  children,
}: PromptInputAttachmentsProps) => {
  const controller = usePromptInputController();

  if (controller.attachments.files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {controller.attachments.files.map((attachment) => children(attachment))}
    </div>
  );
};

export type PromptInputAttachmentProps = {
  data: AttachmentFile;
  className?: string;
};

export const PromptInputAttachment = ({
  data,
  className,
}: PromptInputAttachmentProps) => {
  const controller = usePromptInputController();
  const isImage = data.file.type.startsWith("image/");
  const isPDF = data.file.type === "application/pdf";

  return (
    <div
      className={cn(
        "group relative size-20 overflow-hidden rounded-lg border bg-muted",
        className
      )}
      title={data.file.name}
    >
      {isImage && data.preview ? (
        <img
          alt={data.file.name}
          className="size-full object-cover"
          src={data.preview}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 p-2">
          <PaperclipIcon className="size-6 text-muted-foreground" />
          {isPDF && (
            <span className="text-[10px] font-medium text-muted-foreground">PDF</span>
          )}
        </div>
      )}
      <Button
        aria-label="Remove attachment"
        className="absolute top-1 right-1 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100"
        onClick={() => controller.attachments.remove(data.id)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
};

export const PromptInputBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2",
        className
      )}
      {...props}
    />
  );
};

export const PromptInputTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onChange, value: controlledValue, ...props }, ref) => {
  const controller = usePromptInputController();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textareaRef.current!);

  const value = controlledValue ?? controller.textInput.input;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    controller.textInput.setInput(e.target.value);
    onChange?.(e);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        className
      )}
      onChange={handleChange}
      rows={1}
      value={value}
      {...props}
    />
  );
});
PromptInputTextarea.displayName = "PromptInputTextarea";

export const PromptInputFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 px-3 pb-2", className)}
      {...props}
    />
  );
};

export const PromptInputTools = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn("flex items-center gap-1", className)} {...props} />;
};

export const PromptInputButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn("h-8 gap-1.5 text-xs", className)}
      size="sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children}
    </Button>
  );
});
PromptInputButton.displayName = "PromptInputButton";

export const PromptInputActionMenu = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            open,
            onOpenChange: setOpen,
          });
        }
        return child;
      })}
    </div>
  );
};

export const PromptInputActionMenuTrigger = ({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  return (
    <PromptInputButton onClick={() => onOpenChange?.(!open)}>
      <PaperclipIcon className="size-4" />
    </PromptInputButton>
  );
};

export const PromptInputActionMenuContent = ({
  children,
  open,
}: {
  children: React.ReactNode;
  open?: boolean;
}) => {
  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 rounded-lg border bg-popover p-2 shadow-md">
      {children}
    </div>
  );
};

export const PromptInputActionAddAttachments = () => {
  const controller = usePromptInputController();

  const handleClick = () => {
    controller.fileInputRef?.current?.click();
  };

  return (
    <button
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
      onClick={handleClick}
      type="button"
    >
      <PaperclipIcon className="size-4" />
      <span>Add attachments</span>
    </button>
  );
};

export const PromptInputSpeechButton = ({
  textareaRef,
}: {
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  return null; // Speech functionality not implemented
};

export type PromptInputSubmitProps = {
  status?: "ready" | "submitted" | "streaming" | "error";
  className?: string;
};

export const PromptInputSubmit = ({
  status = "ready",
  className,
}: PromptInputSubmitProps) => {
  const isLoading = status === "submitted" || status === "streaming";

  return (
    <Button
      className={cn("h-8 w-8 shrink-0", className)}
      disabled={isLoading}
      size="icon-sm"
      type="submit"
    >
      <SendIcon className="size-4" />
      <span className="sr-only">Send message</span>
    </Button>
  );
};

