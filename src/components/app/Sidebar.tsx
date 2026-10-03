import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Database,
  LayoutDashboard,
  List,
  ListOrdered,
  Package,
  Pill,
  Receipt,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
  X,
} from 'lucide-preact';
import { MENU } from '../../lib/constants';
import { $session } from '../../stores/session';
import { $badges } from '../../stores/selectors';
import { $sidebarOpen } from '../../stores/ui';
import { initDb } from '../../stores/db';

const ICONS: Record<string, typeof Users> = {
  dashboard: LayoutDashboard,
  users: Users,
  clipboard: ClipboardList,
  calendar: Calendar,
  queue: ListOrdered,
  stethoscope: Stethoscope,
  activity: Activity,
  pill: Pill,
  package: Package,
  wallet: Wallet,
  receipt: Receipt,
  chart: BarChart3,
  list: List,
  database: Database,
  shield: ShieldCheck,
  settings: Settings,
};

const allHrefs = MENU.flatMap((g) => g.items.map((i) => i.href));

/** Longest menu href that prefixes the current path wins. */
function activeHref(path: string): string {
  const p = path.replace(/\/$/, '') || '/';
  return allHrefs.filter((h) => p === h || p.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0] ?? '';
}

export default function Sidebar() {
  const session = useStore($session);
  const badges = useStore($badges);
  const open = useStore($sidebarOpen);
  const [path, setPath] = useState(typeof location !== 'undefined' ? location.pathname : '');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    initDb();
    try {
      setCollapsed(localStorage.getItem('rsd:sidebar-collapsed') === '1');
    } catch {
      /* ignore */
    }
    const onNav = () => {
      setPath(location.pathname);
      $sidebarOpen.set(false);
    };
    document.addEventListener('astro:page-load', onNav);
    return () => document.removeEventListener('astro:page-load', onNav);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('rsd:sidebar-collapsed', next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const role = session?.role;
  const current = activeHref(path);
  const groups = MENU.map((g) => ({ ...g, items: g.items.filter((i) => role && i.roles.includes(role)) })).filter((g) => g.items.length);
  const isCollapsed = collapsed && !open;

  return (
    <>
      <div class={`fixed inset-0 z-40 bg-ink/40 lg:hidden ${open ? 'block' : 'hidden'}`} onClick={() => $sidebarOpen.set(false)} aria-hidden="true" />
      <aside
        class={`no-print fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-[76px]' : 'w-64'}`}
        aria-label="Navigasi utama"
      >
        <div class={`flex h-16 shrink-0 items-center border-b border-border ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <a href="/app" class="flex items-center" aria-label="Dashboard RS Dustira">
            {isCollapsed ? (
              <img src="/logo-symbol.png" alt="RS Dustira" width="36" height="36" class="h-9 w-9 object-contain" />
            ) : (
              <img src="/logo.webp" alt="Rumah Sakit Dustira" width="168" height="42" class="h-9 w-auto" />
            )}
          </a>
          <button type="button" class="btn-icon lg:hidden" onClick={() => $sidebarOpen.set(false)} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.group} class="mb-5">
              {!isCollapsed && <p class="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-subtle uppercase">{g.group}</p>}
              <ul class="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? List;
                  const active = current === item.href;
                  const count = item.badge ? badges[item.badge as keyof typeof badges] : 0;
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        class={`group relative flex items-center gap-3 rounded-[var(--radius-field)] px-3 py-2 text-sm font-medium transition ${
                          active ? 'bg-primary-soft text-primary-strong' : 'text-muted hover:bg-surface-2 hover:text-text'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      >
                        {active && <span class="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r bg-primary" aria-hidden="true" />}
                        <Icon size={18} class="shrink-0" />
                        {!isCollapsed && <span class="flex-1 truncate">{item.label}</span>}
                        {count > 0 && (
                          <span
                            class={`tabular rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold ${active ? 'bg-primary text-white' : 'bg-primary-soft text-primary-strong'} ${
                              isCollapsed ? 'absolute -top-0.5 right-1' : ''
                            }`}
                            aria-label={`${count} perlu tindakan`}
                          >
                            {count}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div class="hidden border-t border-border p-3 lg:block">
          <button type="button" onClick={toggle} class={`btn btn-ghost w-full ${isCollapsed ? 'px-0' : 'justify-start'}`} aria-label={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}>
            {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!isCollapsed && 'Ciutkan'}
          </button>
        </div>
      </aside>
    </>
  );
}
