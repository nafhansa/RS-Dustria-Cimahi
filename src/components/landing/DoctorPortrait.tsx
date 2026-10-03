import { initials } from '../../lib/format';

const PALETTES = [
  ['#fdecee', '#f7c9cf', '#d01b28'],
  ['#eff8ff', '#c7e2fe', '#175cd3'],
  ['#ecfdf3', '#bfeed3', '#067647'],
  ['#fffaeb', '#fde3b0', '#b54708'],
  ['#f4f3ff', '#d9d6fe', '#5925dc'],
];

/** Illustrated placeholder portrait (no third-party photos): soft gradient, silhouette, and initials. */
export default function DoctorPortrait({ name, id, class: cls = '' }: { name: string; id: string; class?: string }) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const [bg, mid, ink] = PALETTES[Math.abs(h) % PALETTES.length];
  const female = /(Anisa|Ratna|Lestari|Dewi|Nurul|Intan|Maya)/.test(name);
  const gid = `dp-${id}`;
  return (
    <svg viewBox="0 0 200 200" class={cls} role="img" aria-label={`Ilustrasi ${name}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color={bg} />
          <stop offset="100%" stop-color={mid} />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gid})`} />
      <circle cx="160" cy="36" r="46" fill="#fff" opacity="0.35" />
      {/* coat */}
      <path d="M40 200c4-40 26-62 60-62s56 22 60 62z" fill="#fff" />
      <path d="M100 140l-14 60h28z" fill={ink} opacity="0.12" />
      <path d="M86 140l14 22 14-22" fill="none" stroke={ink} stroke-width="3" opacity="0.5" />
      {/* stethoscope */}
      <path d="M78 150c-6 16-4 30 8 34" fill="none" stroke="#475467" stroke-width="3" stroke-linecap="round" />
      <circle cx="88" cy="185" r="5" fill="#475467" />
      {/* head */}
      <circle cx="100" cy="100" r="30" fill="#f3d2bf" />
      {female ? <path d="M68 104c0-28 14-40 32-40s32 12 32 40c-4-12-14-22-32-22s-28 10-32 22z" fill="#3b2a26" /> : <path d="M72 94c2-20 14-30 28-30s26 10 28 30c-6-8-16-12-28-12s-22 4-28 12z" fill="#3b2a26" />}
      <text x="184" y="188" text-anchor="end" font-family="Plus Jakarta Sans Variable, sans-serif" font-weight="700" font-size="22" fill={ink} opacity="0.8">
        {initials(name)}
      </text>
    </svg>
  );
}
