import type { TextareaHTMLAttributes } from "react";
import { FieldWrapper } from "./FormUI";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextArea({ label, error, hint, id, required, className = "", rows = 4, ...rest }: TextAreaProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} required={required}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
          ${error ? "border-status-danger" : "border-gray-300"} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
}
