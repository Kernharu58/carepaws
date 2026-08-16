import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

function FieldWrapper({ label, htmlFor, error, hint, required, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-status-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && (
        <p className="text-xs text-status-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, required, className = "", ...rest }: InputProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} required={required}>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${error ? "border-status-danger" : "border-gray-300"} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, hint, id, required, options, placeholder, className = "", ...rest }: SelectProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} required={required}>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`rounded-lg border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${error ? "border-status-danger" : "border-gray-300"} ${className}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export { FieldWrapper };
