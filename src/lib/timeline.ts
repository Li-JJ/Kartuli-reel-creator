import {
  BARI_SONG_DURATION,
  BARI_SONG_LYRICS_CUES,
  BARI_SONG_SCENE_CUES,
  type SyncedLyricCue,
} from "../data/syncedSongTrack";
import type { DialogueLine, GeorgianLesson, SpeakerRole } from "../types/reel";

export interface SceneWindow {
  sceneIndex: number;
  startTime: number;
  endTime: number;
  dialogueLine: DialogueLine | null;
  label?: string;
}

export interface TimelineState {
  totalDuration: number;
  windows: SceneWindow[];
  isSongSynced: boolean;
}

export interface ActivePlaybackFrame {
  time: number;
  totalDuration: number;
  sceneIndex: number;
  sceneProgress: number; // 0..1 within current scene
  activeLine: DialogueLine | null;
  activeSpeaker: SpeakerRole | null;
  mouthOpenAmount: number; // 0..1 simulated speech cadence
  syncedLyricCue: SyncedLyricCue | null;
  highlightedRecapRow: number | null; // 0, 1, or 2 during chorus trio callout
  beatPulse: number; // 0..1 musical beat pulse for head bobbing
}

function countWords(text: string): number {
  return Math.max(4, text.trim().split(/\s+/).filter(Boolean).length);
}

/**
 * Computes scene boundaries for the reel.
 * When `useSyncedSongTrack` is true (e.g. Georgian_Verb_Bar_7db0ae51.mp3),
 * scenes lock directly to the exact vocal & musical cues of the song!
 */
export function buildTimeline(
  lesson: GeorgianLesson,
  audioDuration?: number | null,
  useSyncedSongTrack: boolean = false
): TimelineState {
  if (useSyncedSongTrack && lesson.id === "bari") {
    const total = audioDuration && audioDuration > 10 ? audioDuration : BARI_SONG_DURATION;
    const scale = total / BARI_SONG_DURATION;
    return {
      totalDuration: total,
      isSongSynced: true,
      windows: BARI_SONG_SCENE_CUES.map((c) => ({
        sceneIndex: c.sceneIndex,
        startTime: c.startTime * scale,
        endTime: Math.min(total, c.endTime * scale),
        dialogueLine: null,
        label: c.label,
      })),
    };
  }

  const defaultSceneDurations = [2.9, 2.6, 3.6, 3.6, 3.6, 3.2];
  const linesByScene = new Map<number, DialogueLine>();
  for (const line of lesson.dialogue) {
    if (!linesByScene.has(line.sceneIndex)) {
      linesByScene.set(line.sceneIndex, line);
    }
  }

  let durations: number[];

  if (audioDuration && audioDuration > 2) {
    const weights = [0, 1, 2, 3, 4, 5].map((idx) => {
      const line = linesByScene.get(idx);
      return line ? countWords(line.text) + 1.5 : 8;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    durations = weights.map((w) => (w / totalWeight) * audioDuration);
  } else {
    durations = defaultSceneDurations;
  }

  const windows: SceneWindow[] = [];
  let cursor = 0;
  for (let i = 0; i < 6; i++) {
    const dur = durations[i];
    windows.push({
      sceneIndex: i,
      startTime: cursor,
      endTime: cursor + dur,
      dialogueLine: linesByScene.get(i) ?? null,
    });
    cursor += dur;
  }

  return {
    totalDuration: cursor,
    windows,
    isSongSynced: false,
  };
}

export function getPlaybackFrame(
  timeline: TimelineState,
  rawTime: number,
  isPlaying: boolean
): ActivePlaybackFrame {
  const time = Math.max(0, Math.min(rawTime, timeline.totalDuration));
  let activeWindow = timeline.windows[timeline.windows.length - 1];

  for (const w of timeline.windows) {
    if (time >= w.startTime && time <= w.endTime) {
      activeWindow = w;
      break;
    }
  }

  const span = Math.max(0.001, activeWindow.endTime - activeWindow.startTime);
  const sceneProgress = Math.max(0, Math.min(1, (time - activeWindow.startTime) / span));

  if (timeline.isSongSynced) {
    const lyricCue =
      BARI_SONG_LYRICS_CUES.find(
        (c) => time >= c.startTime && time <= c.endTime
      ) ?? null;

    const isVocalActive =
      isPlaying && time >= 9.2 && time <= 33.4 && Boolean(lyricCue);
    const syllableWave =
      0.5 +
      0.5 * Math.sin(time * 24.0) * Math.cos(time * 10.5 + activeWindow.sceneIndex);
    const mouthOpenAmount = isVocalActive ? Math.max(0, syllableWave) : 0;

    // Pulse individual recap rows as "valley, shovel, Tbilisi cafe" are sung (23.2s - 26.0s)
    // and again during the outro drop
    let highlightedRecapRow: number | null = null;
    if (time >= 23.15 && time < 23.95) highlightedRecapRow = 0;
    else if (time >= 23.95 && time < 24.65) highlightedRecapRow = 1;
    else if (time >= 24.65 && time < 26.0) highlightedRecapRow = 2;
    else if (time >= 33.8 && time < 36.2) highlightedRecapRow = 0;
    else if (time >= 36.2 && time < 38.6) highlightedRecapRow = 1;
    else if (time >= 38.6 && time <= 41.2) highlightedRecapRow = 2;

    // 106 BPM musical beat pulse for head-bobbing
    const beatPulse = isPlaying
      ? Math.pow(Math.max(0, Math.sin(time * Math.PI * (106 / 60))), 2)
      : 0;

    return {
      time,
      totalDuration: timeline.totalDuration,
      sceneIndex: activeWindow.sceneIndex,
      sceneProgress,
      activeLine: null,
      activeSpeaker: lyricCue?.speaker ?? null,
      mouthOpenAmount,
      syncedLyricCue: lyricCue,
      highlightedRecapRow,
      beatPulse,
    };
  }

  const isSpeakingWindow =
    isPlaying &&
    sceneProgress > 0.04 &&
    sceneProgress < 0.92 &&
    Boolean(activeWindow.dialogueLine);
  const syllableWave =
    0.5 +
    0.5 *
      Math.sin(time * 22.0) *
      Math.cos(time * 9.3 + activeWindow.sceneIndex * 1.1);
  const mouthOpenAmount = isSpeakingWindow ? Math.max(0, syllableWave) : 0;

  return {
    time,
    totalDuration: timeline.totalDuration,
    sceneIndex: activeWindow.sceneIndex,
    sceneProgress,
    activeLine: activeWindow.dialogueLine,
    activeSpeaker: activeWindow.dialogueLine?.speaker ?? null,
    mouthOpenAmount,
    syncedLyricCue: null,
    highlightedRecapRow: null,
    beatPulse: 0,
  };
}
