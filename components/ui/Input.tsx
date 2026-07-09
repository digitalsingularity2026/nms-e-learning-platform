import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

const base: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1.5px solid var(--border)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box",
  background: "#fff",
  color: "var(--ink-900)",
};

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--ink-500)", display: "block", marginBottom: 5, letterSpacing: "0.05em" };

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...rest }: InputProps) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <input style={{ ...base, ...style }} {...rest} />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, rows = 3, style, ...rest }: TextareaProps) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea rows={rows} style={{ ...base, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, ...style }} {...rest} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export function Select({ label, children, style, ...rest }: SelectProps) {
  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <select style={{ ...base, cursor: "pointer", ...style }} {...rest}>
        {children}
      </select>
    </div>
  );
}
