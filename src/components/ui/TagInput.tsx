import { useId, useState } from 'preact/hooks';
import { X } from 'lucide-preact';

/** Multi-value tag input: Enter or comma adds, Backspace on empty removes the last tag. */
export function TagInput({ label, value, onChange, placeholder = 'Ketik lalu Enter', suggestions = [], hint }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[]; hint?: string }) {
  const [text, setText] = useState('');
  const id = `tag${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const add = (t: string) => {
    const v = t.trim().replace(/,$/, '');
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText('');
  };
  return (
    <div>
      <label for={id} class="field-label">
        {label}
      </label>
      <div class="input flex min-h-[40px] flex-wrap items-center gap-1.5 py-1.5" onClick={() => document.getElementById(id)?.focus()}>
        {value.map((t) => (
          <span key={t} class="badge bg-danger-soft text-danger-strong ring-1 ring-danger/20">
            {t}
            <button type="button" aria-label={`Hapus ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} class="-mr-1 rounded-full p-0.5 hover:bg-danger/10">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          class="min-w-[120px] flex-1 border-0 bg-transparent p-0.5 text-sm outline-none focus:ring-0"
          value={text}
          placeholder={value.length ? '' : placeholder}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            if (v.endsWith(',')) add(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
        />
      </div>
      {hint && <p class="field-hint">{hint}</p>}
      {suggestions.length > 0 && (
        <div class="mt-1.5 flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <button key={s} type="button" class="badge bg-surface-2 text-muted hover:bg-border" onClick={() => add(s)}>
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
