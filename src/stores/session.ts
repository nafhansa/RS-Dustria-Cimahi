import { computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { ROLE_USER } from '../lib/constants';
import type { Role, User } from '../lib/types';
import { $users } from './db';

export interface Session {
  userId: string;
  role: Role;
  loginAt: string;
}

export const $session = persistentAtom<Session | null>('rsd:session', null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const FALLBACK_USERS: Record<Role, User> = {
  ADMIN: { id: 'U-ADMIN', name: 'Rina Kartika', role: 'ADMIN', title: 'Admin Pendaftaran' },
  PERAWAT: { id: 'U-PERAWAT', name: 'Ns. Dimas Prasetyo', role: 'PERAWAT', title: 'Perawat Poliklinik' },
  DOKTER: { id: 'U-DOKTER', name: 'dr. Anisa Rahmawati, Sp.PD', role: 'DOKTER', title: 'Dokter Spesialis Penyakit Dalam', doctorId: 'D01' },
  APOTEKER: { id: 'U-APOTEKER', name: 'apt. Fajar Nugraha, S.Farm', role: 'APOTEKER', title: 'Apoteker' },
  KASIR: { id: 'U-KASIR', name: 'Sari Wulandari', role: 'KASIR', title: 'Kasir' },
  SUPERADMIN: { id: 'U-SUPER', name: 'Admin Sistem', role: 'SUPERADMIN', title: 'Super Admin' },
};

export const $currentUser = computed([$session, $users], (s, users): User | null => {
  if (!s) return null;
  return users.find((u) => u.id === s.userId) ?? FALLBACK_USERS[s.role];
});

export function login(role: Role): void {
  $session.set({ userId: ROLE_USER[role], role, loginAt: new Date().toISOString() });
}

export function logout(): void {
  $session.set(null);
}

export function hasRole(...roles: Role[]): boolean {
  const s = $session.get();
  return !!s && (s.role === 'SUPERADMIN' || roles.includes(s.role));
}
