import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full border border-line-700 bg-ink-900 px-3 py-2 text-sm text-cream-100 placeholder:text-cream-500 focus-visible:border-sage-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full border border-line-700 bg-ink-900 px-3 py-2 text-sm text-cream-100 placeholder:text-cream-500 focus-visible:border-sage-500",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full border border-line-700 bg-ink-900 px-3 text-sm text-cream-100 focus-visible:border-sage-500",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
