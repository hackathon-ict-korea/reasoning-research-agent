"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

type ModelSelectorContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const ModelSelectorContext = React.createContext<ModelSelectorContextType | null>(
  null
);

const useModelSelector = () => {
  const context = React.useContext(ModelSelectorContext);
  if (!context) {
    throw new Error("useModelSelector must be used within ModelSelector");
  }
  return context;
};

export type ModelSelectorProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ModelSelector = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: ModelSelectorProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const contextValue: ModelSelectorContextType = {
    open,
    setOpen,
    searchQuery,
    setSearchQuery,
  };

  return (
    <ModelSelectorContext.Provider value={contextValue}>
      <div className="relative">{children}</div>
    </ModelSelectorContext.Provider>
  );
};

export const ModelSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  const { setOpen } = useModelSelector();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ...props,
      ref,
      onClick: (e: React.MouseEvent) => {
        setOpen(true);
        child.props.onClick?.(e);
      },
    });
  }

  return (
    <button ref={ref} onClick={() => setOpen(true)} type="button" {...props}>
      {children}
    </button>
  );
});
ModelSelectorTrigger.displayName = "ModelSelectorTrigger";

export const ModelSelectorContent = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { open, setOpen } = useModelSelector();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border bg-popover p-2 shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
};

export const ModelSelectorInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const { searchQuery, setSearchQuery } = useModelSelector();

  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
        className
      )}
      onChange={(e) => setSearchQuery(e.target.value)}
      type="text"
      value={searchQuery}
      {...props}
    />
  );
});
ModelSelectorInput.displayName = "ModelSelectorInput";

export const ModelSelectorList = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("mt-2 max-h-80 overflow-y-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const ModelSelectorEmpty = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "py-6 text-center text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const ModelSelectorGroup = ({
  heading,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { heading?: string }) => {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {heading && (
        <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
          {heading}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
};

export const ModelSelectorItem = ({
  children,
  value,
  onSelect,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  onSelect?: () => void;
}) => {
  const { setOpen } = useModelSelector();

  const handleClick = () => {
    onSelect?.();
    setOpen(false);
  };

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent",
        className
      )}
      onClick={handleClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
};

const PROVIDER_LOGOS: Record<string, string> = {
  openai: "🤖",
  anthropic: "🔮",
  google: "🔍",
  azure: "☁️",
  "amazon-bedrock": "🪨",
};

export const ModelSelectorLogo = ({
  provider,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { provider: string }) => {
  const logo = PROVIDER_LOGOS[provider] || "🤖";

  return (
    <span
      className={cn("flex size-5 items-center justify-center text-sm", className)}
      {...props}
    >
      {logo}
    </span>
  );
};

export const ModelSelectorLogoGroup = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
};

export const ModelSelectorName = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn("flex-1 text-left", className)} {...props}>
      {children}
    </span>
  );
};

