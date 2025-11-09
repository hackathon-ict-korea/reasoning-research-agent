"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, type ComponentProps } from "react";

export type ShimmerProps = ComponentProps<"div"> & {
  duration?: number;
};

export const Shimmer = ({
  className,
  duration = 2,
  children,
  ...props
}: ShimmerProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [duration]);

  if (showContent) {
    return <div {...props}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    >
      <span className="invisible">{children}</span>
    </div>
  );
};
