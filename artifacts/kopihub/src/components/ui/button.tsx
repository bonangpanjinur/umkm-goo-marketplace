import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold",
    "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_2px_8px_oklch(0.54_0.205_162_/_0.28)]",
          "hover:bg-primary/90",
          "hover:shadow-[0_4px_16px_oklch(0.54_0.205_162_/_0.36)]",
          "hover:-translate-y-px",
        ].join(" "),

        gradient: "btn-gradient",

        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_2px_8px_oklch(0.58_0.225_25_/_0.25)]",
          "hover:bg-destructive/90 hover:-translate-y-px",
          "hover:shadow-[0_4px_14px_oklch(0.58_0.225_25_/_0.35)]",
        ].join(" "),

        outline: [
          "border-2 border-border bg-background",
          "hover:bg-accent hover:border-primary/30 hover:text-accent-foreground",
          "shadow-xs",
        ].join(" "),

        secondary: [
          "bg-secondary text-secondary-foreground",
          "shadow-xs hover:bg-secondary/70 hover:-translate-y-px",
        ].join(" "),

        ghost: [
          "hover:bg-accent hover:text-accent-foreground",
          "active:bg-accent/70",
        ].join(" "),

        soft: [
          "bg-primary/10 text-primary border border-primary/20",
          "hover:bg-primary/18 hover:border-primary/35",
        ].join(" "),

        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },

      size: {
        default: "h-10 px-5 py-2",
        sm:      "h-8 rounded-lg px-3.5 text-xs",
        lg:      "h-11 rounded-xl px-8 text-[0.9375rem]",
        xl:      "h-12 rounded-2xl px-10 text-base",
        icon:    "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
