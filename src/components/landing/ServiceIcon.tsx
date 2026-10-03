import { Accessibility, Baby, Brain, Ear, Eye, FlaskConical, Heart, HeartPulse, Scan, Scissors, Smile, Stethoscope } from 'lucide-preact';

const MAP = { stethoscope: Stethoscope, baby: Baby, heart: Heart, scissors: Scissors, heartpulse: HeartPulse, brain: Brain, smile: Smile, eye: Eye, ear: Ear, accessibility: Accessibility, flask: FlaskConical, scan: Scan };

/** Rendered at build time from .astro files (no client JS). */
export default function ServiceIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = MAP[name as keyof typeof MAP] ?? Stethoscope;
  return <Icon size={size} aria-hidden="true" />;
}
