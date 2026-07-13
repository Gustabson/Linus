import type { SVGProps } from "react";

interface LinugMarkProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

/**
 * LINUG's brand mark: an open book whose spine becomes a knowledge graph.
 * It deliberately uses currentColor so every user theme can own the mark.
 */
export function LinugMark({ title, ...props }: LinugMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}

      <path
        d="M15.98 8.25C13.14 6.05 9.54 5.05 5.5 5.54v17.42c4.04-.49 7.64.51 10.48 2.71"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.02 8.25c2.84-2.2 6.44-3.2 10.48-2.71v17.42c-4.04-.49-7.64.51-10.48 2.71"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M16 8.25v3.1M16 15.35v10.32M14.55 14.3l-3.2 2.35M17.45 14.3l3.2 2.35"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="13.35" r="1.8" fill="currentColor" />
      <circle cx="10.15" cy="17.55" r="1.25" fill="currentColor" />
      <circle cx="21.85" cy="17.55" r="1.25" fill="currentColor" />
    </svg>
  );
}
