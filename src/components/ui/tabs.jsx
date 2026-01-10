import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext({
  value: '',
  onValueChange: () => {}
});

const Tabs = React.forwardRef(({ className, value, onValueChange, defaultValue, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value || '');

  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = React.useCallback((newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [value, onValueChange]);

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}>

        {children}
      </div>
    </TabsContext.Provider>);

});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef(({ className, ...props }, ref) =>
<div
  ref={ref}
  className={cn(
    "inline-flex h-12 items-center justify-center rounded-xl bg-white dark:bg-horizon-surface p-1.5 text-horizon-accent border-2 border-horizon shadow-sm",
    className
  )}
  {...props} />

);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, value: triggerValue, children, ...props }, ref) => {
  const { value: contextValue, onValueChange } = React.useContext(TabsContext);
  const isActive = contextValue === triggerValue;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => onValueChange(triggerValue)}
      className={cn(
        "px-6 py-3 text-sm font-bold rounded-lg inline-flex items-center justify-center whitespace-nowrap transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon-primary focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        isActive 
          ? "bg-gradient-to-r from-[#32acc1] to-[#83ddec] text-white shadow-lg scale-105 font-extrabold" 
          : "text-[#121725] dark:text-horizon-accent hover:bg-horizon-primary/10 hover:text-horizon-primary font-semibold",
        className
      )}
      {...props}>

      {children}
    </button>);

});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, value: contentValue, children, ...props }, ref) => {
  const { value: contextValue } = React.useContext(TabsContext);
  const isActive = contextValue === contentValue;

  if (!isActive) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        className
      )}
      {...props}>

      {children}
    </div>);

});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };