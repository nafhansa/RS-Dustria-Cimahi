import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { History, Megaphone, Stethoscope, HeartPulse } from 'lucide-preact';
import { VISIT_STATUS } from '../../../lib/constants';
import { ageLabel, timeHM } from '../../../lib/format';
import { announce } from '../../../lib/speech';
import type { Visit } from '../../../lib/types';
import { $doctors, $medicalRecords, $polis } from '../../../stores/db';
import { $patientMap, $poliMap, $sessionDoctorId, $todayVisits, $doctorMap } from '../../../stores/selectors';
import { callVisit, startExam } from '../../../stores/actions';
import { Badge, StatusPill } from '../../ui/Badge';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { Tabs } from '../../ui/Tabs';
import { go, run, useReady } from '../../ui/hooks';
import { AllergyBadge, PatientCell, PayerBadge } from '../shared';
import { queueOrder } from '../antrian/QueueBoard';

type TabKey = 'waiting' | 'exam' | 'done';

export default function Worklist() {
  const ready = useReady();
  const today = useStore($todayVisits);
  const mrs = useStore($medicalRecords);
  const polis = useStore($polis);
  const doctors = useStore($doctors);
  const sessionDoc = useStore($sessionDoctorId);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const [tab, setTab] = useState<TabKey>('waiting');
  const [poli, setPoli] = useState('');
  const [doc, setDoc] = useState('');

  useEffect(() => {
    if (sessionDoc) {
      setDoc(sessionDoc);
      setPoli(doctors.find((d) => d.id === sessionDoc)?.poliId ?? '');
    }
  }, [sessionDoc, doctors.length]);

  const scoped = today.filter((v) => (!poli || v.poliId === poli) && (!doc || v.doctorId === doc));
  const groups: Record<TabKey, Visit[]> = {
    waiting: scoped.filter((v) => v.status === 'MENUNGGU' || v.status === 'DIPANGGIL').sort(queueOrder),
    exam: scoped.filter((v) => v.status === 'DIPERIKSA'),
    done: scoped.filter((v) => ['FARMASI', 'KASIR', 'SELESAI'].includes(v.status)),
  };
  const hasVitals = (v: Visit) => !!mrs.find((m) => m.visitId === v.id)?.vitals;

  const doCall = (v: Visit) => {
    if (run(() => callVisit(v.id), `Memanggil ${v.queueNo}`, pMap.get(v.patientId)?.name)) announce(v.queueNo, poliMap.get(v.poliId)?.name ?? '');
  };
  const doExam = (v: Visit) => {
    if (['MENUNGGU', 'DIPANGGIL'].includes(v.status)) run(() => startExam(v.id));
    go(`/app/rekam-medis/periksa?visit=${v.id}`);
  };

  const columns: Column<Visit>[] = [
    { key: 'q', header: 'Antrian', sort: (v) => v.queueNo, render: (v) => <span class={`tabular font-heading text-base font-bold ${v.status === 'DIPANGGIL' ? 'text-primary' : ''}`}>{v.queueNo}</span> },
    {
      key: 'p',
      header: 'Pasien',
      sort: (v) => pMap.get(v.patientId)?.name ?? '',
      render: (v) => {
        const p = pMap.get(v.patientId);
        return p ? (
          <div class="flex flex-wrap items-center gap-2">
            <PatientCell p={p} />
            <AllergyBadge allergies={p.allergies} full />
          </div>
        ) : (
          '-'
        );
      },
    },
    { key: 'age', header: 'Umur/JK', render: (v) => { const p = pMap.get(v.patientId); return p ? `${ageLabel(p.birthDate)} / ${p.gender}` : '-'; } },
    { key: 'payer', header: 'Penjamin', render: (v) => <PayerBadge payer={v.payer} /> },
    { key: 'poli', header: 'Poli / Dokter', render: (v) => <div><p class="text-sm font-medium">{poliMap.get(v.poliId)?.name}</p><p class="text-xs text-muted">{docMap.get(v.doctorId)?.name}</p></div> },
    { key: 'time', header: 'Daftar', sort: (v) => v.registeredAt, render: (v) => <span class="tabular">{timeHM(v.registeredAt)}</span> },
    {
      key: 'ttv',
      header: 'TTV',
      render: (v) =>
        hasVitals(v) ? (
          <Badge tone="success">
            <HeartPulse size={12} /> Terisi
          </Badge>
        ) : (
          <Badge tone="warning">Belum</Badge>
        ),
    },
    { key: 'st', header: 'Status', render: (v) => <StatusPill status={VISIT_STATUS[v.status]} /> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (v) => (
        <div class="flex justify-end gap-1.5">
          {(v.status === 'MENUNGGU' || v.status === 'DIPANGGIL') && (
            <button type="button" class="btn btn-secondary btn-sm" onClick={() => doCall(v)}>
              <Megaphone size={14} /> {v.status === 'DIPANGGIL' ? 'Ulang' : 'Panggil'}
            </button>
          )}
          <button type="button" class="btn btn-primary btn-sm" onClick={() => doExam(v)}>
            <Stethoscope size={14} /> {tab === 'done' ? 'Lihat' : 'Periksa'}
          </button>
          <a href={`/app/rekam-medis/riwayat?id=${v.patientId}`} class="btn-icon h-8 w-8" title="Lihat riwayat" aria-label="Lihat riwayat rekam medis">
            <History size={16} />
          </a>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Rekam Medis" subtitle="Worklist pasien poliklinik hari ini. Klik Periksa untuk membuka form pemeriksaan (TTV, SOAP, diagnosa, tindakan, resep)." />
      <div class="card">
        <div class="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <select class="input w-auto" value={poli} onChange={(e) => { setPoli((e.target as HTMLSelectElement).value); setDoc(''); }} aria-label="Filter poli">
            <option value="">Semua poli</option>
            {polis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select class="input w-auto" value={doc} onChange={(e) => setDoc((e.target as HTMLSelectElement).value)} aria-label="Filter dokter">
            <option value="">Semua dokter</option>
            {doctors
              .filter((d) => !poli || d.poliId === poli)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
          {sessionDoc && doc === sessionDoc && <Badge tone="primary">Menampilkan pasien Anda</Badge>}
        </div>
        <Tabs
          class="px-3"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'waiting', label: 'Menunggu', count: groups.waiting.length },
            { key: 'exam', label: 'Sedang Diperiksa', count: groups.exam.length },
            { key: 'done', label: 'Selesai', count: groups.done.length },
          ]}
        />
        <DataTable columns={columns} rows={groups[tab]} rowKey={(v) => v.id} loading={!ready} pageSizes={[25, 50]} empty={{ title: 'Tidak ada pasien', description: 'Belum ada pasien pada status ini untuk filter yang dipilih.' }} />
      </div>
    </div>
  );
}
