import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef(
  (
    {
      className,
      checked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked);
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : internalChecked;

    useEffect(() => {
      if (isControlled) {
        setInternalChecked(checked);
      }
    }, [checked, isControlled]);

    const toggle = () => {
      if (disabled) return;
      const nextValue = !isChecked;
      if (!isControlled) {
        setInternalChecked(nextValue);
      }
      onCheckedChange?.(nextValue);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(isChecked)}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-primary" : "bg-input",
          className
        )}
        onClick={toggle}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
            isChecked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";

