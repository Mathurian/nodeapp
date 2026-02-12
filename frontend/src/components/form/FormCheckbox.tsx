import React from 'react';
import { useFormContext } from 'react-hook-form';

interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name: string;
  label: string;
  description?: string;
}

export function FormCheckbox({ name, label, description, className, ...rest }: FormCheckboxProps) {
  const { register, formState: { errors } } = useFormContext();

  const hasError = !!name.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors as unknown);

  const errorId = hasError ? `${name}-error` : undefined;
  const descriptionId = description ? `${name}-description` : undefined;

  return (
    <div className="flex items-start space-x-3">
      <div className="flex items-center h-5">
        <input
          id={name}
          type="checkbox"
          {...register(name)}
          {...rest}
          className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 ${className ?? ''}`}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={hasError ? 'true' : undefined}
        />
      </div>
      <div>
        <label htmlFor={name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
        {hasError && (
          <p id={errorId} className="text-xs text-red-600 dark:text-red-400" role="alert">
            {String((errors[name] as { message?: unknown })?.message ?? 'Invalid value')}
          </p>
        )}
      </div>
    </div>
  );
}
