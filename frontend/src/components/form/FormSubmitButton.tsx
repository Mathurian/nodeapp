import React from 'react';
import { useFormContext } from 'react-hook-form';

interface FormSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function FormSubmitButton({
  loading,
  children,
  disabled,
  className,
  ...rest
}: FormSubmitButtonProps) {
  const { formState: { isSubmitting, isValid, isDirty } } = useFormContext();

  const isDisabled = disabled || isSubmitting || loading;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={
        'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ' +
        'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ' +
        'disabled:opacity-50 disabled:cursor-not-allowed transition-colors ' +
        'dark:bg-indigo-500 dark:hover:bg-indigo-600 ' +
        (className ?? '')
      }
      aria-busy={isSubmitting || loading ? 'true' : undefined}
      {...rest}
    >
      {(isSubmitting || loading) ? (
        <span className="flex items-center space-x-2">
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : children}
    </button>
  );
}
