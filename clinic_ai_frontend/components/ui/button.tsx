import * as React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'base',
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base classes for all buttons
    const baseClasses = "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    // Variant classes
    const variantClasses = {
      primary: "bg-forest-600 text-white hover:bg-forest-700 shadow-sm hover:shadow-md",
      secondary: "border-2 border-forest-600 text-forest-600 bg-white hover:bg-forest-50",
      ghost: "text-forest-600 hover:bg-forest-50 hover:text-forest-700",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md",
      success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md",
      outline: "border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400",
    };

    // Size classes
    const sizeClasses = {
      xs: "h-7 px-2 text-xs gap-1",
      sm: "h-9 px-3 text-sm gap-1.5",
      base: "h-11 px-4 text-base gap-2",
      lg: "h-[52px] px-6 text-lg gap-2",
      xl: "h-[60px] px-8 text-xl gap-2.5",
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && leftIcon && <span className="inline-flex">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
