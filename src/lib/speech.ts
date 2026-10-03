import { terbilang } from './format';

let ctx: AudioContext | null = null;

/** Two-tone chime via WebAudio (no audio file needed). */
export function playDing(): Promise<void> {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const c = ctx;
    if (c.state === 'suspended') c.resume();
    const tone = (freq: number, start: number, dur: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.35, c.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + start);
      o.stop(c.currentTime + start + dur + 0.05);
    };
    tone(880, 0, 0.6);
    tone(660, 0.35, 0.9);
    return new Promise((r) => setTimeout(r, 1200));
  } catch {
    return Promise.resolve();
  }
}

/** "A-012" -> "A dua belas" */
export function queueToWords(queueNo: string): string {
  const [prefix, n] = queueNo.split('-');
  return `${prefix} ${terbilang(Number(n))}`;
}

export function queueAnnouncement(queueNo: string, poliName: string): string {
  return `Nomor antrian ${queueToWords(queueNo)}, silakan ke ${poliName.startsWith('Instalasi') ? poliName : `Poli ${poliName}`}`;
}

export async function announce(queueNo: string, poliName: string): Promise<void> {
  await playDing();
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(queueAnnouncement(queueNo, poliName));
  u.lang = 'id-ID';
  u.rate = 0.92;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('id'));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
