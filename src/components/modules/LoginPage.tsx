import { useEffect, useState } from 'preact/hooks';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-preact';
import { ROLE_LABEL } from '../../lib/constants';
import type { Role } from '../../lib/types';
import { initDb } from '../../stores/db';
import { FALLBACK_USERS, login } from '../../stores/session';
import { showInfo, toast } from '../../stores/ui';
import { RoleCards } from '../app/Overlays';
import { go } from '../ui/hooks';

export default function LoginPage() {
  const [role, setRole] = useState<Role>('SUPERADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initDb();
  }, []);

  const submit = async (e?: Event) => {
    e?.preventDefault();
    setBusy(true);
    await initDb();
    login(role);
    toast(`Selamat datang, ${FALLBACK_USERS[role].name}`, { tone: 'info', message: `Masuk sebagai ${ROLE_LABEL[role]}` });
    const next = new URLSearchParams(location.search).get('next');
    go(next && next.startsWith('/app') && !next.startsWith('/app/login') ? next : '/app');
  };

  return (
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside class="relative hidden overflow-hidden bg-white lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-border lg:p-12">
        <div class="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-primary-soft blur-3xl" aria-hidden="true" />
        <a href="/" class="relative">
          <img src="/logo.webp" alt="Rumah Sakit Dustira" width="220" height="55" class="h-12 w-auto" />
        </a>
        <div class="relative">
          <p class="badge mb-4 bg-primary-soft text-primary-strong">SIMRS Lite · Demo</p>
          <h1 class="text-4xl leading-tight font-bold text-text">Satu sistem untuk seluruh alur pelayanan pasien.</h1>
          <p class="mt-4 max-w-md text-muted">Pendaftaran, rekam medis elektronik, tindakan, farmasi, hingga kasir, saling terhubung dan tercatat dalam jejak audit.</p>
          <ol class="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
            {['Daftar', 'Periksa', 'Tindakan', 'Farmasi', 'Kasir', 'Selesai'].map((s, i) => (
              <li key={s} class="flex items-center gap-2 rounded-lg border border-border bg-white/70 px-3 py-2">
                <span class="tabular flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <p class="relative text-xs text-subtle">Data pada demo ini fiktif. © {new Date().getFullYear()} Rumah Sakit Dustira Cimahi.</p>
      </aside>

      <section class="flex items-center justify-center bg-surface px-4 py-10 sm:px-8">
        <div class="w-full max-w-2xl">
          <a href="/" class="mb-6 inline-block lg:hidden">
            <img src="/logo.webp" alt="Rumah Sakit Dustira" width="180" height="45" class="h-10 w-auto" />
          </a>
          <h2 class="text-2xl font-bold">Masuk Staf</h2>
          <p class="mt-1 text-sm text-muted">Mode demo: username dan password apa pun diterima. Pilih role untuk mensimulasikan akses.</p>

          <form onSubmit={submit} class="card mt-6 space-y-5 p-6">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="username" class="field-label">
                  Username
                </label>
                <div class="relative">
                  <User size={16} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
                  <input id="username" class="input pl-9" autoComplete="username" placeholder="nama.pengguna" value={username} onInput={(e) => setUsername((e.target as HTMLInputElement).value)} />
                </div>
              </div>
              <div>
                <label for="password" class="field-label">
                  Password
                </label>
                <div class="relative">
                  <Lock size={16} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    class="input px-9"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  />
                  <button type="button" class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-subtle hover:text-text" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm">
              <label class="inline-flex items-center gap-2 text-muted">
                <input type="checkbox" class="checkbox" defaultChecked /> Ingat saya
              </label>
              <button type="button" class="link text-sm" onClick={() => showInfo('Lupa Password', 'Reset password melalui email dan verifikasi OTP tersedia pada versi produksi. Pada demo, password apa pun diterima.')}>
                Lupa password?
              </button>
            </div>

            <div>
              <p class="field-label">Pilih role demo</p>
              <RoleCards current={role} onPick={setRole} />
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" disabled={busy}>
              {busy ? 'Menyiapkan data demo...' : `Masuk sebagai ${ROLE_LABEL[role]}`}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          <p class="mt-4 text-center text-sm text-muted">
            <a href="/" class="link">
              ← Kembali ke situs publik
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
