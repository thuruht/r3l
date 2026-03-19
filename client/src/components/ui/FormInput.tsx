import React, { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable Form Input Component
 * Provides consistent styling and validation states
 *
 * @example
 * <FormInput
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   hint="We'll never share your email"
 * />
 *
 * <FormInput
 *   label="Password"
 *   type="password"
 *   error="Password is too short"
 *   required
 * />
 */
const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      hint,
      error,
      required = false,
      size = 'md',
      className = '',
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const sizeClass = `input-${size}`;
    const errorClass = error ? 'border-[var(--accent-alert)]' : '';

    return (
      <div className="input-group">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="text-[var(--accent-alert)] ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`
            input-field
            ${sizeClass}
            ${errorClass}
            ${className}
          `
            .split(/\s+/)
            .filter(Boolean)
            .join(' ')}
          required={required}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {error && (
          <span id={`${inputId}-error`} className="input-error">
            {error}
          </span>
        )}

        {hint && !error && (
          <span id={`${inputId}-hint`} className="input-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
