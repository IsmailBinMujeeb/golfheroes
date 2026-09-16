import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-6 w-11 shrink-0 items-center border border-line-600 transition-colors data-[state=checked]:bg-sage-500 data-[state=unchecked]:bg-ink-900",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4 translate-x-1 bg-cream-100 transition-transform data-[state=checked]:translate-x-6" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
