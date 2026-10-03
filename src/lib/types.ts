export type ID = string;
export type Gender = 'L' | 'P';
export type PayerType = 'UMUM' | 'BPJS' | 'ASURANSI';
export type Role = 'ADMIN' | 'PERAWAT' | 'DOKTER' | 'APOTEKER' | 'KASIR' | 'SUPERADMIN';

export interface Address {
  street: string;
  rt?: string;
  rw?: string;
  village?: string;
  district?: string;
  city: string;
  province: string;
  postalCode?: string;
}

export interface Payer {
  type: PayerType;
  insurerId?: ID;
  memberNo?: string;
  class?: 1 | 2 | 3;
}

export interface Patient {
  id: ID;
  mrn: string;
  nik: string;
  kk?: string;
  name: string;
  gender: Gender;
  birthPlace?: string;
  birthDate: string;
  bloodType?: 'A' | 'B' | 'AB' | 'O' | '-';
  religion?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  nationality?: string;
  phone: string;
  email?: string;
  address: Address;
  payer: Payer;
  emergencyContact?: { name: string; relation: string; phone: string };
  allergies: string[];
  medicalHistory?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: ID;
  name: string;
  specialty: string;
  sip: string;
  poliId: ID;
  photo?: string;
  bio?: string;
  active: boolean;
}

export interface Poli {
  id: ID;
  code: string;
  slug: string;
  name: string;
  queuePrefix: string;
  description: string;
  active: boolean;
}

export interface Schedule {
  id: ID;
  doctorId: ID;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start: string;
  end: string;
  quota: number;
  active?: boolean;
}

export type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'CANCELLED';
export interface Appointment {
  id: ID;
  code: string;
  poliId: ID;
  doctorId: ID;
  date: string;
  time: string;
  name: string;
  nik: string;
  birthDate: string;
  gender?: Gender;
  phone: string;
  payerType: PayerType;
  complaint?: string;
  status: AppointmentStatus;
  patientId?: ID;
  visitId?: ID;
  cancelReason?: string;
  createdAt: string;
}

export type VisitStatus =
  | 'TERDAFTAR'
  | 'MENUNGGU'
  | 'DIPANGGIL'
  | 'DIPERIKSA'
  | 'FARMASI'
  | 'KASIR'
  | 'SELESAI'
  | 'BATAL';

export interface Visit {
  id: ID;
  regNo: string;
  patientId: ID;
  poliId: ID;
  doctorId: ID;
  type: 'RAJAL' | 'IGD';
  source: 'WALKIN' | 'RUJUKAN' | 'BOOKING';
  referral?: { number: string; origin: string };
  payer: Payer;
  sepNo?: string;
  queueNo: string;
  skipped?: boolean;
  status: VisitStatus;
  cancelReason?: string;
  appointmentId?: ID;
  registeredAt: string;
  calledAt?: string;
  examStartedAt?: string;
  finishedAt?: string;
}

export interface Vitals {
  sys?: number;
  dia?: number;
  pulse?: number;
  temp?: number;
  rr?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  pain?: number;
  chiefComplaint?: string;
  recordedBy: ID;
  recordedAt: string;
}

export interface Diagnosis {
  code: string;
  name: string;
  type: 'PRIMER' | 'SEKUNDER';
}

export type FollowUpType = 'KONTROL' | 'RUJUK_INTERNAL' | 'RUJUK_EKSTERNAL' | 'RAWAT_INAP' | 'PULANG';

export interface MedicalRecord {
  id: ID;
  visitId: ID;
  patientId: ID;
  doctorId: ID;
  vitals?: Vitals;
  soap: { s: string; o: string; a: string; p: string };
  diagnoses: Diagnosis[];
  procedures: ID[];
  prescriptionId?: ID;
  followUp?: { type: FollowUpType; date?: string; target?: string; note?: string };
  status: 'DRAFT' | 'FINAL';
  signedAt?: string;
  signedBy?: ID;
  addenda: { text: string; by: ID; at: string }[];
  updatedAt?: string;
}

export type ProcedureCategory = 'KONSULTASI' | 'MEDIS' | 'LAB' | 'RADIOLOGI' | 'KEPERAWATAN' | 'ADMIN';
export interface ProcedureMaster {
  id: ID;
  code: string;
  name: string;
  category: ProcedureCategory;
  priceUmum: number;
  priceBpjs: number;
  active: boolean;
}

export interface ProcedureAction {
  id: ID;
  visitId: ID;
  procedureId: ID;
  qty: number;
  performerId: ID;
  note?: string;
  price: number;
  at: string;
}

export type MedicineCategory = 'GENERIK' | 'PATEN' | 'NARKOTIKA' | 'PSIKOTROPIKA' | 'OTC';
export type MedicineForm = 'TABLET' | 'KAPSUL' | 'SIRUP' | 'INJEKSI' | 'SALEP' | 'TETES';
export interface Batch {
  batchNo: string;
  expiry: string;
  qty: number;
  buyPrice: number;
}
export interface Medicine {
  id: ID;
  code: string;
  name: string;
  genericName?: string;
  category: MedicineCategory;
  form: MedicineForm;
  unit: string;
  sellPrice: number;
  minStock: number;
  allergyTags: string[];
  batches: Batch[];
  active?: boolean;
}

export interface StockMovement {
  id: ID;
  medicineId: ID;
  batchNo: string;
  type: 'IN' | 'OUT' | 'ADJ';
  qty: number;
  ref?: string;
  reason?: string;
  at: string;
  by: ID;
}

export type RxStatus = 'BARU' | 'DITELAAH' | 'DISIAPKAN' | 'SIAP' | 'DISERAHKAN' | 'BATAL';
export interface RxItem {
  medicineId: ID;
  dose: string;
  frequency: string;
  route: string;
  durationDays: number;
  qty: number;
  qtyGiven?: number;
  instruction: string;
  note?: string;
  substituteId?: ID;
}
export interface Prescription {
  id: ID;
  rxNo: string;
  visitId: ID;
  patientId: ID;
  doctorId: ID;
  items: RxItem[];
  review?: { admin: boolean; pharmaceutical: boolean; clinical: boolean; note?: string };
  status: RxStatus;
  receivedBy?: string;
  rejectNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS' | 'BATAL';
export type InvoiceCategory = 'ADMIN' | 'DOKTER' | 'TINDAKAN' | 'OBAT' | 'LAIN';
export interface InvoiceItem {
  id: ID;
  category: InvoiceCategory;
  name: string;
  qty: number;
  price: number;
  coveredByPayer: number;
  refId?: ID;
  manual?: boolean;
}
export interface Invoice {
  id: ID;
  invoiceNo: string;
  visitId: ID;
  patientId: ID;
  items: InvoiceItem[];
  discount?: { amount: number; reason: string; approvedBy: ID };
  status: InvoiceStatus;
  cancelReason?: string;
  createdAt: string;
}

export type PayMethod = 'TUNAI' | 'DEBIT' | 'KREDIT' | 'QRIS' | 'TRANSFER';
export interface Payment {
  id: ID;
  invoiceId: ID;
  receiptNo: string;
  methods: { type: PayMethod; amount: number; ref?: string; bank?: string }[];
  cashReceived?: number;
  change?: number;
  note?: string;
  cashierId: ID;
  at: string;
}

export interface Insurer {
  id: ID;
  name: string;
  type: PayerType;
  coveragePct: number;
  active?: boolean;
}

export interface User {
  id: ID;
  name: string;
  role: Role;
  doctorId?: ID;
  title?: string;
  active?: boolean;
}

export interface AuditEntry {
  id: ID;
  at: string;
  userId: ID;
  role: string;
  action: string;
  entity: string;
  entityId: ID;
  detail?: string;
}

export interface Icd10 {
  code: string;
  name: string;
}

export interface GoodsReceipt {
  id: ID;
  grNo: string;
  supplier: string;
  invoiceRef: string;
  date: string;
  lines: { medicineId: ID; batchNo: string; expiry: string; qty: number; buyPrice: number }[];
  by: ID;
  at: string;
}

export interface ShiftClose {
  id: ID;
  date: string;
  shift: string;
  expectedCash: number;
  physicalCash: number;
  diff: number;
  totals: Record<string, number>;
  txCount: number;
  by: ID;
  at: string;
}

export interface Settings {
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  receiptFormat: 'A5' | 'THERMAL';
  showWatermark: boolean;
}

export interface SeedData {
  patients: Patient[];
  doctors: Doctor[];
  polis: Poli[];
  schedules: Schedule[];
  appointments: Appointment[];
  visits: Visit[];
  medicalRecords: MedicalRecord[];
  procedureMaster: ProcedureMaster[];
  procedureActions: ProcedureAction[];
  medicines: Medicine[];
  stockMovements: StockMovement[];
  prescriptions: Prescription[];
  invoices: Invoice[];
  payments: Payment[];
  insurers: Insurer[];
  users: User[];
}
