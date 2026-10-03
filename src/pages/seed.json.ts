import type { APIRoute } from 'astro';
import patients from '../data/seed/patients.json';
import doctors from '../data/seed/doctors.json';
import polis from '../data/seed/polyclinics.json';
import schedules from '../data/seed/schedules.json';
import appointments from '../data/seed/appointments.json';
import visits from '../data/seed/visits.json';
import medicalRecords from '../data/seed/medical-records.json';
import procedureMaster from '../data/seed/procedures.json';
import procedureActions from '../data/seed/procedure-actions.json';
import medicines from '../data/seed/medicines.json';
import stockMovements from '../data/seed/stock-movements.json';
import prescriptions from '../data/seed/prescriptions.json';
import invoices from '../data/seed/invoices.json';
import payments from '../data/seed/payments.json';
import insurers from '../data/seed/insurers.json';
import users from '../data/seed/users.json';
import auditLog from '../data/seed/audit-log.json';

/** Combined seed served as a static file; fetched only when the demo data needs (re)initialising. */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      patients, doctors, polis, schedules, appointments, visits, medicalRecords, procedureMaster, procedureActions,
      medicines, stockMovements, prescriptions, invoices, payments, insurers, users, auditLog,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
