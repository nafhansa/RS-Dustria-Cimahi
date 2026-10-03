import { z } from 'zod';

export const nikSchema = z
  .string()
  .regex(/^\d{16}$/, 'NIK harus 16 digit angka')
  .refine((v) => {
    const day = Number(v.slice(6, 8));
    const month = Number(v.slice(8, 10));
    return ((day >= 1 && day <= 31) || (day >= 41 && day <= 71)) && month >= 1 && month <= 12;
  }, 'Format tanggal lahir pada NIK tidak valid');

export const phoneSchema = z.string().regex(/^(\+62|62|0)8\d{7,12}$/, 'Nomor HP tidak valid (contoh 081234567890)');

const pastDate = z
  .string()
  .min(1, 'Tanggal lahir wajib diisi')
  .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v) <= new Date(), 'Tanggal lahir tidak boleh di masa depan');

export const patientSchema = z
  .object({
    name: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter'),
    nik: nikSchema,
    kk: z.string().regex(/^(\d{16})?$/, 'No KK harus 16 digit').optional(),
    birthDate: pastDate,
    gender: z.enum(['L', 'P'], { message: 'Pilih jenis kelamin' }),
    phone: phoneSchema,
    email: z.union([z.literal(''), z.email('Email tidak valid')]).optional(),
    payerType: z.enum(['UMUM', 'BPJS', 'ASURANSI']),
    memberNo: z.string().optional(),
    insurerId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.payerType === 'BPJS' && !/^\d{13}$/.test(v.memberNo ?? ''))
      ctx.addIssue({ code: 'custom', path: ['memberNo'], message: 'No kartu BPJS harus 13 digit' });
    if (v.payerType === 'ASURANSI' && !v.insurerId) ctx.addIssue({ code: 'custom', path: ['insurerId'], message: 'Pilih asuransi' });
    if (v.payerType === 'ASURANSI' && !v.memberNo) ctx.addIssue({ code: 'custom', path: ['memberNo'], message: 'No polis wajib diisi' });
  });

export const appointmentSchema = z.object({
  name: z.string().trim().min(3, 'Nama minimal 3 karakter'),
  nik: nikSchema,
  birthDate: pastDate,
  phone: phoneSchema,
  payerType: z.enum(['UMUM', 'BPJS', 'ASURANSI']),
});

/** Run a zod schema and flatten errors to { field: message }. */
export function validate<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; errors: Record<string, string> } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
