import { useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ClipboardPlus, Download, Eye, Pencil, IdCard, UserPlus } from 'lucide-preact';
import { downloadCsv } from '../../../lib/csv';
import { age, ageLabel, dateShort, maskId } from '../../../lib/format';
import { PAYER_LABEL } from '../../../lib/constants';
import type { Patient } from '../../../lib/types';
import { $patients, $visits } from '../../../stores/db';
import { $insurerMap } from '../../../stores/selectors';
import { toast } from '../../../stores/ui';
import { DataTable, type Column } from '../../ui/DataTable';
import { PageHeader } from '../../ui/Display';
import { useReady } from '../../ui/hooks';
import { AllergyBadge, PatientCell, PayerBadge, SearchInput } from '../shared';

export default function PatientList() {
  const ready = useReady();
  const patients = useStore($patients);
  const visits = useStore($visits);
  const insurers = useStore($insurerMap);
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [payer, setPayer] = useState('');
  const [ageGroup, setAgeGroup] = useState('');

  const lastVisit = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of visits) if (v.status !== 'BATAL' && (m.get(v.patientId) ?? '') < v.registeredAt) m.set(v.patientId, v.registeredAt);
    return m;
  }, [visits]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return patients.filter((p) => {
      if (term && !(p.name.toLowerCase().includes(term) || p.mrn.toLowerCase().includes(term) || p.nik.includes(term) || (p.payer.memberNo ?? '').includes(term))) return false;
      if (gender && p.gender !== gender) return false;
      if (payer && p.payer.type !== payer) return false;
      if (ageGroup) {
        const a = age(p.birthDate);
        if (ageGroup === 'anak' && a >= 18) return false;
        if (ageGroup === 'dewasa' && (a < 18 || a >= 60)) return false;
        if (ageGroup === 'lansia' && a < 60) return false;
      }
      return true;
    });
  }, [patients, q, gender, payer, ageGroup]);

  const columns: Column<Patient>[] = [
    { key: 'mrn', header: 'No RM', sort: (p) => p.mrn, render: (p) => <span class="tabular font-medium">{p.mrn}</span> },
    {
      key: 'name',
      header: 'Nama',
      sort: (p) => p.name,
      render: (p) => (
        <div class="flex items-center gap-2">
          <PatientCell p={p} href={`/app/pasien/detail?id=${p.id}`} />
          <AllergyBadge allergies={p.allergies} />
        </div>
      ),
    },
    { key: 'gender', header: 'JK', render: (p) => p.gender },
    { key: 'birth', header: 'Tgl Lahir (Umur)', sort: (p) => p.birthDate, render: (p) => <span class="tabular">{dateShort(p.birthDate)} <span class="text-muted">({ageLabel(p.birthDate)})</span></span> },
    { key: 'nik', header: 'NIK', render: (p) => <span class="tabular text-muted">{maskId(p.nik)}</span> },
    { key: 'phone', header: 'No HP', render: (p) => <span class="tabular">{p.phone}</span> },
    { key: 'payer', header: 'Penjamin', sort: (p) => p.payer.type, render: (p) => <PayerBadge payer={p.payer} /> },
    { key: 'last', header: 'Kunjungan Terakhir', sort: (p) => lastVisit.get(p.id) ?? '', render: (p) => <span class="tabular text-muted">{dateShort(lastVisit.get(p.id))}</span> },
    {
      key: 'act',
      header: <span class="sr-only">Aksi</span>,
      class: 'text-right',
      render: (p) => (
        <div class="flex justify-end gap-1">
          <a href={`/app/pasien/detail?id=${p.id}`} class="btn-icon h-8 w-8" title="Lihat" aria-label={`Lihat ${p.name}`}>
            <Eye size={16} />
          </a>
          <a href={`/app/pasien/edit?id=${p.id}`} class="btn-icon h-8 w-8" title="Edit" aria-label={`Edit ${p.name}`}>
            <Pencil size={16} />
          </a>
          <a href={`/app/pendaftaran/baru?patient=${p.id}`} class="btn-icon h-8 w-8 text-primary hover:text-primary-hover" title="Daftarkan Kunjungan" aria-label={`Daftarkan kunjungan ${p.name}`}>
            <ClipboardPlus size={16} />
          </a>
          <a href={`/app/pasien/kartu?id=${p.id}`} class="btn-icon h-8 w-8" title="Cetak Kartu" aria-label={`Cetak kartu ${p.name}`}>
            <IdCard size={16} />
          </a>
        </div>
      ),
    },
  ];

  const exportCsv = () => {
    downloadCsv(
      `data-pasien-${new Date().toISOString().slice(0, 10)}`,
      ['No RM', 'Nama', 'JK', 'Tanggal Lahir', 'Umur', 'NIK', 'No HP', 'Penjamin', 'No Kartu', 'Alamat', 'Kota', 'Alergi', 'Kunjungan Terakhir'],
      rows.map((p) => [
        p.mrn,
        p.name,
        p.gender,
        p.birthDate,
        age(p.birthDate),
        maskId(p.nik),
        p.phone,
        p.payer.type === 'ASURANSI' ? insurers.get(p.payer.insurerId ?? '')?.name : PAYER_LABEL[p.payer.type],
        p.payer.memberNo ? maskId(p.payer.memberNo) : '',
        p.address.street,
        p.address.city,
        p.allergies.join(', '),
        lastVisit.get(p.id)?.slice(0, 10) ?? '',
      ]),
    );
    toast('Export CSV berhasil', { message: `${rows.length} pasien diunduh` });
  };

  return (
    <div>
      <PageHeader
        title="Data Pasien"
        subtitle="Master data pasien rumah sakit. NIK dan No BPJS ditampilkan tersamar."
        actions={
          <>
            <button type="button" class="btn btn-secondary" onClick={exportCsv} disabled={!ready}>
              <Download size={16} /> Export CSV
            </button>
            <a href="/app/pasien/baru" class="btn btn-primary">
              <UserPlus size={16} /> Tambah Pasien
            </a>
          </>
        }
      />
      <div class="card">
        <div class="flex flex-wrap gap-3 border-b border-border p-4">
          <SearchInput class="min-w-[240px] flex-1" value={q} onValue={setQ} placeholder="Cari No RM, nama, NIK, No BPJS..." />
          <select class="input w-auto" value={gender} onChange={(e) => setGender((e.target as HTMLSelectElement).value)} aria-label="Filter jenis kelamin">
            <option value="">Semua JK</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          <select class="input w-auto" value={payer} onChange={(e) => setPayer((e.target as HTMLSelectElement).value)} aria-label="Filter penjamin">
            <option value="">Semua penjamin</option>
            <option value="UMUM">Umum</option>
            <option value="BPJS">BPJS</option>
            <option value="ASURANSI">Asuransi</option>
          </select>
          <select class="input w-auto" value={ageGroup} onChange={(e) => setAgeGroup((e.target as HTMLSelectElement).value)} aria-label="Filter rentang umur">
            <option value="">Semua umur</option>
            <option value="anak">Anak (&lt; 18 th)</option>
            <option value="dewasa">Dewasa (18-59 th)</option>
            <option value="lansia">Lansia (≥ 60 th)</option>
          </select>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          loading={!ready}
          initialSort={{ key: 'mrn', dir: 'desc' }}
          caption="Daftar pasien"
          empty={{
            title: 'Pasien tidak ditemukan',
            description: 'Coba ubah kata kunci atau filter, atau tambahkan pasien baru.',
            action: (
              <a href="/app/pasien/baru" class="btn btn-primary btn-sm mt-2">
                <UserPlus size={14} /> Tambah Pasien
              </a>
            ),
          }}
        />
      </div>
    </div>
  );
}
