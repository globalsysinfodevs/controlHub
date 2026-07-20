import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-lg border border-line-strong bg-base/60 px-3.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-brand-400 focus:bg-base focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:opacity-50";

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between">
      <span className="text-xs font-medium text-ink-muted">{children}</span>
      {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }>(
  function Input({ className, icon, ...props }, ref) {
    if (icon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            {icon}
          </span>
          <input ref={ref} className={cn(baseField, "h-10 pl-9", className)} {...props} />
        </div>
      );
    }
    return <input ref={ref} className={cn(baseField, "h-10", className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(baseField, "min-h-[96px] py-2.5 leading-relaxed", className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(baseField, "h-10 cursor-pointer appearance-none bg-[length:0]", className)}
        {...props}
      >
        {children}
      </select>
    );
  }
);
