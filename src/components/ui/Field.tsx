import type { ComponentChildren, JSX } from 'preact';
import { useId } from 'preact/hooks';

interface BaseProps {
  label?: ComponentChildren;
  error?: string;
  hint?: ComponentChildren;
  required?: boolean;
  class?: string;
}


function Wrap({ id, label, error, hint, required, class: cls, children }: BaseProps & { id: string; children: ComponentChildren }) {
  return (
    <div class={cls}>
      {label && (
        <label for={id} class="field-label">
          {label}
          {required && (
            <span class="text-primary" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-err`} class="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} class="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = BaseProps & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'label' | 'class'> & { onValue?: (v: string) => void };

export function Input({ label, error, hint, required, class: cls, onValue, id, name, ...rest }: InputProps) {
  const auto = useId();
  const fid = (id as string) ?? `f${auto.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} required={required} class={cls}>
      <input
        id={fid}
        name={name}
        class="input"
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        onInput={onValue ? (e) => onValue((e.target as HTMLInputElement).value) : undefined}
        {...rest}
      />
    </Wrap>
  );
}

type SelectProps = BaseProps &
  Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, 'label' | 'class'> & {
    onValue?: (v: string) => void;
    options: (string | { value: string; label: string; disabled?: boolean })[];
    placeholder?: string;
  };

export function Select({ label, error, hint, required, class: cls, onValue, options, placeholder, id, name, ...rest }: SelectProps) {
  const auto = useId();
  const fid = (id as string) ?? `f${auto.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} required={required} class={cls}>
      <select
        id={fid}
        name={name}
        class="input"
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        onChange={onValue ? (e) => onValue((e.target as HTMLSelectElement).value) : undefined}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ),
        )}
      </select>
    </Wrap>
  );
}

type TextareaProps = BaseProps & Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'label' | 'class'> & { onValue?: (v: string) => void };

export function Textarea({ label, error, hint, required, class: cls, onValue, id, name, ...rest }: TextareaProps) {
  const auto = useId();
  const fid = (id as string) ?? `f${auto.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} required={required} class={cls}>
      <textarea
        id={fid}
        name={name}
        class="input min-h-[84px]"
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        onInput={onValue ? (e) => onValue((e.target as HTMLTextAreaElement).value) : undefined}
        {...rest}
      />
    </Wrap>
  );
}

export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onValue,
  name,
  error,
  required,
}: {
  label?: string;
  value: T | '';
  options: { value: T; label: string }[];
  onValue: (v: T) => void;
  name: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-err` : undefined}>
      {label && (
        <legend class="field-label">
          {label}
          {required && <span class="text-primary"> *</span>}
        </legend>
      )}
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            class={`inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-field)] border px-3 py-2 text-sm transition ${
              value === o.value ? 'border-primary bg-primary-soft font-medium text-primary-strong' : 'border-border bg-white hover:bg-surface'
            }`}
          >
            <input type="radio" class="accent-[var(--color-primary)]" name={name} value={o.value} checked={value === o.value} onChange={() => onValue(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-err`} class="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  );
}
