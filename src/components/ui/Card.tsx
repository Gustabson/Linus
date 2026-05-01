import { cn } from "@/lib/utils";

/* ── Card base ─────────────────────────────────────────────────────────────── */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove default padding */
  noPadding?: boolean;
}

export function Card({ className, noPadding, children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "bg-surface border border-border rounded-2xl",
        !noPadding && "p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── SectionCard — Card con título y descripción ───────────────────────────── */
interface SectionCardProps {
  title:       string;
  description?: string;
  children:    React.ReactNode;
  className?:  string;
  action?:     React.ReactNode;
}

export function SectionCard({ title, description, children, className, action }: SectionCardProps) {
  return (
    <Card className={cn("space-y-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">{title}</h2>
          {description && (
            <p className="text-sm text-text-muted mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/* ── Divider de sección ─────────────────────────────────────────────────────── */
export function CardDivider({ className }: { className?: string }) {
  return <hr className={cn("border-border", className)} />;
}
