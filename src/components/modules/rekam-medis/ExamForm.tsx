import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { AlertTriangle, CheckCircle2, ChevronDown, FilePlus2, FileSignature, Lock, Plus, Printer, Save, Send, Stethoscope, Trash2, ArrowLeft } from 'lucide-preact';
import icd10 from '../../../data/seed/icd10.json';
import { FREQUENCIES, INSTRUCTIONS, MED_FORM_LABEL, PROC_CATEGORY_LABEL, ROUTES, RX_STATUS, SOAP_TEMPLATES, VISIT_STATUS } from '../../../lib/constants';
import { dateLong, dateShort, dateTime, rupiah } from '../../../lib/format';
import { allergyMatch, rxQty, totalStock } from '../../../lib/stock';
import type { Diagnosis, FollowUpType, MedicalRecord, Medicine, RxItem, Vitals } from '../../../lib/types';
import { $medicalRecords, $medicines, $polis, $prescriptions, $procedureActions, $procedureMaster, $users, $visits } from '../../../stores/db';
import { $session } from '../../../stores/session';
import { $doctorMap, $medMap, $patientMap, $poliMap, $procMap, $personName } from '../../../stores/selectors';
import { addAddendum, addProcedure, completeExam, getOrCreateMR, removeProcedure, saveMRDraft, saveVitals, startExam, submitPrescription, validateExam } from '../../../stores/actions';
import { confirmDialog, toast } from '../../../stores/ui';
import { Badge, StatusPill } from '../../ui/Badge';
import { Combobox } from '../../ui/Combobox';
import { NotFound, PageSkeleton } from '../../ui/Display';
import { Input, RadioGroup, Select, Textarea } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { Tabs } from '../../ui/Tabs';
import { go, run, useHotkey, useParam, useReady } from '../../ui/hooks';
import { PayerBadge } from '../shared';
import { Avatar } from '../../ui/Display';
import { ageLabel, genderLabel } from '../../../lib/format';

type TabKey = 'ttv' | 'soap' | 'dx' | 'tindakan' | 'resep' | 'lanjut';

const RANGES: Record<string, [number, number, string]> = {
  sys: [90, 139, 'mmHg'],
  dia: [60, 89, 'mmHg'],
  pulse: [60, 100, 'x/mnt'],
  temp: [36, 37.5, '°C'],
  rr: [12, 20, 'x/mnt'],
  spo2: [95, 100, '%'],
  bmi: [18.5, 24.9, 'kg/m²'],
};
const outOfRange = (k: string, v?: number) => v !== undefined && !Number.isNaN(v) && RANGES[k] && (v < RANGES[k][0] || v > RANGES[k][1]);

type VitalForm = Partial<Record<'sys' | 'dia' | 'pulse' | 'temp' | 'rr' | 'spo2' | 'weight' | 'height', string>> & { pain: number; chiefComplaint: string };

function vitalsToForm(v?: Vitals): VitalForm {
  const s = (n?: number) => (n === undefined ? '' : String(n));
  return { sys: s(v?.sys), dia: s(v?.dia), pulse: s(v?.pulse), temp: s(v?.temp), rr: s(v?.rr), spo2: s(v?.spo2), weight: s(v?.weight), height: s(v?.height), pain: v?.pain ?? 0, chiefComplaint: v?.chiefComplaint ?? '' };
}
const numOrU = (s?: string) => (s === undefined || s.trim() === '' ? undefined : Number(s.replace(',', '.')));

export default function ExamForm() {
  const ready = useReady(150);
  const visitId = useParam('visit');
  const visits = useStore($visits);
  const mrs = useStore($medicalRecords);
  const rxs = useStore($prescriptions);
  const pActions = useStore($procedureActions);
  const procs = useStore($procedureMaster);
  const meds = useStore($medicines);
  const users = useStore($users);
  const polis = useStore($polis);
  const session = useStore($session);
  const pMap = useStore($patientMap);
  const poliMap = useStore($poliMap);
  const docMap = useStore($doctorMap);
  const medMap = useStore($medMap);
  const procMap = useStore($procMap);
  const personName = useStore($personName);

  const visit = visits.find((v) => v.id === visitId);
  const mr = mrs.find((m) => m.visitId === visitId);
  const rx = rxs.find((r) => r.visitId === visitId && r.status !== 'BATAL') ?? rxs.find((r) => r.visitId === visitId);
  const patient = visit ? pMap.get(visit.patientId) : undefined;

  const [tab, setTab] = useState<TabKey>('ttv');
  const [vf, setVf] = useState<VitalForm>(vitalsToForm());
  const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' });
  const [dx, setDx] = useState<Diagnosis[]>([]);
  const [fu, setFu] = useState<NonNullable<MedicalRecord['followUp']>>({ type: 'PULANG' });
  const [rxDraft, setRxDraft] = useState<RxItem[]>([]);
  const [procQty, setProcQty] = useState(1);
  const [procNote, setProcNote] = useState('');
  const [procPerformer, setProcPerformer] = useState('');
  const [initKey, setInitKey] = useState('');
  const [dirty, setDirty] = useState(false);
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [addendumText, setAddendumText] = useState('');
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // ensure a draft medical record exists
  useEffect(() => {
    if (ready && visit && visit.status !== 'BATAL' && !mr) run(() => getOrCreateMR(visit.id));
  }, [ready, visit?.id, !!mr]);

  // load record into local form once
  useEffect(() => {
    if (!mr || initKey === mr.id) return;
    setVf(vitalsToForm(mr.vitals));
    setSoap({ ...mr.soap });
    setDx([...mr.diagnoses]);
    setFu(mr.followUp ?? { type: 'PULANG' });
    setInitKey(mr.id);
    setDirty(false);
    if (session?.role === 'DOKTER' || mr.vitals) setTab(mr.status === 'FINAL' ? 'soap' : mr.vitals ? 'soap' : 'ttv');
  }, [mr?.id]);

  useEffect(() => {
    if (visit && !procPerformer) setProcPerformer(session?.role === 'PERAWAT' ? session.userId : visit.doctorId);
  }, [visit?.id, session?.role]);

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty || rxDraft.length) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty, rxDraft.length]);

  const role = session?.role;
  const locked = mr?.status === 'FINAL';
  const canTTV = !locked && (role === 'PERAWAT' || role === 'DOKTER' || role === 'SUPERADMIN');
  const canDoc = !locked && (role === 'DOKTER' || role === 'SUPERADMIN');
  const canProc = !locked && (role === 'DOKTER' || role === 'PERAWAT' || role === 'SUPERADMIN');
  const waitingStatus = visit && ['MENUNGGU', 'DIPANGGIL', 'TERDAFTAR'].includes(visit.status);

  const bmi = useMemo(() => {
    const w = numOrU(vf.weight);
    const h = numOrU(vf.height);
    return w && h ? +(w / (h / 100) ** 2).toFixed(1) : undefined;
  }, [vf.weight, vf.height]);

  const history = useMemo(() => {
    if (!visit) return [];
    return visits
      .filter((v) => v.patientId === visit.patientId && v.id !== visit.id && v.status !== 'BATAL')
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
      .slice(0, 3)
      .map((v) => ({ v, m: mrs.find((m) => m.visitId === v.id) }));
  }, [visits, mrs, visit?.id]);

  const routineMeds = useMemo(() => {
    if (!visit) return [];
    const last = rxs.filter((r) => r.patientId === visit.patientId && r.visitId !== visit.id && r.status === 'DISERAHKAN').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return last ? last.items.map((i) => `${medMap.get(i.substituteId || i.medicineId)?.name} ${i.frequency}`) : [];
  }, [rxs, visit?.id]);

  const visitProcs = pActions.filter((a) => a.visitId === visitId);

  const vitalsFromForm = () => ({
    sys: numOrU(vf.sys),
    dia: numOrU(vf.dia),
    pulse: numOrU(vf.pulse),
    temp: numOrU(vf.temp),
    rr: numOrU(vf.rr),
    spo2: numOrU(vf.spo2),
    weight: numOrU(vf.weight),
    height: numOrU(vf.height),
    pain: vf.pain,
    chiefComplaint: vf.chiefComplaint,
  });

  const saveTTV = () => {
    if (!mr) return;
    const v = vitalsFromForm();
    if (v.sys === undefined && v.pulse === undefined && v.temp === undefined && !v.chiefComplaint) {
      toast('Isi minimal tekanan darah, nadi, suhu, atau keluhan utama', { tone: 'warning' });
      return;
    }
    run(() => saveVitals(mr.id, v), 'Tanda vital tersimpan', patient?.name);
  };

  const saveDraft = (silent = false) => {
    if (!mr || locked) return false;
    if (role === 'PERAWAT') {
      saveTTV();
      return true;
    }
    const ok = run(() => saveMRDraft(mr.id, { soap, diagnoses: dx, followUp: fu }, silent), silent ? undefined : 'Draft rekam medis tersimpan');
    if (ok) setDirty(false);
    return !!ok;
  };

  useHotkey('s', () => saveDraft(), [mr?.id, soap, dx, fu, locked, role, vf]);

  const prefillO = () => {
    const v = vitalsFromForm();
    const parts = [
      v.sys && v.dia ? `TD ${v.sys}/${v.dia} mmHg` : '',
      v.pulse ? `N ${v.pulse}x/mnt` : '',
      v.temp ? `S ${v.temp}°C` : '',
      v.rr ? `RR ${v.rr}x/mnt` : '',
      v.spo2 ? `SpO2 ${v.spo2}%` : '',
      bmi ? `IMT ${bmi}` : '',
    ].filter(Boolean);
    setSoap((s) => ({ ...s, o: `${parts.join(', ')}.${s.o ? ` ${s.o.replace(/^TD[^.]*\.\s*/, '')}` : ''}` }));
    setDirty(true);
  };

  const applyTemplate = (label: string) => {
    const t = SOAP_TEMPLATES.find((x) => x.label === label);
    if (!t) return;
    const v = vitalsFromForm();
    const vit = v.sys ? `TD ${v.sys}/${v.dia} mmHg, N ${v.pulse ?? '-'}x/mnt, S ${v.temp ?? '-'}°C, RR ${v.rr ?? '-'}x/mnt, SpO2 ${v.spo2 ?? '-'}%. ` : '';
    setSoap({ s: v.chiefComplaint ? `${v.chiefComplaint}. ${t.s}` : t.s, o: vit + t.o, a: t.a, p: t.p });
    if (t.icd && !dx.some((d) => d.code === t.icd)) {
      const item = (icd10 as { code: string; name: string }[]).find((i) => i.code === t.icd);
      if (item) setDx((prev) => [...prev, { code: item.code, name: item.name, type: prev.some((p) => p.type === 'PRIMER') ? 'SEKUNDER' : 'PRIMER' }]);
    }
    setDirty(true);
    toast(`Template "${t.label}" diterapkan`, { tone: 'info', message: t.icd ? `Diagnosa ${t.icd} ditambahkan` : undefined });
  };

  const addDx = (code: string, name: string) => {
    if (dx.some((d) => d.code === code)) return toast('Diagnosa sudah ditambahkan', { tone: 'warning' });
    setDx([...dx, { code, name, type: dx.some((d) => d.type === 'PRIMER') ? 'SEKUNDER' : 'PRIMER' }]);
    setDirty(true);
  };

  const addProc = (procedureId: string) => {
    if (!visit) return;
    if (run(() => addProcedure(visit.id, procedureId, procQty, procPerformer || visit.doctorId, procNote || undefined), 'Tindakan ditambahkan ke tagihan', procMap.get(procedureId)?.name)) {
      setProcQty(1);
      setProcNote('');
    }
  };

  const addMed = async (m: Medicine) => {
    if (!patient) return;
    if (rxDraft.some((i) => i.medicineId === m.id)) return toast('Obat sudah ada di resep', { tone: 'warning' });
    const hit = allergyMatch(patient.allergies, m);
    if (hit) {
      const r = await confirmDialog({
        title: 'Peringatan alergi obat',
        message: `Pasien memiliki riwayat alergi "${hit}". ${m.name} (${m.genericName}) termasuk golongan yang berisiko. Tetap tambahkan ke resep?`,
        confirmLabel: 'Tetap tambahkan',
        tone: 'danger',
      });
      if (!r.ok) return;
    }
    const route = m.form === 'TETES' ? (m.name.toLowerCase().includes('telinga') ? 'Tetes telinga' : 'Tetes mata') : m.form === 'SALEP' ? 'Topikal' : m.form === 'INJEKSI' ? 'Intramuskular' : 'Oral';
    const frequency = m.form === 'SALEP' ? '2x1' : '3x1';
    const duration = 5;
    setRxDraft([...rxDraft, { medicineId: m.id, dose: m.form === 'SIRUP' ? '5 mL' : m.form === 'TETES' ? '1 tetes' : m.form === 'SALEP' ? 'Oles tipis' : '1 tablet', frequency, route, durationDays: duration, qty: rxQty(m, frequency, duration), instruction: m.form === 'SALEP' || m.form === 'TETES' ? 'Pada area yang sakit' : 'Sesudah makan' }]);
    if (totalStock(m) === 0) toast(`Stok ${m.name} habis`, { tone: 'warning', message: 'Farmasi dapat melakukan substitusi dengan obat setara.' });
  };

  const updateRx = (i: number, patch: Partial<RxItem>) => {
    setRxDraft((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, ...patch };
        if (('frequency' in patch || 'durationDays' in patch) && !('qty' in patch)) {
          const m = medMap.get(next.medicineId);
          if (m) next.qty = rxQty(m, next.frequency, next.durationDays);
        }
        return next;
      }),
    );
  };

  const sendRx = () => {
    if (!visit) return false;
    if (!rxDraft.length) {
      toast('Resep masih kosong', { tone: 'warning' });
      return false;
    }
    if (rxDraft.some((i) => !i.dose || !(i.qty > 0))) {
      toast('Lengkapi dosis dan jumlah setiap obat', { tone: 'warning' });
      return false;
    }
    const r = run(() => submitPrescription(visit.id, rxDraft), (x) => `Resep ${x.rxNo} dikirim ke farmasi`, `${rxDraft.length} item`);
    if (r) setRxDraft([]);
    return !!r;
  };

  const complete = async () => {
    if (!mr || !visit) return;
    const draftMr = { ...mr, soap, diagnoses: dx };
    const errs = validateExam(draftMr);
    if (errs.length) {
      setErrors(errs);
      setTab(dx.length ? 'soap' : 'dx');
      toast('Pemeriksaan belum lengkap', { tone: 'error', message: errs.join('. ') });
      return;
    }
    setErrors([]);
    const r = await confirmDialog({
      title: 'Selesaikan & tandatangani pemeriksaan?',
      message: `Rekam medis akan dikunci dengan tanda tangan elektronik ${personName(visit.doctorId)}. Perubahan setelahnya hanya melalui addendum.${rxDraft.length ? ` ${rxDraft.length} obat di draft resep akan dikirim ke farmasi.` : ''}`,
      confirmLabel: 'Selesaikan & Tandatangani',
    });
    if (!r.ok) return;
    if (waitingStatus) run(() => startExam(visit.id));
    if (!saveDraft(true)) return;
    if (rxDraft.length && !sendRx()) return;
    const res = run(() => completeExam(mr.id));
    if (!res) return;
    setDirty(false);
    const msg = res.next === 'FARMASI' ? 'Pasien diarahkan ke Farmasi' : res.next === 'KASIR' ? 'Pasien diarahkan ke Kasir' : 'Tagihan ditanggung penuh penjamin, kunjungan selesai';
    toast('Pemeriksaan selesai & ditandatangani', { message: msg });
  };

  const cancel = async () => {
    if (dirty || rxDraft.length) {
      const r = await confirmDialog({ title: 'Tinggalkan halaman?', message: 'Perubahan yang belum disimpan akan hilang.', confirmLabel: 'Tinggalkan', tone: 'danger' });
      if (!r.ok) return;
      setDirty(false);
      setRxDraft([]);
    }
    go('/app/rekam-medis');
  };

  const saveAddendum = () => {
    if (!mr) return;
    if (run(() => addAddendum(mr.id, addendumText), 'Addendum ditambahkan')) {
      setAddendumOpen(false);
      setAddendumText('');
    }
  };

  if (!ready) return <PageSkeleton />;
  if (!visit || !patient) return <NotFound what="Kunjungan" back={{ href: '/app/rekam-medis', label: 'Kembali ke worklist' }} />;
  if (visit.status === 'BATAL')
    return <NotFound what="Kunjungan aktif" back={{ href: '/app/rekam-medis', label: 'Kunjungan ini dibatalkan. Kembali ke worklist' }} />;
  if (!mr) return <PageSkeleton />;

  const markDirty = () => setDirty(true);
  const doctorUsers = users.filter((u) => u.role === 'PERAWAT');

  const vitalInput = (k: keyof VitalForm, label: string, unit: string, opts: { step?: string; disabled?: boolean } = {}) => {
    const val = vf[k] as string;
    const warn = outOfRange(k as string, numOrU(val));
    return (
      <div>
        <label for={`v-${k}`} class="field-label">
          {label}
        </label>
        <div class="relative">
          <input
            id={`v-${k}`}
            class={`input pr-14 ${warn ? 'border-warning bg-warning-soft' : ''}`}
            inputMode="decimal"
            value={val}
            disabled={!canTTV || opts.disabled}
            aria-describedby={warn ? `v-${k}-w` : undefined}
            onInput={(e) => {
              setVf({ ...vf, [k]: (e.target as HTMLInputElement).value.replace(/[^\d.,]/g, '') });
              markDirty();
            }}
          />
          <span class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-subtle">{unit}</span>
        </div>
        {warn && (
          <p id={`v-${k}-w`} class="mt-1 flex items-center gap-1 text-xs font-medium text-warning-strong">
            <AlertTriangle size={12} /> Di luar normal ({RANGES[k as string][0]}-{RANGES[k as string][1]})
          </p>
        )}
      </div>
    );
  };

  const lockedNote = (who: string) => (
    <p class="mb-4 flex items-center gap-2 rounded-[var(--radius-field)] bg-surface-2 px-3 py-2 text-sm text-muted">
      <Lock size={14} /> {locked ? 'Rekam medis terkunci (sudah ditandatangani).' : `Bagian ini diisi oleh ${who}. Ganti role untuk mengedit.`}
    </p>
  );

  return (
    <div>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <a href="/app/rekam-medis" class="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
            <ArrowLeft size={14} /> Worklist rekam medis
          </a>
          <h1 class="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold">
            Pemeriksaan <span class="tabular text-primary">{visit.queueNo}</span>
            <StatusPill status={VISIT_STATUS[visit.status]} />
          </h1>
          <p class="text-sm text-muted">
            {poliMap.get(visit.poliId)?.name} · {docMap.get(visit.doctorId)?.name} · {visit.regNo}
          </p>
        </div>
        {waitingStatus && !locked && (
          <button type="button" class="btn btn-primary" onClick={() => run(() => startExam(visit.id), 'Pemeriksaan dimulai')}>
            <Stethoscope size={16} /> Mulai Pemeriksaan
          </button>
        )}
      </div>

      {locked && (
        <div class="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-success/30 bg-success-soft p-4 text-success-strong">
          <FileSignature size={22} />
          <p class="flex-1 text-sm">
            <strong>Ditandatangani secara elektronik</strong> oleh {personName(mr.signedBy ?? mr.doctorId)} pada {dateTime(mr.signedAt)}. Rekam medis terkunci (read-only).
          </p>
          <button type="button" class="btn btn-secondary btn-sm" onClick={() => setAddendumOpen(true)}>
            <FilePlus2 size={14} /> Addendum
          </button>
        </div>
      )}

      <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left panel */}
        <aside class="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div class="card p-4">
            <div class="flex items-center gap-3">
              <Avatar name={patient.name} size={44} />
              <div class="min-w-0">
                <a href={`/app/pasien/detail?id=${patient.id}`} class="block truncate font-semibold hover:text-primary">
                  {patient.name}
                </a>
                <p class="tabular text-xs text-muted">
                  {patient.mrn} · {genderLabel(patient.gender)} · {ageLabel(patient.birthDate)}
                </p>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <PayerBadge payer={visit.payer} />
              <Badge>Gol. darah {patient.bloodType ?? '-'}</Badge>
            </div>
            {patient.allergies.length > 0 ? (
              <div class="mt-3 rounded-[var(--radius-field)] bg-danger p-3 text-white" role="alert">
                <p class="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                  <AlertTriangle size={14} /> Alergi
                </p>
                <p class="mt-0.5 font-semibold">{patient.allergies.join(', ')}</p>
              </div>
            ) : (
              <p class="mt-3 text-xs text-muted">Tidak ada riwayat alergi tercatat.</p>
            )}
            {patient.medicalHistory && <p class="mt-3 text-sm">
              <span class="text-xs font-medium text-subtle uppercase">Riwayat:</span> {patient.medicalHistory}
            </p>}
          </div>
          <div class="card p-4">
            <p class="mb-2 text-sm font-semibold">Riwayat 3 kunjungan terakhir</p>
            {history.length === 0 && <p class="text-sm text-muted">Kunjungan pertama.</p>}
            <ul class="space-y-2">
              {history.map(({ v, m }) => (
                <li key={v.id} class="rounded-[var(--radius-field)] border border-border">
                  <button type="button" class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left" onClick={() => setHistoryOpen(historyOpen === v.id ? null : v.id)} aria-expanded={historyOpen === v.id}>
                    <span class="min-w-0">
                      <span class="block text-xs text-muted">
                        {dateShort(v.registeredAt)} · {poliMap.get(v.poliId)?.name}
                      </span>
                      <span class="block truncate text-sm font-medium">{m?.diagnoses[0] ? `${m.diagnoses[0].code} ${m.diagnoses[0].name}` : 'Belum ada diagnosa'}</span>
                    </span>
                    <ChevronDown size={14} class={`shrink-0 transition ${historyOpen === v.id ? 'rotate-180' : ''}`} />
                  </button>
                  {historyOpen === v.id && m && (
                    <div class="space-y-1 border-t border-border px-3 py-2 text-xs text-muted">
                      <p>
                        <b>S:</b> {m.soap.s}
                      </p>
                      <p>
                        <b>A:</b> {m.soap.a}
                      </p>
                      <p>
                        <b>P:</b> {m.soap.p}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <a href={`/app/rekam-medis/riwayat?id=${patient.id}`} class="link mt-3 inline-block text-sm">
              Timeline lengkap
            </a>
          </div>
          <div class="card p-4">
            <p class="mb-2 text-sm font-semibold">Obat rutin / terakhir</p>
            {routineMeds.length ? (
              <ul class="list-disc space-y-0.5 pl-4 text-sm text-muted">
                {routineMeds.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : (
              <p class="text-sm text-muted">Tidak ada</p>
            )}
          </div>
        </aside>

        {/* Right panel */}
        <div class="card min-w-0">
          <Tabs
            class="px-3"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'ttv', label: 'Triase & TTV' },
              { key: 'soap', label: 'SOAP' },
              { key: 'dx', label: 'Diagnosa', count: dx.length },
              { key: 'tindakan', label: 'Tindakan', count: visitProcs.length },
              { key: 'resep', label: 'Resep', count: rx ? rx.items.length : rxDraft.length },
              { key: 'lanjut', label: 'Rencana Lanjut' },
            ]}
          />
          <div class="p-5">
            {errors.length > 0 && (
              <div class="mb-4 rounded-[var(--radius-field)] border border-danger/30 bg-danger-soft p-3 text-sm text-danger-strong" role="alert">
                <p class="font-semibold">Lengkapi sebelum menyelesaikan pemeriksaan:</p>
                <ul class="mt-1 list-disc pl-5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'ttv' && (
              <div>
                {!canTTV && lockedNote('perawat/dokter')}
                {mr.vitals && (
                  <p class="mb-4 text-xs text-muted">
                    Terakhir diisi oleh {personName(mr.vitals.recordedBy)} pada {dateTime(mr.vitals.recordedAt)}
                  </p>
                )}
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {vitalInput('sys', 'Sistol', 'mmHg')}
                  {vitalInput('dia', 'Diastol', 'mmHg')}
                  {vitalInput('pulse', 'Nadi', 'x/mnt')}
                  {vitalInput('temp', 'Suhu', '°C')}
                  {vitalInput('rr', 'Respirasi (RR)', 'x/mnt')}
                  {vitalInput('spo2', 'SpO2', '%')}
                  {vitalInput('weight', 'Berat badan', 'kg')}
                  {vitalInput('height', 'Tinggi badan', 'cm')}
                  <div>
                    <p class="field-label">IMT (otomatis)</p>
                    <p class={`input bg-surface-2 ${outOfRange('bmi', bmi) ? 'border-warning text-warning-strong' : ''}`} aria-live="polite">
                      {bmi ?? '-'} <span class="text-xs text-subtle">kg/m²</span>
                    </p>
                  </div>
                  <div class="sm:col-span-2 xl:col-span-3">
                    <label for="pain" class="field-label">
                      Skala nyeri: <span class="tabular font-bold text-primary">{vf.pain}</span>/10{' '}
                      <span class="font-normal text-muted">({vf.pain === 0 ? 'tidak nyeri' : vf.pain <= 3 ? 'ringan' : vf.pain <= 6 ? 'sedang' : 'berat'})</span>
                    </label>
                    <input
                      id="pain"
                      type="range"
                      min={0}
                      max={10}
                      value={vf.pain}
                      disabled={!canTTV}
                      class="w-full accent-[var(--color-primary)]"
                      onInput={(e) => {
                        setVf({ ...vf, pain: Number((e.target as HTMLInputElement).value) });
                        markDirty();
                      }}
                    />
                    <div class="flex justify-between text-[10px] text-subtle">
                      {Array.from({ length: 11 }, (_, i) => (
                        <span key={i}>{i}</span>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    class="sm:col-span-2 xl:col-span-4"
                    label="Keluhan utama"
                    value={vf.chiefComplaint}
                    disabled={!canTTV}
                    onValue={(v) => {
                      setVf({ ...vf, chiefComplaint: v });
                      markDirty();
                    }}
                  />
                </div>
                {canTTV && (
                  <div class="mt-4 flex justify-end">
                    <button type="button" class="btn btn-primary" onClick={saveTTV}>
                      <Save size={16} /> Simpan TTV
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'soap' && (
              <div>
                {!canDoc && lockedNote('dokter')}
                {canDoc && (
                  <div class="mb-4 flex flex-wrap items-end gap-3">
                    <Select class="w-64" label="Template teks cepat" value="" onValue={applyTemplate} options={SOAP_TEMPLATES.map((t) => ({ value: t.label, label: `Template: ${t.label}` }))} placeholder="Pilih template..." />
                    <button type="button" class="btn btn-secondary" onClick={prefillO}>
                      Isi Objective dari TTV
                    </button>
                  </div>
                )}
                <div class="grid gap-4">
                  {(
                    [
                      ['s', 'S · Subjective', 'Keluhan dan anamnesis pasien'],
                      ['o', 'O · Objective', 'Pemeriksaan fisik dan penunjang'],
                      ['a', 'A · Assessment', 'Penilaian / diagnosis kerja'],
                      ['p', 'P · Plan', 'Rencana terapi, edukasi, tindak lanjut'],
                    ] as const
                  ).map(([k, label, ph]) => (
                    <Textarea
                      key={k}
                      label={label}
                      placeholder={ph}
                      required={k !== 'o'}
                      rows={3}
                      value={soap[k]}
                      disabled={!canDoc}
                      onValue={(v) => {
                        setSoap({ ...soap, [k]: v });
                        markDirty();
                      }}
                    />
                  ))}
                </div>
                {mr.addenda.length > 0 && (
                  <div class="mt-6">
                    <p class="mb-2 text-sm font-semibold">Addendum</p>
                    <ul class="space-y-2">
                      {mr.addenda.map((a, i) => (
                        <li key={i} class="rounded-[var(--radius-field)] border border-info/30 bg-info-soft p-3 text-sm">
                          <p>{a.text}</p>
                          <p class="mt-1 text-xs text-info-strong">
                            {personName(a.by)} · {dateTime(a.at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === 'dx' && (
              <div>
                {!canDoc && lockedNote('dokter')}
                {canDoc && (
                  <Combobox
                    label="Cari ICD-10 (kode atau nama penyakit)"
                    items={icd10 as { code: string; name: string }[]}
                    itemKey={(i) => i.code}
                    filter={(i, q) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)}
                    onSelect={(i) => addDx(i.code, i.name)}
                    placeholder="Contoh: I10, hipertensi, J06.9"
                    renderItem={(i) => (
                      <span>
                        <span class="tabular mr-2 font-semibold text-primary">{i.code}</span>
                        {i.name}
                      </span>
                    )}
                  />
                )}
                <ul class="mt-4 divide-y divide-border rounded-[var(--radius-card)] border border-border">
                  {dx.length === 0 && <li class="px-4 py-8 text-center text-sm text-muted">Belum ada diagnosa. Minimal 1 diagnosa wajib diisi.</li>}
                  {dx.map((d, i) => (
                    <li key={d.code} class="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span class="tabular w-16 font-semibold text-primary">{d.code}</span>
                      <span class="min-w-0 flex-1">{d.name}</span>
                      <select
                        class="input w-auto py-1 text-xs"
                        value={d.type}
                        disabled={!canDoc}
                        aria-label={`Jenis diagnosa ${d.code}`}
                        onChange={(e) => {
                          const type = (e.target as HTMLSelectElement).value as Diagnosis['type'];
                          setDx(dx.map((x, idx) => (idx === i ? { ...x, type } : type === 'PRIMER' && x.type === 'PRIMER' ? { ...x, type: 'SEKUNDER' } : x)));
                          markDirty();
                        }}
                      >
                        <option value="PRIMER">Primer</option>
                        <option value="SEKUNDER">Sekunder</option>
                      </select>
                      {canDoc && (
                        <button
                          type="button"
                          class="btn-icon h-8 w-8 hover:text-danger"
                          aria-label={`Hapus diagnosa ${d.code}`}
                          onClick={() => {
                            setDx(dx.filter((x) => x.code !== d.code));
                            markDirty();
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'tindakan' && (
              <div>
                {!canProc && lockedNote('dokter/perawat')}
                {canProc && (
                  <div class="mb-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
                    <div class="grid gap-3 md:grid-cols-[100px_1fr_1fr]">
                      <Input label="Qty" type="number" min={1} value={String(procQty)} onValue={(v) => setProcQty(Math.max(1, Number(v) || 1))} />
                      <Select
                        label="Pelaksana"
                        value={procPerformer}
                        onValue={setProcPerformer}
                        options={[{ value: visit.doctorId, label: docMap.get(visit.doctorId)?.name ?? 'Dokter' }, ...doctorUsers.map((u) => ({ value: u.id, label: u.name }))]}
                      />
                      <Input label="Catatan (opsional)" value={procNote} onValue={setProcNote} />
                    </div>
                    <div class="mt-3">
                      <Combobox
                        label="Cari tindakan (ICD-9-CM) lalu pilih untuk menambahkan"
                        items={procs.filter((p) => p.active && p.category !== 'ADMIN' && p.category !== 'KONSULTASI')}
                        itemKey={(p) => p.id}
                        filter={(p, q) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)}
                        onSelect={(p) => addProc(p.id)}
                        placeholder="Contoh: EKG, nebulizer, 89.52"
                        renderItem={(p) => (
                          <span class="flex items-center justify-between gap-3">
                            <span>
                              <span class="tabular mr-2 text-xs font-semibold text-primary">{p.code}</span>
                              {p.name} <span class="text-xs text-subtle">· {PROC_CATEGORY_LABEL[p.category]}</span>
                            </span>
                            <span class="tabular text-xs font-medium">{rupiah(p.priceUmum)}</span>
                          </span>
                        )}
                      />
                    </div>
                    <p class="field-hint">Setiap tindakan yang ditambahkan otomatis masuk ke tagihan pasien.</p>
                  </div>
                )}
                <div class="overflow-x-auto rounded-[var(--radius-card)] border border-border">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Kode</th>
                        <th>Tindakan</th>
                        <th>Pelaksana</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Tarif</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visitProcs.length === 0 && (
                        <tr>
                          <td colSpan={6} class="py-8 text-center text-sm text-muted">
                            Belum ada tindakan
                          </td>
                        </tr>
                      )}
                      {visitProcs.map((a) => {
                        const pm = procMap.get(a.procedureId);
                        return (
                          <tr key={a.id}>
                            <td class="tabular text-primary">{pm?.code}</td>
                            <td>
                              {pm?.name}
                              {a.note && <p class="text-xs text-muted">{a.note}</p>}
                            </td>
                            <td class="text-sm">{personName(a.performerId)}</td>
                            <td class="num text-right">{a.qty}</td>
                            <td class="num text-right">{rupiah(a.price * a.qty)}</td>
                            <td class="text-right">
                              {canProc && (
                                <button type="button" class="btn-icon h-8 w-8 hover:text-danger" aria-label={`Hapus ${pm?.name}`} onClick={() => run(() => removeProcedure(a.id), 'Tindakan dihapus dari tagihan')}>
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'resep' && (
              <div>
                {rx ? (
                  <div>
                    <div class="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-field)] bg-surface p-3">
                      <Send size={18} class="text-primary" />
                      <p class="flex-1 text-sm">
                        Resep <strong class="tabular">{rx.rxNo}</strong> dikirim ke farmasi {dateTime(rx.createdAt)}
                      </p>
                      <StatusPill status={RX_STATUS[rx.status]} />
                    </div>
                    {rx.rejectNote && <p class="mb-3 rounded-[var(--radius-field)] bg-danger-soft p-3 text-sm text-danger-strong">Catatan farmasi: {rx.rejectNote}</p>}
                    <RxTable items={rx.items} />
                  </div>
                ) : (
                  <div>
                    {!canDoc && lockedNote('dokter')}
                    {canDoc && (
                      <Combobox
                        label="Cari obat (stok tersedia ditampilkan)"
                        items={meds.filter((m) => m.active !== false)}
                        itemKey={(m) => m.id}
                        filter={(m, q) => m.name.toLowerCase().includes(q) || (m.genericName ?? '').toLowerCase().includes(q)}
                        onSelect={addMed}
                        placeholder="Contoh: amlodipine, paracetamol"
                        renderItem={(m) => {
                          const stock = totalStock(m);
                          const hit = allergyMatch(patient.allergies, m);
                          return (
                            <span class="flex items-center justify-between gap-3">
                              <span class="min-w-0">
                                <span class="font-medium">{m.name}</span>
                                <span class="block text-xs text-subtle">
                                  {m.genericName} · {MED_FORM_LABEL[m.form]}
                                </span>
                              </span>
                              <span class="flex shrink-0 items-center gap-1.5">
                                {hit && <span class="badge bg-danger text-white">Alergi: {hit}</span>}
                                <Badge tone={stock === 0 ? 'danger' : stock < m.minStock ? 'warning' : 'success'}>
                                  {stock === 0 ? 'Habis' : `Stok ${stock} ${m.unit}`}
                                </Badge>
                              </span>
                            </span>
                          );
                        }}
                      />
                    )}
                    <div class="mt-4 space-y-3">
                      {rxDraft.length === 0 && <p class="rounded-[var(--radius-card)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted">Belum ada obat di resep.</p>}
                      {rxDraft.map((it, i) => {
                        const m = medMap.get(it.medicineId)!;
                        const hit = allergyMatch(patient.allergies, m);
                        return (
                          <div key={it.medicineId} class={`rounded-[var(--radius-card)] border p-4 ${hit ? 'border-danger bg-danger-soft/40' : 'border-border'}`}>
                            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p class="font-semibold">{m.name}</p>
                                <p class="text-xs text-muted">
                                  {m.genericName} · stok {totalStock(m)} {m.unit}
                                </p>
                              </div>
                              <div class="flex items-center gap-2">
                                {hit && (
                                  <span class="badge bg-danger text-white">
                                    <AlertTriangle size={12} /> Alergi {hit}
                                  </span>
                                )}
                                <button type="button" class="btn-icon h-8 w-8 hover:text-danger" aria-label={`Hapus ${m.name}`} onClick={() => setRxDraft(rxDraft.filter((_, idx) => idx !== i))}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                              <Input label="Dosis" value={it.dose} onValue={(v) => updateRx(i, { dose: v })} />
                              <Select label="Frekuensi" value={it.frequency} onValue={(v) => updateRx(i, { frequency: v })} options={FREQUENCIES} />
                              <Select label="Rute" value={it.route} onValue={(v) => updateRx(i, { route: v })} options={ROUTES} />
                              <Input label="Durasi (hari)" type="number" min={1} value={String(it.durationDays)} onValue={(v) => updateRx(i, { durationDays: Math.max(1, Number(v) || 1) })} />
                              <Input label={`Jumlah (${m.unit})`} type="number" min={1} value={String(it.qty)} onValue={(v) => updateRx(i, { qty: Math.max(0, Number(v) || 0) })} hint="Otomatis, bisa diubah" />
                              <Select label="Aturan pakai" value={it.instruction} onValue={(v) => updateRx(i, { instruction: v })} options={[...new Set([it.instruction, ...INSTRUCTIONS])]} />
                              <Input class="sm:col-span-3 xl:col-span-6" label="Catatan" value={it.note ?? ''} onValue={(v) => updateRx(i, { note: v })} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {canDoc && rxDraft.length > 0 && (
                      <div class="mt-4 flex justify-end">
                        <button type="button" class="btn btn-primary" onClick={sendRx}>
                          <Send size={16} /> Kirim ke Farmasi
                        </button>
                      </div>
                    )}
                    <p class="mt-3 text-xs text-muted">Racikan tersedia pada versi produksi. Resep yang belum dikirim akan otomatis dikirim saat pemeriksaan diselesaikan.</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'lanjut' && (
              <div class="space-y-5">
                {!canDoc && lockedNote('dokter')}
                <RadioGroup<FollowUpType>
                  label="Rencana tindak lanjut"
                  name="followup"
                  value={fu.type}
                  onValue={(type) => {
                    if (!canDoc) return;
                    setFu({ type });
                    markDirty();
                  }}
                  options={[
                    { value: 'PULANG', label: 'Pulang' },
                    { value: 'KONTROL', label: 'Kontrol ulang' },
                    { value: 'RUJUK_INTERNAL', label: 'Rujuk internal (poli lain)' },
                    { value: 'RUJUK_EKSTERNAL', label: 'Rujuk eksternal' },
                    { value: 'RAWAT_INAP', label: 'Rawat inap' },
                  ]}
                />
                {fu.type === 'KONTROL' && (
                  <Input
                    class="max-w-xs"
                    label="Tanggal kontrol"
                    type="date"
                    disabled={!canDoc}
                    min={new Date().toISOString().slice(0, 10)}
                    value={fu.date ?? ''}
                    onValue={(v) => {
                      setFu({ ...fu, date: v });
                      markDirty();
                    }}
                    hint={fu.date ? dateLong(fu.date) : undefined}
                  />
                )}
                {fu.type === 'RUJUK_INTERNAL' && (
                  <Select
                    class="max-w-sm"
                    label="Poli tujuan"
                    disabled={!canDoc}
                    value={fu.target ?? ''}
                    onValue={(v) => {
                      setFu({ ...fu, target: v });
                      markDirty();
                    }}
                    options={polis.filter((p) => p.id !== visit.poliId && p.id !== 'POL-IGD').map((p) => ({ value: p.name, label: p.name }))}
                    placeholder="Pilih poli"
                  />
                )}
                {fu.type === 'RUJUK_EKSTERNAL' && (
                  <Input
                    class="max-w-md"
                    label="Faskes tujuan"
                    disabled={!canDoc}
                    value={fu.target ?? ''}
                    onValue={(v) => {
                      setFu({ ...fu, target: v });
                      markDirty();
                    }}
                    placeholder="Contoh: RSUP Dr. Hasan Sadikin Bandung"
                  />
                )}
                {fu.type === 'RAWAT_INAP' && (
                  <p class="flex items-center gap-2 rounded-[var(--radius-field)] bg-info-soft p-3 text-sm text-info-strong">
                    <Badge tone="info">Simulasi</Badge> Permintaan rawat inap akan diteruskan ke admisi pada versi produksi.
                  </p>
                )}
                <Textarea
                  label="Catatan"
                  disabled={!canDoc}
                  value={fu.note ?? ''}
                  onValue={(v) => {
                    setFu({ ...fu, note: v });
                    markDirty();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div class="no-print sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-white/95 backdrop-blur lg:-mx-8">
        <div class="flex flex-wrap items-center justify-end gap-2 px-4 py-3 lg:px-8">
          <span class="mr-auto hidden text-xs text-muted sm:block">
            {locked ? 'Rekam medis terkunci.' : dirty ? 'Ada perubahan belum disimpan · ' : ''}
            {!locked && (
              <>
                <span class="kbd">Ctrl</span> + <span class="kbd">S</span> simpan draft
              </>
            )}
          </span>
          <button type="button" class="btn btn-ghost" onClick={cancel}>
            Batal
          </button>
          <a href={`/app/rekam-medis/resume?visit=${visit.id}`} class="btn btn-secondary">
            <Printer size={16} /> Cetak Resume
          </a>
          {!locked && (
            <>
              <button type="button" class="btn btn-secondary" onClick={() => saveDraft()}>
                <Save size={16} /> Simpan Draft
              </button>
              {(role === 'DOKTER' || role === 'SUPERADMIN') && (
                <button type="button" class="btn btn-primary" onClick={complete}>
                  <CheckCircle2 size={16} /> Selesaikan Pemeriksaan
                </button>
              )}
            </>
          )}
          {locked && (
            <button type="button" class="btn btn-primary" onClick={() => setAddendumOpen(true)}>
              <Plus size={16} /> Addendum
            </button>
          )}
        </div>
      </div>

      <Modal
        open={addendumOpen}
        onClose={() => setAddendumOpen(false)}
        title="Tambah Addendum"
        description="Sesuai prinsip RME, catatan yang sudah ditandatangani tidak dihapus. Addendum ditambahkan dengan jejak waktu dan penulis."
        footer={
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setAddendumOpen(false)}>
              Batal
            </button>
            <button type="button" class="btn btn-primary" onClick={saveAddendum}>
              Simpan Addendum
            </button>
          </>
        }
      >
        <Textarea label="Isi addendum" required data-autofocus rows={5} value={addendumText} onValue={setAddendumText} placeholder="Contoh: Hasil lab GDS 168 mg/dL diterima pukul 11.20, terapi dilanjutkan." />
      </Modal>
    </div>
  );
}

export function RxTable({ items }: { items: RxItem[] }) {
  const medMap = useStore($medMap);
  return (
    <div class="overflow-x-auto rounded-[var(--radius-card)] border border-border">
      <table class="table">
        <thead>
          <tr>
            <th>Obat</th>
            <th>Dosis</th>
            <th>Frekuensi</th>
            <th>Rute</th>
            <th class="text-right">Durasi</th>
            <th class="text-right">Jumlah</th>
            <th>Aturan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => {
            const m = medMap.get(i.medicineId);
            const sub = i.substituteId ? medMap.get(i.substituteId) : undefined;
            return (
              <tr key={idx}>
                <td>
                  <p class="font-medium">{m?.name}</p>
                  {sub && <p class="text-xs text-info-strong">Substitusi: {sub.name}</p>}
                </td>
                <td>{i.dose}</td>
                <td>{i.frequency}</td>
                <td>{i.route}</td>
                <td class="num text-right">{i.durationDays} hr</td>
                <td class="num text-right">
                  {i.qtyGiven ?? i.qty} {m?.unit}
                </td>
                <td class="text-sm">{i.instruction}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
