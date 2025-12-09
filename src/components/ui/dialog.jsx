import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const DialogContext = createContext(null);

export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const ctx = useMemo(
    () => ({
      open: isOpen,
      setOpen: (nextState) => {
        if (open === undefined) {
          setInternalOpen(nextState);
        }
        onOpenChange?.(nextState);
      },
    }),
    [isOpen, onOpenChange, open]
  );

  return (
    <DialogContext.Provider value={ctx}>
      <div className="relative z-50" {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  );
}

function useDialogContext(component) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used within <Dialog>`);
  }
  return context;
}

export const DialogTrigger = React.forwardRef(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { setOpen } = useDialogContext('DialogTrigger');

    const triggerProps = {
      ref,
      onClick: (event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(true);
        }
      },
      ...props,
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...triggerProps,
        className: cn(children.props.className, props.className),
      });
    }

    return (
      <button type="button" {...triggerProps}>
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

export const DialogContent = React.forwardRef(
  ({ className, children, onPointerDownOutside, ...props }, ref) => {
    const { open, setOpen } = useDialogContext('DialogContent');

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          setOpen(false);
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, setOpen]);

    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onPointerDownOutside?.(event);
            if (!event.defaultPrevented) {
              setOpen(false);
            }
          }
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
));
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
));
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
DialogDescription.displayName = 'DialogDescription';

