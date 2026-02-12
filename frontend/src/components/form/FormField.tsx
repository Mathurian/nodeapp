import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormFieldWrapperProps } from './types';

export function FormField({ name, label, description, required, children }: FormFieldWrapperProps) {
  const { formState: { errors } } = useFormContext();

  // Support nested field names like "address.city"
  const errorMessage = name.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors as unknown);

  const error = errorMessage && typeof errorMessage === 'object' && 'message' in errorMessage
    ? String((errorMessage as { message: unknown }).message)
    : undefined;

  const descriptionId = description ? `${name}-description` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>

      <div
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      >
        {children}
      </div>

      {description && (
        <p id={descriptionId} className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
