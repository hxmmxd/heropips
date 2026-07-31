import * as React from "react";

/** Label + control + hint + error slot. Pass `error` to show the inline message;
 *  wire the input's aria-describedby to `${htmlFor}-error` when erroring. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-hi)",
          letterSpacing: "var(--track-tight)",
        }}
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-mid)" }}>{hint}</div>
      ) : null}
      {error ? (
        <div
          id={`${htmlFor}-error`}
          role="alert"
          style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--loss-400)" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
