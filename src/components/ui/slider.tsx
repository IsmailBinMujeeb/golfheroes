import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow bg-line-700">
      <SliderPrimitive.Range className="absolute h-full bg-sage-500" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-4 border border-sage-500 bg-cream-100 focus-visible:ring-2 focus-visible:ring-sage-400" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
