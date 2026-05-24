import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Deep forest green, authoritative
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        // Secondary - Charcoal black, premium
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
        // Accent - Soft gold, exclusive
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
        // Destructive
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline - Premium border style
        outline: "border border-border bg-background hover:bg-muted hover:border-foreground/20 text-foreground",
        // Ghost - Minimal
        ghost: "hover:bg-muted text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Hero - Dark/Primary for hero sections
        hero: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg font-semibold",
        // Hero outline - Transparent with border for dark backgrounds
        "hero-outline": "border border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm",
        // Premium - Gold gradient
        premium: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-premium font-semibold",
        // Elite - For top tier actions
        elite: "bg-gradient-to-r from-accent via-gold-light to-accent text-accent-foreground hover:opacity-90 shadow-premium font-semibold",
        // Subtle - Muted actions
        subtle: "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-sm",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
