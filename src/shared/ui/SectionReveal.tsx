import type { CSSProperties, ReactNode } from "react";

// Sections fade + slide up on mount, staggered by `index`.
// Respects prefers-reduced-motion (see globals.css).
export default function SectionReveal({
  index,
  children,
  className,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`section-reveal${className ? ` ${className}` : ""}`}
      style={{ "--section-index": index ?? 0 } as CSSProperties}
    >
      {children}
    </div>
  );
}
