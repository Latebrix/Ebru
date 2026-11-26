/** Plays Kalem's recorded lines and reports how loud the voice is right now. */
export interface Line {
  id: string;
  text: string;
  url: string;
  duration: number;
  words: [string, number, number][];
}

export async function loadLine(id: string): Promise<Line> {
  // Only fetched when somebody asks.
  const { KALEM } = await import('../../content/kalem.ts');
  const entry = KALEM[id as keyof typeof KALEM];
  if (!entry) throw new Error(`No recording for ${id}`);
  return { id, text: entry.text, url: `./${entry.file}`, duration: entry.duration, words: entry.words };
}

/** Sentences with the index of their first word, for captions. */
export function sentences(line: Line): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let from = 0;
  line.words.forEach(([word], i) => {
    const pause = /[.?!]$/.test(word);
    if (pause || i === line.words.length - 1) {
      // Keep very short sentences together with the next one.
      if (pause && i - from < 2 && i < line.words.length - 1) return;
      out.push({ from, to: i });
      from = i + 1;
    }
  });
  return out;
}

export class KalemVoice {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audio: HTMLAudioElement | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private level = 0;
  line: Line | null = null;
  onEnd: () => void = () => {};

  async play(line: Line): Promise<void> {
    this.stop();
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.addEventListener('ended', () => this.finish());
      this.audio.addEventListener('error', () => this.finish());
      try {
        this.ctx = new AudioContext();
        const source = this.ctx.createMediaElementSource(this.audio);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.5;
        this.data = new Uint8Array(this.analyser.fftSize);
        source.connect(this.analyser).connect(this.ctx.destination);
      } catch {
        // Without an analyser the voice still plays; the fins follow the word timings instead.
        this.analyser = null;
      }
    }
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    this.line = line;
    this.audio.src = line.url;
    await this.audio.play();
  }

  private finish() {
    this.line = null;
    this.onEnd();
  }

  stop() {
    if (this.audio && !this.audio.paused) this.audio.pause();
    this.line = null;
  }

  get time(): number {
    return this.audio?.currentTime ?? 0;
  }

  /** Smoothed loudness, 0..1. */
  loudness(dt: number): number {
    let goal = 0;
    if (this.line && this.audio && !this.audio.paused) {
      if (this.analyser && this.data) {
        this.analyser.getByteTimeDomainData(this.data);
        let sum = 0;
        for (const v of this.data) sum += ((v - 128) / 128) ** 2;
        goal = Math.min(1, Math.sqrt(sum / this.data.length) * 5.2);
      } else {
        const t = this.time;
        goal = this.line.words.some(([, a, b]) => t >= a && t <= b) ? 0.6 : 0.05;
      }
    }
    this.level += (goal - this.level) * (1 - Math.exp(-dt * (goal > this.level ? 22 : 7)));
    return this.level;
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
  }
}
