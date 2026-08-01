import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

/** `m:ss`, with a placeholder while the duration is still unknown. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

@Component({
  selector: 'app-audio-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audio-player.html',
  styleUrl: './audio-player.scss',
})
export class AudioPlayer {
  readonly src = input.required<string>();

  private readonly audio = viewChild.required<ElementRef<HTMLAudioElement>>('audio');

  readonly playing = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  /** A missing or unplayable file hides the player rather than showing a broken one. */
  readonly failed = signal(false);

  /** While the thumb is being dragged, `timeupdate` must not pull it back to the old position. */
  private seeking = false;

  constructor() {
    // A new source is a new lesson — drop the old position, duration and error state.
    effect(() => {
      this.src();
      untracked(() => {
        this.playing.set(false);
        this.currentTime.set(0);
        this.duration.set(0);
        this.failed.set(false);
      });
    });
  }

  readonly progress = computed(() => {
    const d = this.duration();
    return d > 0 ? (this.currentTime() / d) * 100 : 0;
  });

  readonly display = computed(() => `${formatTime(this.currentTime())} / ${formatTime(this.duration())}`);

  toggle(): void {
    const el = this.audio().nativeElement;
    if (el.paused) {
      void el.play().catch(() => this.failed.set(true));
    } else {
      el.pause();
    }
  }

  onMetadata(): void {
    const d = this.audio().nativeElement.duration;
    this.duration.set(Number.isFinite(d) ? d : 0);
  }

  onTimeUpdate(): void {
    if (!this.seeking) this.currentTime.set(this.audio().nativeElement.currentTime);
  }

  onSeek(event: Event): void {
    this.seeking = true;
    const value = Number((event.target as HTMLInputElement).value);
    this.currentTime.set(value);
    this.audio().nativeElement.currentTime = value;
  }

  onSeekEnd(): void {
    this.seeking = false;
  }
}
