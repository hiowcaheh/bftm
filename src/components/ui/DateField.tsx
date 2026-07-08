import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FieldWrapper, inputClasses } from './Input';

interface DateFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Pole daty oparte o natywny <input type="date"> — na iOS otwiera
 * systemowy picker, co jest szybsze i bardziej niezawodne niż własny kalendarz.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { label, error, hint, id: idProp, className, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrapper id={id} label={label} error={error} hint={hint}>
      <input
        ref={ref}
        id={id}
        type="date"
        className={cn(inputClasses(!!error), 'appearance-none', className)}
        {...rest}
      />
    </FieldWrapper>
  );
});
