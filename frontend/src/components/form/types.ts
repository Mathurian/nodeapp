import { FieldValues, UseFormReturn } from 'react-hook-form';

export interface FormProviderProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  children: React.ReactNode;
  className?: string;
}

export interface FormFieldWrapperProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}
