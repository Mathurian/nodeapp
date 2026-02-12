import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField } from './FormField';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label: string;
  options: SelectOption[];
  description?: string;
  placeholder?: string;
}

const baseSelectClass =
  'block w-full px-3 py-2 border rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 sm:text-sm transition-colors ' +
  'dark:bg-gray-700 dark:text-white dark:border-gray-600';

const normalClass = 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500';
const errorClass = 'border-red-500 focus:ring-red-500 focus:border-red-500';

export function FormSelect({
  name,
  label,
  options,
  description,
  required,
  placeholder,
  className,
  ...rest
}: FormSelectProps) {
  const { register, formState: { errors } } = useFormContext();

  const hasError = !!name.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors as unknown);

  return (
    <FormField name={name} label={label} description={description} required={required}>
      <select
        id={name}
        {...register(name)}
        {...rest}
        className={`${baseSelectClass} ${hasError ? errorClass : normalClass} ${className ?? ''}`}
        aria-invalid={hasError ? 'true' : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
