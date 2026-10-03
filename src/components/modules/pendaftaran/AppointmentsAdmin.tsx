import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { CalendarClock, ExternalLink, LogIn, XCircle } from 'lucide-preact';
import { APPT_STATUS, DAY_NAMES } from '../../../lib/constants';
import { todayStr } from '../../../lib/date';
import { timeSlots } from '../../../lib/booking';
import { dateLong, dateShort, maskId } from '../../../lib/format';
import type { Appointment } from '../../../lib/types';
import { $appointments, $schedules } from '../../../stores/db';
import { $doctorMap, $poliMap } from '../../../stores/selectors';
import { cancelAppointment, checkInAppointment, findPatientByNik, rescheduleAppointment } from '../../../stores/actions';
import { confirmDialog, toast } from '../../../stores/ui';
import { Badge, StatusPill } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { Input, Select } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { Tabs } from '../../ui/Tabs';
import { go, run, useReady } from '../../ui/hooks';
import { SearchInput } from '../shared';

export default function AppointmentsAdmin() {
  const ready = useReady();
  const appts = useStore($appointments);
  const schedules = useStore($schedules);
  const docMap = useStore($doctorMap);
  const poliMap = useStore($poliMap);
  const [tab, setTab] = useState<'BOOKED' | 'CHECKED_IN' | 'CANCELLED'>('BOOKED');
  const [q, setQ] = useState('');
  const [resch, setResch] = useState<Appointment | null>(null);
  const [rDate, setRDate] = useState('');
  const [rTime, setRTime] = useState('');
  const [rErr, setRErr] = useState('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return appts.filter((a) => a.status === tab && (!term || a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term) || a.nik.includes(term)));
  }, [appts, tab, q]);

  const doCheckIn = async (a: Appointment) => {
    const existing = findPatientByNik(a.nik);
    const r = await confirmDialog({
      title: `Check-in ${a.code}?`,
      message: existing
        ? `Pasien lama ditemukan: ${existing.name} (${existing.mrn}). Registrasi kunjungan akan dibuat ke ${poliMap.get(a.poliId)?.name}.`
        : `Pasien belum terdaftar. Sistem akan membuat pasien baru (No RM otomatis) dari data booking, lalu membuat registrasi ke ${poliMap.get(a.poliId)?.name}.`,
      confirmLabel: 'Check-in & Daftarkan',
    });
    if (!r.ok) return;
    const v = run(() => checkInAppointment(a.id));
    if (v) {
      toast(`Check-in berhasil · Antrian ${v.queueNo}`, { message: `${a.name} terdaftar ke ${poliMap.get(a.poliId)?.name}` });
      go(`/app/pendaftaran/detail?id=${v.id}`);
    }
  };

  const openResch = (a: Appointment) => {
    setResch(a);
    setRDate(a.date);
    setRTime(a.time);
    setRErr('');
  };
  const reschSlots = useMemo(() => {
    if (!resch || !rDate) return [];
    const day = new Date(rDate + 'T00:00:00').getDay();
    const sch = schedules.find((s) => s.doctorId === resch.doctorId && s.day === day && s.active !== false);
    return sch ? timeSlots(sch.start, sch.end) : [];
  }, [resch, rDate, schedules]);

  const saveResch = () => {
    if (!resch) return;
    if (!rDate || rDate < todayStr()) return setRErr('Pilih tanggal hari ini atau setelahnya');
    if (!reschSlots.length) return setRErr('Dokter tidak praktik pada tanggal ini');
    if (!rTime || !reschSlots.includes(rTime)) return setRErr('Pilih jam praktik');
    if (run(() => rescheduleAppointment(resch.id, rDate, rTime), 'Booking dijadwal ulang', `${resch.code} → ${dateShort(rDate)} ${rTime.replace(':', '.')}`)) setResch(null);
  };

  const doCancel = async (a: Appointment) => {
    const r = await confirmDialog({ title: `Batalkan booking ${a.code}?`, input: { label: 'Alasan pembatalan' }, confirmLabel: 'Batalkan Booking', tone: 'danger' });
    if (r.ok) run(() => cancelAppointment(a.id, r.text ?? ''), 'Booking dibatalkan', a.code);
  };

  const columns: Column<Appointment>[] = [
    { key: 'code', header: 'Kode Booking', sort: (a) => a.code, render: (a) => <span class="tabular font-semibold">{a.code}</span> },
    {
      key: 'date',
      header: 'Jadwal',
      sort: (a) => a.date + a.time,
      render: (a) => (
        <span class="tabular">
          {dateShort(a.date)} · {a.time.replace(':', '.')}
          {a.date === todayStr() && <Badge tone="primary" class="ml-1.5">Hari ini</Badge>}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Pasien',
      sort: (a) => a.name,
      render: (a) => (
        <div>
          <p class="font-medium">{a.name}</p>
          <p class="tabular text-xs text-muted">
            NIK {maskId(a.nik)} · {a.phone}
          </p>
        </div>
      ),
    },
    {
      key: 'poli',
      header: 'Poli / Dokter',
      render: (a) => (
        <div>
          <p class="font-medium">{poliMap.get(a.poliId)?.name}</p>
          <p class="text-xs text-muted">{docMap.get(a.doctorId)?.name}</p>
        </div>
      ),
    },
    { key: 'payer', header: 'Penjamin', render: (a) => <Badge tone={a.payerType === 'BPJS' ? 'success' : 'neutral'}>{a.payerType}</Badge> },
    { key: 'complaint', header: 'Keluhan', render: (a) => <span class="text-sm text-muted">{a.complaint || '-'}</span> },
    { key: 'status', header: 'Status', render: (a) => <StatusPill status={APPT_STATUS[a.status]} /> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (a) =>
        a.status === 'BOOKED' ? (
          <div class="flex justify-end gap-1.5">
            <button type="button" class="btn btn-primary btn-sm" onClick={() => doCheckIn(a)}>
              <LogIn size={14} /> Check-in
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onClick={() => openResch(a)}>
              <CalendarClock size={14} /> Reschedule
            </button>
            <button type="button" class="btn-icon h-8 w-8 hover:text-danger" onClick={() => doCancel(a)} aria-label={`Batalkan ${a.code}`} title="Batalkan">
              <XCircle size={16} />
            </button>
          </div>
        ) : a.status === 'CHECKED_IN' && a.visitId ? (
          <a href={`/app/pendaftaran/detail?id=${a.visitId}`} class="link inline-flex items-center gap-1 text-sm">
            Lihat registrasi <ExternalLink size={12} />
          </a>
        ) : (
          <span class="text-xs text-muted">{a.cancelReason}</span>
        ),
    },
  ];

  const counts = { BOOKED: appts.filter((a) => a.status === 'BOOKED').length, CHECKED_IN: appts.filter((a) => a.status === 'CHECKED_IN').length, CANCELLED: appts.filter((a) => a.status === 'CANCELLED').length };

  return (
    <div>
      <PageHeader
        title="Janji Temu Online"
        subtitle="Booking dari situs publik masuk ke sini. Check-in akan membuat atau menautkan data pasien dan langsung membuat registrasi."
        actions={
          <a href="/janji-temu" target="_blank" rel="noopener" class="btn btn-secondary">
            <ExternalLink size={16} /> Form booking publik
          </a>
        }
      />
      <div class="card">
        <Tabs
          class="px-3"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'BOOKED', label: 'Terjadwal', count: counts.BOOKED },
            { key: 'CHECKED_IN', label: 'Sudah Check-in', count: counts.CHECKED_IN },
            { key: 'CANCELLED', label: 'Dibatalkan', count: counts.CANCELLED },
          ]}
        />
        <div class="border-b border-border p-4">
          <SearchInput class="max-w-md" value={q} onValue={setQ} placeholder="Cari kode booking, nama, NIK..." />
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} loading={!ready} initialSort={{ key: 'date', dir: 'asc' }} empty={{ title: 'Tidak ada booking', description: 'Booking baru dari situs publik akan tampil di sini secara otomatis.' }} />
      </div>

      <Modal
        open={!!resch}
        onClose={() => setResch(null)}
        title={`Reschedule ${resch?.code ?? ''}`}
        description={resch ? `${resch.name} · ${docMap.get(resch.doctorId)?.name}` : ''}
        size="sm"
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setResch(null)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={saveResch}>
              Simpan Jadwal
            </button>
          </>
        }
      >
        <div class="space-y-4">
          <Input
            label="Tanggal baru"
            type="date"
            min={todayStr()}
            value={rDate}
            onValue={(v) => {
              setRDate(v);
              setRTime('');
              setRErr('');
            }}
            hint={rDate ? dateLong(rDate) : undefined}
          />
          {resch && (
            <p class="text-xs text-muted">
              Jadwal praktik:{' '}
              {schedules
                .filter((s) => s.doctorId === resch.doctorId)
                .map((s) => `${DAY_NAMES[s.day]} ${s.start.replace(':', '.')}-${s.end.replace(':', '.')}`)
                .join(', ')}
            </p>
          )}
          <Select label="Jam" value={rTime} onValue={setRTime} options={reschSlots.map((t) => ({ value: t, label: t.replace(':', '.') }))} placeholder={reschSlots.length ? 'Pilih jam' : 'Tidak ada jadwal'} disabled={!reschSlots.length} />
          {rErr && (
            <p class="field-error" role="alert">
              {rErr}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
