import { cn } from "@/lib/utils";
import { initials, sigilGradient } from "@/lib/utils";

/**
 * Identity sigil — a deterministic gradient tile seeded from an id, with the
 * entity's initials. Gives every agent and user a stable visual fingerprint.
 */
export function Sigil({
  seed,
  name,
  size = "md",
  className,
  ring,
}: {
  seed: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}) {
  const sizes = {
    xs: "h-6 w-6 text-[9px] rounded-md",
    sm: "h-8 w-8 text-[10px] rounded-lg",
    md: "h-10 w-10 text-xs rounded-lg",
    lg: "h-12 w-12 text-sm rounded-xl",
    xl: "h-16 w-16 text-lg rounded-2xl",
  };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-display font-semibold text-white shadow-inner",
        sizes[size],
        ring && "ring-2 ring-base",
        className
      )}
      style={{ background: sigilGradient(seed) }}
      aria-hidden
    >
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">{initials(name)}</span>
    </span>
  );
}
