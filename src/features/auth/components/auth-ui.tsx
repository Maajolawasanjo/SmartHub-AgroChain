"use client";
import { type InputHTMLAttributes, type ReactNode, useState } from "react";

export function Field({ label, error, hint, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; id: string }) {
  const isPassword = props.type === "password";
  const [visible, setVisible] = useState(false);
  return <div className="auth-field">
    <label htmlFor={id} className="auth-label">{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    <div className="auth-input-wrap"><input id={id} {...props} type={isPassword && visible ? "text" : props.type} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className="auth-input" />
      {isPassword && <button className="auth-reveal" type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible}>{visible ? "Hide" : "Show"}</button>}
    </div>
    {error && <p id={`${id}-error`} role="alert" className="auth-field-error">{error}</p>}
    {!error && hint && <p id={`${id}-hint`} className="auth-hint">{hint}</p>}
  </div>;
}

export function ActionNotice({ children, kind = "warning" }: { children: ReactNode; kind?: "warning" | "info" | "error" }) {
  return <div className={`auth-notice auth-notice-${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function Submit({ children }: { children: ReactNode }) { return <button className="auth-submit" type="submit">{children}<span aria-hidden="true">→</span></button>; }
