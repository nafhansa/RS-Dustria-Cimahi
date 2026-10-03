import type { ComponentChildren } from 'preact';
import { useStore } from '@nanostores/preact';
import { AlertTriangle, ArrowLeft, Printer } from 'lucide-preact';
import { PAYER_LABEL, PAYER_TONE } from '../../../lib/constants';
import { ageLabel, genderLabel } from '../../../lib/format';
import type { Patient, Payer } from '../../../lib/types';
import { $settings } from '../../../stores/db';
import { $insurerMap } from '../../../stores/selectors';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Display';

export function PayerBadge({ payer }: { payer: Payer }) {
  const insurers = useStore($insurerMap);
  const name = payer.type === 'ASURANSI' ? insurers.get(payer.insurerId ?? '')?.name ?? 'Asuransi' : PAYER_LABEL[payer.type];
  return (
    <Badge tone={PAYER_TONE[payer.type]} title={payer.memberNo ? `No: ${payer.memberNo}` : undefined}>
      {name}
      {payer.type === 'BPJS' && payer.class ? ` · Kls ${payer.class}` : ''}
    </Badge>
  );
}

export function AllergyBadge({ allergies, full }: { allergies: string[]; full?: boolean }) {
  if (!allergies.length) return null;
  return (
    <span class="badge bg-danger text-white" title={`Alergi: ${allergies.join(', ')}`}>
      <AlertTriangle size={12} aria-hidden="true" />
      {full ? `Alergi: ${allergies.join(', ')}` : 'Alergi'}
    </span>
  );
}

export function PatientCell({ p, href }: { p: Patient; href?: string }) {
  const inner = (
    <span class="flex items-center gap-2.5">
      <Avatar name={p.name} size={32} />
      <span class="min-w-0">
        <span class="block truncate font-medium text-text">{p.name}</span>
        <span class="tabular block text-xs text-muted">
          {p.mrn} · {p.gender} · {ageLabel(p.birthDate)}
        </span>
      </span>
    </span>
  );
  return href ? (
    <a href={href} class="hover:[&_span.font-medium]:text-primary">
      {inner}
    </a>
  ) : (
    inner
  );
}

/** Compact patient identity strip used across clinical screens. */
export function PatientStrip({ p, extra }: { p: Patient; extra?: ComponentChildren }) {
  return (
    <div class="card flex flex-wrap items-center gap-4 p-4">
      <Avatar name={p.name} size={48} />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <a href={`/app/pasien/detail?id=${p.id}`} class="text-lg font-semibold text-text hover:text-primary">
            {p.name}
          </a>
          <PayerBadge payer={p.payer} />
          <AllergyBadge allergies={p.allergies} full />
        </div>
        <p class="tabular mt-0.5 text-sm text-muted">
          {p.mrn} · {genderLabel(p.gender)} · {ageLabel(p.birthDate)} · Gol. darah {p.bloodType ?? '-'}
        </p>
      </div>
      {extra}
    </div>
  );
}

export function PrintToolbar({ back, children }: { back: string; children?: ComponentChildren }) {
  return (
    <div class="no-print sticky top-0 z-20 mb-6 border-b border-border bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <a href={back} class="btn btn-ghost">
          <ArrowLeft size={16} /> Kembali
        </a>
        <div class="flex flex-wrap items-center gap-2">
          {children}
          <button type="button" class="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hospital letterhead for printed documents. */
export function Kop({ title, subtitle, compact }: { title?: string; subtitle?: string; compact?: boolean }) {
  const s = useStore($settings);
  return (
    <header class={`flex items-center gap-4 border-b-2 border-primary ${compact ? 'pb-2' : 'pb-3'}`}>
      <img src="/logo-symbol.png" alt="" width="56" height="56" class={compact ? 'h-10 w-10' : 'h-14 w-14'} />
      <div class="min-w-0 flex-1">
        <p class={`font-heading font-bold text-text ${compact ? 'text-base' : 'text-xl'}`}>{s.hospitalName.toUpperCase()}</p>
        <p class="text-xs text-muted">{s.address}</p>
        <p class="text-xs text-muted">
          Telp. {s.phone} · IGD 24 Jam {s.emergencyPhone} · {s.email}
        </p>
      </div>
      {title && (
        <div class="text-right">
          <p class="font-heading text-base font-bold tracking-wide text-primary uppercase">{title}</p>
          {subtitle && <p class="tabular text-xs text-muted">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}

export function Watermark() {
  const s = useStore($settings);
  return s.showWatermark ? (
    <div class="watermark" aria-hidden="true">
      DEMO
    </div>
  ) : null;
}

export function DemoFootnote() {
  return <p class="mt-6 border-t border-dashed border-border pt-2 text-center text-[10px] text-subtle">Dokumen ini dihasilkan oleh SIMRS Lite Demo. Data fiktif untuk demo, tidak berlaku sebagai dokumen resmi.</p>;
}

export function SearchInput({ value, onValue, placeholder, class: cls = '' }: { value: string; onValue: (v: string) => void; placeholder: string; class?: string }) {
  return (
    <div class={`relative ${cls}`}>
      <svg class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input type="search" class="input pl-9" placeholder={placeholder} aria-label={placeholder} value={value} onInput={(e) => onValue((e.target as HTMLInputElement).value)} />
    </div>
  );
}
