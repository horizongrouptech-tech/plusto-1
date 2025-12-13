import * as React from "react"

// פונקציית עזר לשילוב class-ים, מוטמעת ישירות כאן
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const buttonVariants = {
  default: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-horizon-primary text-white hover:bg-horizon-primary/90 active:bg-horizon-primary shadow-md hover:shadow-lg",
  destructive: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-red/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-horizon-red text-white hover:bg-horizon-red/90 active:bg-horizon-red",
  outline: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-horizon-primary bg-transparent text-horizon-primary hover:bg-horizon-primary/10 hover:border-horizon-primary/80 active:bg-horizon-primary/20",
  secondary: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-secondary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-horizon-secondary text-white hover:bg-horizon-secondary/90 active:bg-horizon-secondary",
  ghost: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-horizon-primary/10 hover:text-horizon-primary active:bg-horizon-primary/20",
  link: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-horizon-primary underline-offset-4 hover:underline"
};

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10"
};

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const baseClasses = buttonVariants[variant] || buttonVariants.default;
  const sizeClasses = buttonSizes[size] || buttonSizes.default;
  
  const Comp = asChild ? "span" : "button";
  
  return React.createElement(Comp, {
    className: cn(baseClasses, sizeClasses, className),
    ref: ref,
    ...props
  });
});

Button.displayName = "Button";

export { Button, buttonVariants };