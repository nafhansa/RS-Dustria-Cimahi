import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, RefreshCw, Search, UserCog, Info } from 'lucide-preact';
import { ROLE_LABEL } from '../../lib/constants';
import { $currentUser, $session, logout } from '../../stores/session';
import { $badges } from '../../stores/selectors';
import { $roleSwitchOpen, $searchOpen, $sidebarOpen, confirmDialog, toast } from '../../stores/ui';
import { resetDb } from '../../stores/db';
import { Avatar } from '../ui/Display';
import { go, useNow } from '../ui/hooks';

export async function confirmReset() {
  const r = await confirmDialog({
    title: 'Reset data demo?',
    message: 'Semua perubahan selama demo (pasien baru, kunjungan, pembayaran, dll.) akan dihapus dan data kembali ke kondisi awal.',
    confirmLabel: 'Reset Data',
    tone: 'danger',
  });
  if (!r.ok) return;
  await resetDb();
  toast('Data demo berhasil direset', { message: 'Seluruh data kembali ke kondisi awal.' });
}

function useOutside(ref: { current: HTMLElement | null }, close: () => void) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
}

export default function Topbar({ crumbs = [] }: { crumbs?: { label: string; href?: string }[] }) {
  const user = useStore($currentUser);
  const session = useStore($session);
  const badges = useStore($badges);
  const now = useNow(1000);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  useOutside(menuRef, () => setMenuOpen(false));
  useOutside(notifRef, () => setNotifOpen(false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $searchOpen.set(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const role = session?.role;
  const can = (...r: string[]) => !!role && (role === 'SUPERADMIN' || r.includes(role));
  const notifs = [
    can('APOTEKER') && badges.pharmacy > 0 && { href: '/app/farmasi', title: `${badges.pharmacy} resep menunggu diproses`, tone: 'bg-primary' },
    can('KASIR') && badges.cashier > 0 && { href: '/app/kasir', title: `${badges.cashier} tagihan belum dibayar`, tone: 'bg-warning' },
    can('ADMIN') && badges.appointments > 0 && { href: '/app/janji-temu', title: `${badges.appointments} booking online belum check-in`, tone: 'bg-info' },
    can('ADMIN', 'PERAWAT') && badges.queue > 0 && { href: '/app/antrian', title: `${badges.queue} pasien dalam antrian`, tone: 'bg-info' },
    can('DOKTER', 'PERAWAT') && badges.worklist > 0 && { href: '/app/rekam-medis', title: `${badges.worklist} pasien di worklist poli`, tone: 'bg-success' },
    can('APOTEKER') && badges.stock > 0 && { href: '/app/farmasi/stok', title: `${badges.stock} obat stok menipis/habis/hampir ED`, tone: 'bg-danger' },
  ].filter(Boolean) as { href: string; title: string; tone: string }[];

  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div class="no-print sticky top-0 z-30">
      <div class="flex items-center justify-center gap-3 bg-ink px-4 py-1.5 text-xs text-white/90">
        <Info size={14} class="shrink-0" aria-hidden="true" />
        <span>
          <strong class="font-semibold text-white">Mode Demo:</strong> semua data fiktif.
        </span>
        <button type="button" class="rounded px-2 py-0.5 font-semibold text-white underline-offset-2 hover:bg-white/10 hover:underline" onClick={confirmReset}>
          Reset
        </button>
      </div>
      <header class="flex h-16 items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur lg:px-6">
        <button type="button" class="btn-icon lg:hidden" onClick={() => $sidebarOpen.set(true)} aria-label="Buka menu">
          <Menu size={20} />
        </button>
        <nav aria-label="Breadcrumb" class="hidden min-w-0 md:block">
          <ol class="flex items-center gap-1 text-sm text-muted">
            <li>
              <a href="/app" class="hover:text-text">
                SIMRS
              </a>
            </li>
            {crumbs.map((c, i) => (
              <li key={i} class="flex min-w-0 items-center gap-1">
                <ChevronRight size={14} class="shrink-0 text-subtle" />
                {c.href && i < crumbs.length - 1 ? (
                  <a href={c.href} class="truncate hover:text-text">
                    {c.label}
                  </a>
                ) : (
                  <span class="truncate font-medium text-text" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div class="flex-1" />
        <button type="button" onClick={() => $searchOpen.set(true)} class="input hidden w-64 items-center gap-2 text-left text-subtle sm:flex" aria-label="Cari pasien (Ctrl+K)">
          <Search size={16} />
          <span class="flex-1 truncate">Cari pasien...</span>
          <span class="kbd">Ctrl K</span>
        </button>
        <button type="button" class="btn-icon sm:hidden" onClick={() => $searchOpen.set(true)} aria-label="Cari pasien">
          <Search size={18} />
        </button>
        <div class="hidden text-right leading-tight xl:block">
          <p class="text-xs text-muted">{dateLabel}</p>
          <p class="tabular text-sm font-semibold text-text">{timeLabel} WIB</p>
        </div>
        <div class="relative" ref={notifRef}>
          <button type="button" class="btn-icon relative" onClick={() => setNotifOpen(!notifOpen)} aria-label={`Notifikasi (${notifs.length})`} aria-expanded={notifOpen}>
            <Bell size={19} />
            {notifs.length > 0 && <span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />}
          </button>
          {notifOpen && (
            <div class="absolute right-0 mt-2 w-80 rounded-[var(--radius-card)] border border-border bg-white shadow-lift">
              <p class="border-b border-border px-4 py-3 text-sm font-semibold">Notifikasi</p>
              <ul class="max-h-80 overflow-y-auto py-1">
                {notifs.length === 0 && <li class="px-4 py-6 text-center text-sm text-muted">Tidak ada notifikasi baru</li>}
                {notifs.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} class="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-surface" onClick={() => setNotifOpen(false)}>
                      <span class={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.tone}`} />
                      {n.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div class="relative" ref={menuRef}>
          <button type="button" class="flex items-center gap-2 rounded-[var(--radius-field)] py-1 pr-1 pl-1 hover:bg-surface-2" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-haspopup="menu">
            <Avatar name={user?.name ?? '?'} size={34} />
            <span class="hidden text-left leading-tight md:block">
              <span class="block max-w-[160px] truncate text-sm font-semibold text-text">{user?.name ?? '-'}</span>
              <span class="badge mt-0.5 bg-primary-soft px-1.5 py-0 text-[10px] text-primary-strong">{role ? ROLE_LABEL[role] : '-'}</span>
            </span>
            <ChevronDown size={16} class="text-subtle" />
          </button>
          {menuOpen && (
            <div role="menu" class="absolute right-0 mt-2 w-56 rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-lift">
              <button
                role="menuitem"
                type="button"
                class="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-surface"
                onClick={() => {
                  setMenuOpen(false);
                  $roleSwitchOpen.set(true);
                }}
              >
                <UserCog size={16} /> Ganti Role
              </button>
              <button
                role="menuitem"
                type="button"
                class="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-surface"
                onClick={() => {
                  setMenuOpen(false);
                  confirmReset();
                }}
              >
                <RefreshCw size={16} /> Reset Data Demo
              </button>
              <div class="my-1 border-t border-border" />
              <button
                role="menuitem"
                type="button"
                class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-danger-strong hover:bg-danger-soft"
                onClick={() => {
                  logout();
                  go('/app/login');
                }}
              >
                <LogOut size={16} /> Keluar
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
