import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const BASE =
  "w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary transition-colors";

/* ── Input ─────────────────────────────────────────────────────────────────── */
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <input ref={ref} {...props} className={cn(BASE, className)} />
));
Input.displayName = "Input";

/* ── Textarea ───────────────────────────────────────────────────────────────── */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <textarea ref={ref} {...props} className={cn(BASE, "resize-none", className)} />
));
Textarea.displayName = "Textarea";

/* ── Field wrapper (label + input + hint) ───────────────────────────────────── */
interface FieldProps {
  label:     string;
  hint?:     string;
  error?:    string;
  children:  React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-text">{label}</label>
      {children}
      {hint  && !error && <p className="text-xs text-text-subtle">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
