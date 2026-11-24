import type { GeorgianLesson, ReelSettings, ReelTheme } from "../types/reel";
import { CANVAS_H, CANVAS_W, renderReelFrame } from "./reelRenderer";
import { buildTimeline, getPlaybackFrame } from "./timeline";

export interface ExportProgress {
  progress: number; // 0..1
  status: string;
}

export async function exportCoverPng(
  lesson: GeorgianLesson,
  settings: ReelSettings,
  theme: ReelTheme
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to initialize 2D canvas context.");

  const timeline = buildTimeline(lesson);
  const frame = getPlaybackFrame(timeline, 1.2, false);
  renderReelFrame(ctx, lesson, frame, settings, theme);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) throw new Error("Failed to render cover PNG.");

  triggerDownload(blob, `georgian-is-easy-${lesson.id}-cover.png`);
}

async function recordReelWebmBlob(
  lesson: GeorgianLesson,
  settings: ReelSettings,
  theme: ReelTheme,
  audioBuffer: AudioBuffer | null,
  onProgress: (p: ExportProgress) => void,
  musicBuffer: AudioBuffer | null = null,
  musicVolume: number = 0.2,
  useSyncedSongTrack: boolean = false,
  progressMax: number = 1
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Video recording (MediaRecorder) is not supported in this browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to initialize 2D canvas context.");

  const timeline = buildTimeline(lesson, audioBuffer?.duration, useSyncedSongTrack);
  const fps = 30;
  const videoStream = canvas.captureStream(fps);

  let audioContext: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  let musicSource: AudioBufferSourceNode | null = null;
  const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

  if (audioBuffer || musicBuffer) {
    audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();

    if (audioBuffer) {
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(dest);
    }

    if (musicBuffer) {
      musicSource = audioContext.createBufferSource();
      musicSource.buffer = musicBuffer;
      musicSource.loop = true;
      const musicGain = audioContext.createGain();
      musicGain.gain.value = Math.max(0, Math.min(1, musicVolume));
      musicSource.connect(musicGain).connect(dest);
    }

    tracks.push(...dest.stream.getAudioTracks());
  }

  const combinedStream = new MediaStream(tracks);
  const preferredMimes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mimeType = preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingFinished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.onerror = () => {
      reject(new Error("Video encoding encountered an error."));
    };
  });

  onProgress({ progress: 0, status: "Recording 1080×1920 reel..." });
  recorder.start(250);
  if (audioContext) {
    await audioContext.resume();
    if (audioSource) audioSource.start(0);
    if (musicSource) musicSource.start(0);
  }

  const startMs = performance.now();
  const durationMs = timeline.totalDuration * 1000;

  await new Promise<void>((resolve) => {
    function step() {
      const elapsedMs = performance.now() - startMs;
      const tSec = Math.min(timeline.totalDuration, elapsedMs / 1000);
      const frame = getPlaybackFrame(timeline, tSec, true);
      renderReelFrame(ctx!, lesson, frame, settings, theme);

      onProgress({
        progress: Math.min(progressMax * 0.98, (elapsedMs / durationMs) * progressMax),
        status: `Recording frame (${tSec.toFixed(1)}s / ${timeline.totalDuration.toFixed(1)}s)`,
      });

      if (elapsedMs < durationMs) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });

  recorder.stop();
  if (audioSource) {
    try {
      audioSource.stop();
    } catch {
      // Ignore if already ended
    }
  }
  if (musicSource) {
    try {
      musicSource.stop();
    } catch {
      // Ignore if already ended
    }
  }
  if (audioContext) {
    await audioContext.close().catch(() => {});
  }

  return recordingFinished;
}

export async function exportReelWebm(
  lesson: GeorgianLesson,
  settings: ReelSettings,
  theme: ReelTheme,
  audioBuffer: AudioBuffer | null,
  onProgress: (p: ExportProgress) => void,
  musicBuffer: AudioBuffer | null = null,
  musicVolume: number = 0.2,
  useSyncedSongTrack: boolean = false
): Promise<void> {
  const blob = await recordReelWebmBlob(
    lesson,
    settings,
    theme,
    audioBuffer,
    onProgress,
    musicBuffer,
    musicVolume,
    useSyncedSongTrack,
    0.96
  );

  onProgress({ progress: 1, status: "Finalizing WebM video..." });
  triggerDownload(blob, `georgian-is-easy-${lesson.id}.webm`);
}

export async function exportReelMp4(
  lesson: GeorgianLesson,
  settings: ReelSettings,
  theme: ReelTheme,
  audioBuffer: AudioBuffer | null,
  onProgress: (p: ExportProgress) => void,
  musicBuffer: AudioBuffer | null = null,
  musicVolume: number = 0.2,
  useSyncedSongTrack: boolean = false
): Promise<void> {
  const webmBlob = await recordReelWebmBlob(
    lesson,
    settings,
    theme,
    audioBuffer,
    onProgress,
    musicBuffer,
    musicVolume,
    useSyncedSongTrack,
    0.82
  );

  onProgress({
    progress: 0.9,
    status: "Converting to Instagram-ready MP4 (H.264 + AAC)...",
  });

  const res = await fetch("/api/convert-mp4", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: webmBlob,
  });

  if (!res.ok) {
    let errMsg = "Failed to convert reel to MP4.";
    try {
      const data = await res.json();
      if (data?.error) errMsg = data.error;
    } catch {
      // Ignore non-JSON error body
    }
    throw new Error(errMsg);
  }

  const mp4Blob = await res.blob();
  onProgress({ progress: 1, status: "Downloading MP4 video..." });
  triggerDownload(mp4Blob, `georgian-is-easy-${lesson.id}.mp4`);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
