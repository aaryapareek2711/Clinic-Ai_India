import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white border-transparent",
        primary: "bg-forest-600 text-white border-transparent",
        secondary: "bg-slate-100 text-slate-900 border-transparent hover:bg-slate-200",
        success: "bg-emerald-100 text-emerald-900 border-transparent",
        warning: "bg-amber-100 text-amber-900 border-transparent",
        danger: "bg-red-100 text-red-900 border-transparent",
        info: "bg-blue-100 text-blue-900 border-transparent",
        outline: "bg-transparent text-slate-700 border border-slate-300",
      },
      size: {
        sm: "h-5 px-2 text-xs",
        base: "h-6 px-2.5 text-xs",
        lg: "h-7 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "base",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

function Badge({
  className,
  variant,
  size,
  dismissible,
  onDismiss,
  children,
  ...props
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          aria-label="Remove badge"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };
