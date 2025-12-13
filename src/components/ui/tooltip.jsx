import * as React from "react"

const TooltipProvider = ({ children }) => <>{children}</>

const Tooltip = ({ children }) => {
  return <>{children}</>
}

const TooltipTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ref, ...props });
  }
  return <span ref={ref} {...props}>{children}</span>;
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, side = "top", children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`absolute z-50 overflow-hidden rounded-md bg-horizon-dark border border-horizon px-3 py-1.5 text-sm text-horizon-text shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${
        side === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
        side === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
        side === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
        'left-full ml-2 top-1/2 -translate-y-1/2'
      } ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";

// Enhanced Tooltip that actually works with hover
const TooltipWrapper = ({ children }) => {
  const [triggerElement, contentElement] = React.Children.toArray(children);
  
  return (
    <div className="relative inline-block group">
      {triggerElement}
      {contentElement}
    </div>
  );
};

// Override Tooltip to use wrapper
const EnhancedTooltip = ({ children }) => {
  return <TooltipWrapper>{children}</TooltipWrapper>;
};

export { EnhancedTooltip as Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }