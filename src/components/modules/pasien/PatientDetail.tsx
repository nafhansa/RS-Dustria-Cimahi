import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { ClipboardPlus, FileText, History, IdCard, Pencil, Upload, Eye } from 'lucide-preact';
import { invoiceTotals } from '../../../lib/billing';
import { INVOICE_STATUS, RX_STATUS, VISIT_STATUS } from '../../../lib/constants';
import { ageLabel, dateLong, dateShort, dateTime, genderLabel, rupiah } from '../../../lib/format';
import { $invoices, $medicalRecords, $patients, $payments, $prescriptions, $visits } from '../../../stores/db';
import { $doctorMap, $insurerMap, $medMap, $poliMap } from '../../../stores/selectors';
import { showInfo } from '../../../stores/ui';
import { StatusPill } from '../../ui/Badge';
import { Avatar, EmptyState, KV, NotFound, PageSkeleton } from '../../ui/Display';
import { Tabs } from '../../ui/Tabs';
import { useParam, useReady } from '../../ui/hooks';
import { AllergyBadge, PayerBadge } from '../shared';

type TabKey = 'profil' | 'kunjungan' | 'rm' | 'resep' | 'tagihan' | 'dokumen';

export default function PatientDetail() {
  const ready = useReady();
  const id = useParam('id');
  const patients = useStore($patients);
  const visits = useStore($visits);
  const mrs = useStore($medicalRecords);
  const rxs = useStore($prescriptions);
  const invoices = useStore($invoices);
  const payments = useStore($payments);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const medMap = useStore($medMap);
  const insurers = useStore($insurerMap);
  const [tab, setTab] = useState<TabKey>('profil');

  if (!ready) return <PageSkeleton />;
  const p = patients.find((x) => x.id === id);
  if (!p) return <NotFound what="Pasien" back={{ href: '/app/pasien', label: 'Kembali ke daftar pasien' }} />;

  const pv = visits.filter((v) => v.patientId === p.id).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  const pmr = mrs.filter((m) => m.patientId === p.id && m.status === 'FINAL');
  const prx = rxs.filter((r) => r.patientId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pinv = invoices.filter((i) => i.patientId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visitOf = (vid: string) => visits.find((v) => v.id === vid);
  const a = p.address;

  return (
    <div>
      <a href="/app/pasien" class="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        ← Data pasien
      </a>
      <div class="card mb-6 p-5">
        <div class="flex flex-wrap items-start gap-4">
          <Avatar name={p.name} size={64} />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold">{p.name}</h1>
              <PayerBadge payer={p.payer} />
              <AllergyBadge allergies={p.allergies} full />
            </div>
            <p class="tabular mt-1 text-sm text-muted">
              <span class="font-semibold text-text">{p.mrn}</span> · {genderLabel(p.gender)} · {ageLabel(p.birthDate)} ({dateShort(p.birthDate)}) · Gol. darah {p.bloodType ?? '-'}
            </p>
            <p class="mt-0.5 text-sm text-muted">
              {p.phone} · {a.street}, {a.district ?? ''} {a.city}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a href={`/app/pasien/edit?id=${p.id}`} class="btn btn-secondary">
              <Pencil size={16} /> Edit
            </a>
            <a href={`/app/pasien/kartu?id=${p.id}`} class="btn btn-secondary">
              <IdCard size={16} /> Cetak Kartu
            </a>
            <a href={`/app/rekam-medis/riwayat?id=${p.id}`} class="btn btn-secondary">
              <History size={16} /> Lihat Riwayat RM
            </a>
            <a href={`/app/pendaftaran/baru?patient=${p.id}`} class="btn btn-primary">
              <ClipboardPlus size={16} /> Daftarkan Kunjungan
            </a>
          </div>
        </div>
      </div>

      <div class="card">
        <Tabs
          class="px-3"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'profil', label: 'Profil' },
            { key: 'kunjungan', label: 'Riwayat Kunjungan', count: pv.length },
            { key: 'rm', label: 'Rekam Medis', count: pmr.length },
            { key: 'resep', label: 'Resep', count: prx.length },
            { key: 'tagihan', label: 'Tagihan', count: pinv.length },
            { key: 'dokumen', label: 'Dokumen' },
          ]}
        />
        <div class="p-5">
          {tab === 'profil' && (
            <div class="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 class="mb-3 text-sm font-semibold text-muted">Identitas</h3>
                <KV
                  items={[
                    ['NIK', <span class="tabular">{p.nik}</span>],
                    ['No KK', <span class="tabular">{p.kk}</span>],
                    ['Tempat, tanggal lahir', `${p.birthPlace ?? '-'}, ${dateLong(p.birthDate)}`],
                    ['Agama', p.religion],
                    ['Status pernikahan', p.maritalStatus],
                    ['Pendidikan', p.education],
                    ['Pekerjaan', p.occupation],
                    ['Kewarganegaraan', p.nationality],
                  ]}
                />
              </div>
              <div>
                <h3 class="mb-3 text-sm font-semibold text-muted">Kontak & Alamat</h3>
                <KV
                  items={[
                    ['No HP', p.phone],
                    ['Email', p.email],
                    ['Alamat', `${a.street}${a.rt ? `, RT ${a.rt}/RW ${a.rw}` : ''}`],
                    ['Kelurahan / Kecamatan', `${a.village ?? '-'} / ${a.district ?? '-'}`],
                    ['Kota / Provinsi', `${a.city}, ${a.province} ${a.postalCode ?? ''}`],
                    ['Kontak darurat', p.emergencyContact ? `${p.emergencyContact.name} (${p.emergencyContact.relation}) · ${p.emergencyContact.phone}` : '-'],
                  ]}
                />
              </div>
              <div>
                <h3 class="mb-3 text-sm font-semibold text-muted">Penjamin</h3>
                <KV
                  items={[
                    ['Jenis', p.payer.type === 'ASURANSI' ? insurers.get(p.payer.insurerId ?? '')?.name : p.payer.type === 'BPJS' ? 'BPJS Kesehatan' : 'Umum'],
                    ['No kartu / polis', <span class="tabular">{p.payer.memberNo}</span>],
                    ['Kelas', p.payer.class ? `Kelas ${p.payer.class}` : '-'],
                  ]}
                />
              </div>
              <div>
                <h3 class="mb-3 text-sm font-semibold text-muted">Medis Dasar</h3>
                <KV
                  items={[
                    ['Alergi', p.allergies.length ? <span class="font-semibold text-danger-strong">{p.allergies.join(', ')}</span> : 'Tidak ada'],
                    ['Riwayat penyakit', p.medicalHistory],
                    ['Catatan', p.notes],
                    ['Terdaftar sejak', dateTime(p.createdAt)],
                  ]}
                  cols={1}
                />
              </div>
            </div>
          )}

          {tab === 'kunjungan' &&
            (pv.length === 0 ? (
              <EmptyState title="Belum ada kunjungan" action={<a href={`/app/pendaftaran/baru?patient=${p.id}`} class="btn btn-primary btn-sm">Daftarkan Kunjungan</a>} />
            ) : (
              <div class="-mx-5 overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>No Registrasi</th>
                      <th>Poli</th>
                      <th>Dokter</th>
                      <th>Jenis</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pv.map((v) => (
                      <tr key={v.id}>
                        <td class="tabular">{dateTime(v.registeredAt)}</td>
                        <td class="tabular font-medium">{v.regNo}</td>
                        <td>{poliMap.get(v.poliId)?.name}</td>
                        <td>{docMap.get(v.doctorId)?.name}</td>
                        <td>{v.type === 'IGD' ? 'IGD' : 'Rawat Jalan'}</td>
                        <td>
                          <StatusPill status={VISIT_STATUS[v.status]} />
                        </td>
                        <td class="text-right">
                          <a href={`/app/pendaftaran/detail?id=${v.id}`} class="link text-sm">
                            Detail
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'rm' &&
            (pmr.length === 0 ? (
              <EmptyState title="Belum ada rekam medis final" />
            ) : (
              <div>
                <ol class="relative space-y-4 border-l-2 border-border pl-6">
                  {pmr
                    .map((m) => ({ m, v: visitOf(m.visitId) }))
                    .sort((x, y) => (y.v?.registeredAt ?? '').localeCompare(x.v?.registeredAt ?? ''))
                    .slice(0, 8)
                    .map(({ m, v }) => (
                      <li key={m.id} class="relative">
                        <span class="absolute top-1.5 -left-[31px] h-3 w-3 rounded-full border-2 border-white bg-primary ring-2 ring-primary-soft" />
                        <p class="text-xs text-muted">
                          {dateLong(v?.registeredAt)} · {poliMap.get(v?.poliId ?? '')?.name} · {docMap.get(m.doctorId)?.name}
                        </p>
                        <p class="font-medium">{m.diagnoses.map((d) => `${d.code} ${d.name}`).join('; ')}</p>
                        <p class="text-sm text-muted line-clamp-2">{m.soap.s}</p>
                      </li>
                    ))}
                </ol>
                <a href={`/app/rekam-medis/riwayat?id=${p.id}`} class="btn btn-secondary btn-sm mt-4">
                  Lihat riwayat lengkap
                </a>
              </div>
            ))}

          {tab === 'resep' &&
            (prx.length === 0 ? (
              <EmptyState title="Belum ada resep" />
            ) : (
              <div class="-mx-5 overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>No Resep</th>
                      <th>Tanggal</th>
                      <th>Dokter</th>
                      <th>Obat</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prx.map((r) => (
                      <tr key={r.id}>
                        <td class="tabular font-medium">{r.rxNo}</td>
                        <td class="tabular">{dateShort(r.createdAt)}</td>
                        <td>{docMap.get(r.doctorId)?.name}</td>
                        <td class="text-sm">{r.items.map((i) => `${medMap.get(i.substituteId || i.medicineId)?.name} ${i.frequency}`).join(', ')}</td>
                        <td>
                          <StatusPill status={RX_STATUS[r.status]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'tagihan' &&
            (pinv.length === 0 ? (
              <EmptyState title="Belum ada tagihan" />
            ) : (
              <div class="-mx-5 overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>No Invoice</th>
                      <th>Tanggal</th>
                      <th class="text-right">Total</th>
                      <th class="text-right">Ditanggung</th>
                      <th class="text-right">Pasien</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pinv.map((i) => {
                      const t = invoiceTotals(i, payments);
                      return (
                        <tr key={i.id}>
                          <td class="tabular font-medium">{i.invoiceNo}</td>
                          <td class="tabular">{dateShort(i.createdAt)}</td>
                          <td class="num text-right">{rupiah(t.subtotal)}</td>
                          <td class="num text-right">{rupiah(t.covered)}</td>
                          <td class="num text-right font-semibold">{rupiah(t.due)}</td>
                          <td>
                            <StatusPill status={INVOICE_STATUS[i.status]} />
                          </td>
                          <td class="text-right">
                            <a href={`/app/kasir/tagihan?id=${i.id}`} class="link text-sm">
                              Buka
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'dokumen' && (
            <div>
              <div class="mb-4 flex justify-end">
                <button type="button" class="btn btn-secondary btn-sm" onClick={() => showInfo('Unggah Dokumen', 'Unggah dokumen pasien (scan KTP, hasil lab luar, surat rujukan) tersedia pada versi produksi dengan penyimpanan terenkripsi.')}>
                  <Upload size={14} /> Unggah Dokumen
                </button>
              </div>
              <ul class="divide-y divide-border rounded-[var(--radius-card)] border border-border">
                {[
                  ['Scan KTP', 'ktp.jpg', '312 KB'],
                  p.payer.type === 'BPJS' ? ['Kartu BPJS Kesehatan', 'kartu-bpjs.jpg', '284 KB'] : ['Kartu Asuransi / Identitas Penjamin', 'kartu-penjamin.jpg', '201 KB'],
                  ['General Consent (Persetujuan Umum)', 'general-consent.pdf', '96 KB'],
                ].map(([title, file, size]) => (
                  <li key={file} class="flex items-center gap-3 px-4 py-3">
                    <FileText size={20} class="text-subtle" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium">{title}</p>
                      <p class="text-xs text-muted">
                        {file} · {size} · diunggah {dateShort(p.createdAt)}
                      </p>
                    </div>
                    <button type="button" class="btn btn-ghost btn-sm" onClick={() => showInfo(title, 'Pratinjau dokumen tersedia pada versi produksi. Pada demo, berkas hanya contoh.')}>
                      <Eye size={14} /> Lihat
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
