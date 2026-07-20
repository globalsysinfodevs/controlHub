import { cn } from "@/lib/utils";

/** Full iAlestra wordmark (color gradient). Scales to the given CSS height. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="iAlestra"
      draggable={false}
      className={cn("w-auto select-none", className)}
    />
  );
}

/** Compact square mark (the "A" glyph) for tight spaces like the collapsed rail. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-mark.svg"
      alt="iAlestra"
      draggable={false}
      className={cn("select-none", className)}
    />
  );
}

/** Brand lockup used in the sidebar header: wordmark + product descriptor. */
export function Wordmark({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return <LogoMark className="h-8 w-8" />;
  }
  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <Logo className="h-[26px] self-start" />
      <span className="eyebrow pl-px">Control Hub</span>
    </div>
  );
}
