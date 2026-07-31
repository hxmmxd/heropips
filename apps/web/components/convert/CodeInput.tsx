"use client";

import * as React from "react";
import styles from "@/app/(marketing)/early-access/early-access.module.css";

/* =========================================================================
 * CodeInput — a one-time-code field rendered as N single-character boxes.
 *
 * The value is a plain left-packed digit string (no holes); the boxes are a
 * presentation detail. Everything people expect from an OTP field is here:
 *   - type a digit → advance; Backspace → delete and step back
 *   - arrows / Home / End move between boxes; clicking past the end lands on
 *     the first empty box, which keeps the string hole-free
 *   - paste anywhere fills from the start (digits only, extras dropped)
 *   - autocomplete="one-time-code" on box 0 so OS/browser autofill lands
 *   - onComplete fires once the last digit arrives — no submit tap needed
 * ======================================================================= */

type Props = {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (value: string) => void;
  length: number;
  disabled?: boolean;
  invalid?: boolean;
  /** id of the first box, so a <label htmlFor> can target the group. */
  id: string;
  label: string;
  describedBy?: string;
  autoFocus?: boolean;
};

export function CodeInput({
  value,
  onChange,
  onComplete,
  length,
  disabled = false,
  invalid = false,
  id,
  label,
  describedBy,
  autoFocus = false,
}: Props) {
  const boxes = React.useRef<Array<HTMLInputElement | null>>([]);
  const announced = React.useRef<string | null>(null);

  // Fire onComplete once per distinct full value, after commit, so the caller
  // can submit without racing its own setState.
  React.useEffect(() => {
    if (value.length < length) {
      announced.current = null;
      return;
    }
    if (announced.current === value) return;
    announced.current = value;
    onComplete?.(value);
  }, [value, length, onComplete]);

  React.useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus();
  }, [autoFocus]);

  function focusBox(i: number) {
    const el = boxes.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  /** Splice `digits` in at `index`, keeping the string left-packed. */
  function write(index: number, digits: string) {
    const at = Math.min(index, value.length);
    const next = (value.slice(0, at) + digits + value.slice(at + digits.length)).slice(0, length);
    onChange(next);
    focusBox(at + digits.length);
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 0) {
      onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    // A browser autofilling the whole code lands as one long value on box 0.
    write(index, digits.length > 1 ? digits.slice(0, length) : digits);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Backspace": {
        e.preventDefault();
        const cut = (value[index] ?? "") === "" ? index - 1 : index;
        if (cut < 0) return;
        onChange(value.slice(0, cut) + value.slice(cut + 1));
        focusBox(cut);
        return;
      }
      case "ArrowLeft":
        e.preventDefault();
        focusBox(index - 1);
        return;
      case "ArrowRight":
        e.preventDefault();
        focusBox(Math.min(index + 1, value.length));
        return;
      case "Home":
        e.preventDefault();
        focusBox(0);
        return;
      case "End":
        e.preventDefault();
        focusBox(value.length);
        return;
      default:
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (digits.length === 0) return;
    e.preventDefault();
    // A pasted full code always starts at the beginning, wherever it was dropped.
    write(digits.length >= length ? 0 : index, digits.slice(0, length));
  }

  /**
   * Clicking a box past the end is harmless: write() clamps the insert point
   * to value.length, so the digit still lands in the first empty box and the
   * string stays hole-free. Redirecting focus here instead would re-enter
   * focus() from inside a focus event, which fights the step-forward.
   */
  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  return (
    <div
      className={styles.codeRow}
      data-invalid={invalid ? "true" : undefined}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          id={i === 0 ? id : `${id}-${i}`}
          className={styles.codeBox}
          data-filled={(value[i] ?? "") !== "" ? "true" : undefined}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={handleFocus}
        />
      ))}
    </div>
  );
}
