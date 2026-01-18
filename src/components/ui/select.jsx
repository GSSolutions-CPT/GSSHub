import React, {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

const SelectContext = createContext(null);

export function Select({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  children,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [selectedLabel, setSelectedLabel] = useState('');
  const rootRef = useRef(null);

  const setOpenState = useCallback(
    (nextOpen) => {
      if (open === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open]
  );

  const currentValue = value ?? internalValue;
  const isOpen = open ?? internalOpen;

  const ctx = useMemo(
    () => ({
      value: currentValue,
      setValue: (nextValue, nextLabel) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }
        setSelectedLabel(nextLabel);
        onValueChange?.(nextValue);
        setOpenState(false);
      },
      isOpen,
      toggleOpen: (nextOpen) => {
        const target = typeof nextOpen === 'boolean' ? nextOpen : !isOpen;
        setOpenState(target);
      },
      selectedLabel,
      setSelectedLabel,
      disabled,
    }),
    [
      currentValue,
      disabled,
      isOpen,
      setOpenState,
      onValueChange,
      selectedLabel,
      value,
    ]
  );

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpenState(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenState(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpenState]);

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={rootRef} className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function useSelectContext(component) {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(`${component} must be used within <Select>`);
  }
  return context;
}

export const SelectTrigger = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const { isOpen, toggleOpen, disabled } = useSelectContext('SelectTrigger');
    return (
      <button
        ref={ref}
        type='button'
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        onClick={() => !disabled && toggleOpen()}
        disabled={disabled}
        {...props}
      >
        <span className='flex-1 text-left'>{children}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export function SelectValue({ className, placeholder, children, ...props }) {
  const { value, selectedLabel } = useSelectContext('SelectValue');
  const displayValue = selectedLabel || children || '';
  const isPlaceholder = !value || displayValue.length === 0;

  return (
    <span
      className={cn(isPlaceholder && "text-muted-foreground", className)}
      {...props}
    >
      {isPlaceholder ? placeholder ?? children ?? 'Select option' : displayValue}
    </span>
  );
}

export const SelectContent = React.forwardRef(
  ({ className, children, align = 'start', ...props }, ref) => {
    const { isOpen } = useSelectContext('SelectContent');
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        role='listbox'
        data-align={align}
        className={cn(
          "absolute z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-full mt-1",
          className
        )}
        {...props}
      >
        <div className="p-1">
          {children}
        </div>
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef(
  ({ className, value, children, disabled = false, style, ...props }, ref) => {
    const { value: selectedValue, setValue, setSelectedLabel } =
      useSelectContext('SelectItem');
    const isSelected = selectedValue === value;
    const label = extractLabel(children);

    useEffect(() => {
      if (isSelected) {
        setSelectedLabel(label);
      }
    }, [isSelected, label, setSelectedLabel]);

    return (
      <div
        ref={ref}
        role='option'
        aria-selected={isSelected}
        data-disabled={disabled || undefined}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent/50",
          className
        )}
        style={
          disabled
            ? {
              opacity: 0.6,
              pointerEvents: 'none',
              ...style,
            }
            : style
        }
        onClick={() => {
          if (!disabled) {
            setValue(value, label);
          }
        }}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        <span className="truncate">{children}</span>
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

function extractLabel(children) {
  if (children === null || children === undefined) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map((item) => extractLabel(item)).join(' ').trim();
  }
  if (isValidElement(children)) {
    return Children.toArray(children.props.children)
      .map((child) => extractLabel(child))
      .join(' ')
      .trim();
  }
  return String(children);
}
