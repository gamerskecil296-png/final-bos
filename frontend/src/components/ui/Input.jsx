import React from 'react';

/**
 * Input — Form input standar
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Border: 1px solid var(--theme-border)
 * - Background: var(--theme-bg)
 * - Text: var(--theme-text)
 * - Focus: border var(--theme-primary), ring var(--theme-primary) 15%
 * - Placeholder: var(--theme-text-muted)
 * - Radius: rounded-xl
 */
export default function Input({
  label,
  error,
  helper,
  className = '',
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          className="text-sm font-medium block"
          style={{ color: 'var(--theme-text)' }}
        >
          {label}
          {props.required && (
            <span style={{ color: 'var(--theme-error)' }}> *</span>
          )}
        </label>
      )}
      <input
        className="w-full px-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
        style={{
          border: `1px solid ${error ? 'var(--theme-error)' : 'var(--theme-border)'}`,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--theme-primary)';
          e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-primary) 15%, transparent)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--theme-error)' : 'var(--theme-border)';
          e.target.style.boxShadow = 'none';
        }}
        placeholder={props.placeholder}
        {...props}
      />
      {error && (
        <p className="text-xs" style={{ color: 'var(--theme-error)' }}>
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {helper}
        </p>
      )}
    </div>
  );
}

export { Input };