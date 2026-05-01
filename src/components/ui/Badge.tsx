import { cn } from "@/lib/utils";

type Variant = "green" | "gray" | "amber" | "red" | "blue";

const VARIANTS: Record<Variant, string> = {
  green: "bg-green-50  text-green-700 dark:bg-green-900/30 dark:text-green-400",
  gray:  "bg-border-subtle text-text-muted",
  amber: "bg-amber-50  text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  red:   "bg-red-50    text-red-600   dark:bg-red-900/30   dark:text-red-400",
  blue:  "bg-blue-50   text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",
};

interface Props {
  variant?:  Variant;
  className?: string;
  children:  React.ReactNode;
}

export function Badge({ variant = "gray", className, children }: Props) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
      VARIANTS[variant],
      className,
    )}>
      {children}
    </span>
  );
}
