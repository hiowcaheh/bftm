import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface FieldWrapperProps {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FieldWrapper({ id, label, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
      {!error && hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

// 16px (text-[1rem]) — iOS Safari nie robi auto-zoomu przy focusie pola <16px
export const inputClasses = (hasError?: boolean) =>
  cn(
    'h-12 w-full rounded-(--radius-input) border bg-white px-3.5 text-[1rem] text-text',
    'placeholder:text-text-secondary/60',
    'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
    hasError ? 'border-error' : 'border-line',
  );

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id: idProp, className, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <input ref={ref} id={id} className={cn(inputClasses(!!error), className)} {...rest} />
    </FieldWrapper>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id: idProp, className, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(inputClasses(!!error), 'h-auto py-3', className)}
        {...rest}
      />
    </FieldWrapper>
  );
});
