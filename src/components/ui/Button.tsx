import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?:    Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary hover:bg-primary-h text-primary-fg font-semibold shadow-sm",
  secondary:
    "bg-surface border border-border text-text hover:bg-bg font-medium",
  ghost:
    "text-text-muted hover:bg-border-subtle hover:text-text font-medium",
  danger:
    "text-danger hover:bg-danger/10 font-medium",
};

const SIZES: Record<Size, string> = {
  sm: "text-xs px-3   py-1.5 rounded-lg  gap-1.5",
  md: "text-sm px-5   py-2.5 rounded-xl  gap-2",
  lg: "text-base px-6 py-3   rounded-xl  gap-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
