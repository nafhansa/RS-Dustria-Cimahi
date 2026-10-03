import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { Download } from 'lucide-preact';
import { downloadCsv } from '../../../lib/csv';
import { ROLE_LABEL } from '../../../lib/constants';
import { dateTime } from '../../../lib/format';
import type { AuditEntry, Role } from '../../../lib/types';
import { $auditLog } from '../../../stores/db';
import { $personName } from '../../../stores/selectors';
import { toast } from '../../../stores/ui';
import { Badge } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { useReady } from '../../ui/hooks';
import { SearchInput } from '../shared';

export default function AuditLog() {
  const ready = useReady();
  const log = useStore($auditLog);
  const personName = useStore($personName);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [entity, setEntity] = useState('');
  const [date, setDate] = useState('');
  const entities = useMemo(() => [...new Set(log.map((l) => l.entity))].sort(), [log]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return log.filter((l) => (!role || l.role === role) && (!entity || l.entity === entity) && (!date || l.at.startsWith(date)) && (!t || l.action.toLowerCase().includes(t) || l.entityId.toLowerCase().includes(t) || (l.detail ?? '').toLowerCase().includes(t) || personName(l.userId).toLowerCase().includes(t)));
  }, [log, q, role, entity, date, personName]);

  const columns: Column<AuditEntry>[] = [
    { key: 'at', header: 'Waktu', sort: (l) => l.at, render: (l) => <span class="tabular whitespace-nowrap">{dateTime(l.at)}</span> },
    { key: 'user', header: 'Pengguna', sort: (l) => personName(l.userId), render: (l) => <div><p class="text-sm font-medium">{personName(l.userId)}</p><Badge tone="primary">{ROLE_LABEL[l.role as Role] ?? l.role}</Badge></div> },
    { key: 'action', header: 'Aksi', sort: (l) => l.action, render: (l) => <span class="font-medium">{l.action}</span> },
    { key: 'entity', header: 'Entitas', render: (l) => <Badge>{l.entity}</Badge> },
    { key: 'id', header: 'ID', render: (l) => <span class="tabular text-sm">{l.entityId}</span> },
    { key: 'detail', header: 'Detail', render: (l) => <span class="text-sm text-muted">{l.detail}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Jejak aktivitas: siapa melakukan apa, kapan, terhadap data apa. Mendukung kebutuhan jejak audit rekam medis elektronik."
        actions={
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => {
              downloadCsv('audit-log', ['Waktu', 'Pengguna', 'Role', 'Aksi', 'Entitas', 'ID', 'Detail'], rows.map((l) => [l.at, personName(l.userId), l.role, l.action, l.entity, l.entityId, l.detail]));
              toast('Export CSV berhasil', { message: `${rows.length} entri` });
            }}
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />
      <div class="card">
        <div class="flex flex-wrap gap-3 border-b border-border p-4">
          <SearchInput class="min-w-[240px] flex-1" value={q} onValue={setQ} placeholder="Cari aksi, ID, detail, pengguna..." />
          <input type="date" class="input w-auto" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} aria-label="Filter tanggal" />
          <select class="input w-auto" value={role} onChange={(e) => setRole((e.target as HTMLSelectElement).value)} aria-label="Filter role">
            <option value="">Semua role</option>
            {[...Object.entries(ROLE_LABEL), ['PUBLIK', 'Publik (online)']].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select class="input w-auto" value={entity} onChange={(e) => setEntity((e.target as HTMLSelectElement).value)} aria-label="Filter entitas">
            <option value="">Semua entitas</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(l) => l.id} loading={!ready} initialSort={{ key: 'at', dir: 'desc' }} pageSizes={[25, 50, 10]} empty={{ title: 'Belum ada aktivitas tercatat' }} />
      </div>
    </div>
  );
}
