"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TooltipContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} | null>(null);

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipTrigger must be used within a Tooltip");
  }

  const { setIsOpen } = context;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipContent must be used within a Tooltip");
  }

  const { isOpen } = context;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

