import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { AlertTriangle, CheckCircle2, Info, XCircle, X, Search, Stethoscope, ClipboardList, HeartPulse, Pill, Wallet, ShieldCheck } from 'lucide-preact';
import { $confirm, $info, $roleSwitchOpen, $searchOpen, $toasts, dismissToast, toast } from '../../stores/ui';
import { $patients } from '../../stores/db';
import { $session, login } from '../../stores/session';
import { ROLE_DESC, ROLE_LABEL } from '../../lib/constants';
import { ageLabel, maskId } from '../../lib/format';
import type { Role } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Display';
import { Badge } from '../ui/Badge';
import { FALLBACK_USERS } from '../../stores/session';

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const TOAST_TONE = { success: 'text-success', error: 'text-danger', info: 'text-info', warning: 'text-warning' };

export const ROLE_ICON: Record<Role, typeof Info> = {
  ADMIN: ClipboardList,
  PERAWAT: HeartPulse,
  DOKTER: Stethoscope,
  APOTEKER: Pill,
  KASIR: Wallet,
  SUPERADMIN: ShieldCheck,
};

function Toasts() {
  const toasts = useStore($toasts);
  return (
    <div class="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" role="status">
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.tone];
        return (
          <div key={t.id} class="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-white p-3.5 shadow-lift animate-[toastin_.2s_ease-out]">
            <Icon size={20} class={`mt-0.5 shrink-0 ${TOAST_TONE[t.tone]}`} aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text">{t.title}</p>
              {t.message && <p class="mt-0.5 text-sm text-muted">{t.message}</p>}
            </div>
            <button type="button" class="rounded p-0.5 text-subtle hover:text-text" onClick={() => dismissToast(t.id)} aria-label="Tutup notifikasi">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmHost() {
  const req = useStore($confirm);
  // keyed per request so every dialog starts with fresh state (no post-open reset that could wipe fast input)
  return req ? <ConfirmDialog key={req.id} req={req} /> : null;
}

function ConfirmDialog({ req }: { req: NonNullable<ReturnType<typeof $confirm.get>> }) {
  const [text, setText] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const close = (ok: boolean) => {
    if (ok && req.input?.required !== false && req.input && !text.trim()) {
      setErr(`${req.input.label} wajib diisi`);
      return;
    }
    if (ok && req.pin && !pin) {
      setErr('PIN otorisasi wajib diisi');
      return;
    }
    req.resolve({ ok, text, pin });
    $confirm.set(null);
  };
  return (
    <Modal
      open
      onClose={() => close(false)}
      title={req.title}
      size="sm"
      footer={
        <>
          <button type="button" class="btn btn-secondary" onClick={() => close(false)}>
            Batal
          </button>
          <button type="button" class={`btn ${req.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} data-autofocus={!req.input && !req.pin ? '' : undefined}>
            {req.confirmLabel ?? 'Ya, Lanjutkan'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          close(true);
        }}
        class="space-y-3"
      >
        {req.message && <p class="text-sm text-muted">{req.message}</p>}
        {req.input && (
          <div>
            <label for="confirm-input" class="field-label">
              {req.input.label}
            </label>
            <textarea id="confirm-input" data-autofocus class="input min-h-[80px]" placeholder={req.input.placeholder} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
          </div>
        )}
        {req.pin && (
          <div>
            <label for="confirm-pin" class="field-label">
              PIN otorisasi supervisor
            </label>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              data-autofocus={req.input ? undefined : ''}
              class="input tracking-[0.5em]"
              value={pin}
              onInput={(e) => setPin((e.target as HTMLInputElement).value)}
            />
            <p class="field-hint">PIN demo: 1234</p>
          </div>
        )}
        {err && (
          <p class="field-error" role="alert">
            {err}
          </p>
        )}
        <button type="submit" class="hidden" />
      </form>
    </Modal>
  );
}

function InfoHost() {
  const info = useStore($info);
  return (
    <Modal
      open={!!info}
      onClose={() => $info.set(null)}
      title={info?.title ?? ''}
      size="sm"
      footer={
        <button type="button" class="btn btn-primary" onClick={() => $info.set(null)} data-autofocus>
          Mengerti
        </button>
      }
    >
      <div class="flex gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-info-strong">
          <Info size={20} />
        </div>
        <p class="text-sm text-muted">{info?.message}</p>
      </div>
    </Modal>
  );
}

function SearchHost() {
  const open = useStore($searchOpen);
  const patients = useStore($patients);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!open) setQ('');
  }, [open]);
  const term = q.trim().toLowerCase();
  const results = term
    ? patients.filter((p) => p.name.toLowerCase().includes(term) || p.mrn.toLowerCase().includes(term) || p.nik.includes(term) || (p.payer.memberNo ?? '').includes(term)).slice(0, 8)
    : patients.slice(0, 6);
  useEffect(() => setActive(0), [q]);
  const goTo = (id: string) => {
    $searchOpen.set(false);
    location.href = `/app/pasien/detail?id=${encodeURIComponent(id)}`;
  };
  return (
    <Modal open={open} onClose={() => $searchOpen.set(false)} title="Cari Pasien" description="Cari berdasarkan No RM, nama, NIK, atau No BPJS" size="lg">
      <div class="relative">
        <Search size={18} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
        <input
          data-autofocus
          class="input py-3 pl-10 text-base"
          placeholder="Contoh: RM-000105, Siti, 3277..."
          value={q}
          aria-label="Kata kunci pencarian pasien"
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) goTo(results[active].id);
          }}
        />
      </div>
      <ul class="mt-3 divide-y divide-border">
        {results.length === 0 && <li class="py-8 text-center text-sm text-muted">Pasien tidak ditemukan</li>}
        {results.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => goTo(p.id)} onMouseEnter={() => setActive(i)} class={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left ${i === active ? 'bg-primary-soft' : ''}`}>
              <Avatar name={p.name} size={36} />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-text">{p.name}</p>
                <p class="tabular text-xs text-muted">
                  {p.mrn} · {p.gender} · {ageLabel(p.birthDate)} · NIK {maskId(p.nik)}
                </p>
              </div>
              {p.allergies.length > 0 && <Badge tone="danger">Alergi</Badge>}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

const ROLES: Role[] = ['ADMIN', 'PERAWAT', 'DOKTER', 'APOTEKER', 'KASIR', 'SUPERADMIN'];

export function RoleCards({ onPick, current }: { onPick: (r: Role) => void; current?: Role }) {
  return (
    <div class="grid gap-3 sm:grid-cols-2">
      {ROLES.map((r) => {
        const Icon = ROLE_ICON[r];
        const active = current === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onPick(r)}
            class={`group flex items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left transition hover:border-primary hover:shadow-lift ${active ? 'border-primary bg-primary-soft' : 'border-border bg-white'}`}
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white">
              <Icon size={20} />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-text">{ROLE_LABEL[r]}</span>
              <span class="block truncate text-xs font-medium text-muted">{FALLBACK_USERS[r].name}</span>
              <span class="mt-1 block text-xs text-subtle">{ROLE_DESC[r]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RoleSwitchHost() {
  const open = useStore($roleSwitchOpen);
  const session = useStore($session);
  return (
    <Modal open={open} onClose={() => $roleSwitchOpen.set(false)} title="Ganti Role" description="Simulasi berpindah pengguna tanpa keluar. Halaman yang sedang dibuka tetap dipertahankan." size="lg">
      <RoleCards
        current={session?.role}
        onPick={(r) => {
          login(r);
          $roleSwitchOpen.set(false);
          toast(`Masuk sebagai ${ROLE_LABEL[r]}`, { tone: 'info', message: FALLBACK_USERS[r].name });
        }}
      />
    </Modal>
  );
}

export default function Overlays() {
  return (
    <>
      <Toasts />
      <ConfirmHost />
      <InfoHost />
      <SearchHost />
      <RoleSwitchHost />
    </>
  );
}
