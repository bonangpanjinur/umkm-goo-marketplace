import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
    "text-xs font-semibold leading-none",
    "transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80",

        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70",

        destructive:
          "border-transparent bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/18",

        outline:
          "border border-border text-foreground bg-transparent hover:bg-accent",

        success:
          "border-transparent bg-success/12 text-success border border-success/25 hover:bg-success/18",

        warning:
          "border-transparent bg-warning/12 text-warning-foreground border border-warning/25 hover:bg-warning/18",

        info:
          "border-transparent bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400 hover:bg-blue-500/15",

        accent:
          "border-transparent bg-accent text-accent-foreground hover:bg-accent/80",

        muted:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",

        gradient:
          "border-transparent bg-gradient-primary text-white shadow-primary",

        premium:
          "border-transparent bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
