import * as React from "react"
import { cva } from "class-variance-authority"

// פונקציית עזר לשילוב class-ים, מוטמעת ישירות כאן
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-horizon-primary text-white hover:bg-horizon-primary/90 active:bg-horizon-primary shadow-md hover:shadow-lg",
        destructive: "bg-horizon-red text-white hover:bg-horizon-red/90 active:bg-horizon-red",
        outline: "border border-horizon-primary bg-transparent text-horizon-primary hover:bg-horizon-primary/10 hover:border-horizon-primary/80 active:bg-horizon-primary/20",
        secondary: "bg-horizon-secondary text-white hover:bg-horizon-secondary/90 active:bg-horizon-secondary",
        ghost: "hover:bg-horizon-primary/10 hover:text-horizon-primary active:bg-horizon-primary/20",
        link: "text-horizon-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? "span" : "button";
  
  return React.createElement(Comp, {
    className: cn(buttonVariants({ variant, size, className })),
    ref: ref,
    ...props
  });
});

Button.displayName = "Button";

export { Button, buttonVariants };