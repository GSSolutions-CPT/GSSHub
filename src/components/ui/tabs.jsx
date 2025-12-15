import React, { createContext, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const ctx = useMemo(
    () => ({
      value: currentValue,
      setValue: (nextValue) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
    }),
    [currentValue, onValueChange, value]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function useTabsContext(component) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tabs>`);
  }
  return context;
}

export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef(
  ({ className, value, ...props }, ref) => {
    const { value: activeValue, setValue } = useTabsContext('TabsTrigger');
    const isActive = activeValue === value;
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive && "bg-background text-foreground shadow-sm",
          className
        )}
        aria-selected={isActive}
        onClick={() => setValue(value)}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef(
  ({ className, value, hidden: hiddenProp, ...props }, ref) => {
    const { value: activeValue } = useTabsContext('TabsContent');
    const hidden = hiddenProp ?? activeValue !== value;
    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        hidden={hidden}
        style={hidden ? { display: 'none' } : undefined}
        role="tabpanel"
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';

