import React from 'react';
import { FormProvider as RHFProvider, FieldValues } from 'react-hook-form';
import { FormProviderProps } from './types';

export function FormProvider<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProviderProps<T>) {
  return (
    <RHFProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className} noValidate>
        {children}
      </form>
    </RHFProvider>
  );
}
