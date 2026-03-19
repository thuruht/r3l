import React, { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Reusable Button Component
 * Provides consistent styling across the application
 *
 * @example
 * <Button variant="primary" size="md">Click Me</Button>
 * <Button variant="secondary">Cancel</Button>
 * <Button variant="text">Learn More</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const widthClass = fullWidth ? 'w-full' : '';
    const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

    const finalClassName = `
      ${variantClass}
      ${sizeClass}
      ${widthClass}
      ${disabledClass}
      ${className}
    `
      .split(/\s+/)
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={finalClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="anim-spin inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
