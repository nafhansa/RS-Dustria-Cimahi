import { useState } from 'preact/hooks';
import { num } from '../../lib/format';

const PALETTE = ['#d01b28', '#2e90fa', '#12b76a', '#f79009', '#7a5af8', '#0ba5ec', '#ee46bc', '#667085', '#15b79e', '#a15c07', '#475467'];

/** Responsive SVG column chart with hover tooltip. */
export function BarChart({ data, height = 220, format = num, color = PALETTE[0], label }: { data: { label: string; value: number }[]; height?: number; format?: (n: number) => string; color?: string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 600;
  const H = height;
  const pad = { t: 16, r: 8, b: 28, l: 8 };
  const bw = (W - pad.l - pad.r) / Math.max(data.length, 1);
  const ticks = [0.25, 0.5, 0.75, 1];
  return (
    <figure class="relative w-full" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} class="h-auto w-full" role="img" aria-label={label}>
        {ticks.map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - t)} y2={pad.t + (H - pad.t - pad.b) * (1 - t)} stroke="#e4e7ec" stroke-dasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const h = ((H - pad.t - pad.b) * d.value) / max;
          const x = pad.l + i * bw + bw * 0.18;
          const y = H - pad.b - h;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <rect x={x} y={y} width={bw * 0.64} height={Math.max(h, d.value ? 2 : 0)} rx={Math.min(4, bw * 0.2)} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
              {(data.length <= 14 || i % Math.ceil(data.length / 10) === 0) && (
                <text x={x + bw * 0.32} y={H - 9} text-anchor="middle" font-size="11" fill="#667085">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div class="pointer-events-none absolute top-0 rounded-md bg-ink px-2 py-1 text-xs text-white shadow-lift" style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: 'translateX(-50%)' }}>
          <span class="font-medium">{data[hover].label}</span>: <span class="tabular">{format(data[hover].value)}</span>
        </div>
      )}
      <table class="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Area/line chart for time series. */
export function LineChart({ data, height = 220, format = num, label, color = PALETTE[0] }: { data: { label: string; value: number }[]; height?: number; format?: (n: number) => string; label: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const pad = { t: 16, r: 30, b: 28, l: 30 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = (W - pad.l - pad.r) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => [pad.l + i * step, pad.t + (H - pad.t - pad.b) * (1 - d.value / max)] as const);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z` : '';
  const gid = `g${label.replace(/\W/g, '')}`;
  return (
    <figure class="relative w-full" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} class="h-auto w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color={color} stop-opacity="0.22" />
            <stop offset="100%" stop-color={color} stop-opacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - t)} y2={pad.t + (H - pad.t - pad.b) * (1 - t)} stroke="#e4e7ec" stroke-dasharray="3 4" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={p[0] - step / 2} y={pad.t} width={step} height={H - pad.t - pad.b} fill="transparent" />
            <circle cx={p[0]} cy={p[1]} r={hover === i ? 5 : 3} fill="#fff" stroke={color} stroke-width="2" />
            {(data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && (
              <text x={p[0]} y={H - 9} text-anchor="middle" font-size="11" fill="#667085">
                {data[i].label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div class="pointer-events-none absolute top-0 rounded-md bg-ink px-2 py-1 text-xs text-white shadow-lift" style={{ left: `${(pts[hover][0] / W) * 100}%`, transform: 'translateX(-50%)' }}>
          <span class="font-medium">{data[hover].label}</span>: <span class="tabular">{format(data[hover].value)}</span>
        </div>
      )}
      <table class="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal ranked bars (top-N lists, distributions). */
export function HBarList({ data, format = num, color }: { data: { label: string; value: number; sub?: string }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul class="space-y-2.5">
      {data.map((d, i) => (
        <li key={d.label}>
          <div class="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span class="min-w-0 truncate text-text" title={d.label}>
              {d.label}
              {d.sub && <span class="ml-1 text-xs text-subtle">{d.sub}</span>}
            </span>
            <span class="tabular shrink-0 font-medium text-text">{format(d.value)}</span>
          </div>
          <div class="h-2 rounded-full bg-surface-2">
            <div class="h-2 rounded-full transition-all" style={{ width: `${(d.value / max) * 100}%`, background: color ?? PALETTE[i % PALETTE.length] }} />
          </div>
        </li>
      ))}
      {data.length === 0 && <li class="py-6 text-center text-sm text-muted">Belum ada data</li>}
    </ul>
  );
}

/** Donut with legend. */
export function Donut({ data, format = num, label }: { data: { label: string; value: number }[]; format?: (n: number) => string; label: string }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let acc = 0;
  const R = 42;
  const C = 2 * Math.PI * R;
  return (
    <div class="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 100 100" class="h-32 w-32 -rotate-90" role="img" aria-label={label}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f3f6" stroke-width="14" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = <circle key={d.label} cx="50" cy="50" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} stroke-width="14" stroke-dasharray={`${len} ${C - len}`} stroke-dashoffset={-acc} />;
          acc += len;
          return el;
        })}
      </svg>
      <ul class="min-w-[140px] flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} class="flex items-center justify-between gap-3">
            <span class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.label}
            </span>
            <span class="tabular font-medium">
              {format(d.value)} <span class="text-xs text-subtle">({Math.round((d.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
