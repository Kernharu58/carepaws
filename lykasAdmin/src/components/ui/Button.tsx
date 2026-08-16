import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-primary",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-primary",
};

export function Button({ variant = "primary", isLoading, disabled, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
        transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
