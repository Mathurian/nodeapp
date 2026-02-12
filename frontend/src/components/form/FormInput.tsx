import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField } from './FormField';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  description?: string;
}

const baseInputClass =
  'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 sm:text-sm transition-colors ' +
  'dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';

const normalClass = 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600';
const errorClass = 'border-red-500 focus:ring-red-500 focus:border-red-500';

export function FormInput({
  name,
  label,
  description,
  required,
  className,
  ...rest
}: FormInputProps) {
  const { register, formState: { errors } } = useFormContext();

  const hasError = !!name.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, errors as unknown);

  return (
    <FormField name={name} label={label} description={description} required={required}>
      <input
        id={name}
        {...register(name)}
        {...rest}
        required={false} // Handled by Zod validation
        className={`${baseInputClass} ${hasError ? errorClass : normalClass} ${className ?? ''}`}
        aria-invalid={hasError ? 'true' : undefined}
      />
    </FormField>
  );
}
