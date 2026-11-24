import type { SpeakerRole } from "../types/reel";

export const UPLOADED_BARI_SONG_URL =
  "/assets/aistudio/Georgian_Verb_Bar_7db0ae51.mp3";

export const UPLOADED_BARI_SONG_TITLE = "Bari (Georgian Verb Track)";

export interface TimedSceneCue {
  sceneIndex: number; // 0: Hook, 1: Clue, 2: Valley, 3: Spade, 4: Bar, 5: Trio/Recap
  startTime: number;
  endTime: number;
  label: string;
  highlightRowIndex?: number; // Used in Scene 5 chorus to pulse Valley(0), Spade(1), Bar(2)
}

export interface SyncedLyricWord {
  text: string;
  start: number;
  end: number;
  accent?: boolean;
}

export interface SyncedLyricCue {
  id: string;
  startTime: number;
  endTime: number;
  speaker: SpeakerRole;
  words: SyncedLyricWord[];
}

export const BARI_SONG_DURATION = 42.84;

export const BARI_SONG_SCENE_CUES: TimedSceneCue[] = [
  {
    sceneIndex: 0,
    startTime: 0.0,
    endTime: 5.8,
    label: "Hook",
  },
  {
    sceneIndex: 1,
    startTime: 5.8,
    endTime: 9.2,
    label: "Clue",
  },
  {
    sceneIndex: 2,
    startTime: 9.2,
    endTime: 15.0,
    label: "01 Valley",
  },
  {
    sceneIndex: 3,
    startTime: 15.0,
    endTime: 20.3,
    label: "02 Spade",
  },
  {
    sceneIndex: 5,
    startTime: 20.3,
    endTime: 26.0,
    label: "Chorus",
  },
  {
    sceneIndex: 4,
    startTime: 26.0,
    endTime: 30.2,
    label: "03 Bar",
  },
  {
    sceneIndex: 5,
    startTime: 30.2,
    endTime: 42.84,
    label: "Recap",
  },
];

function buildTimedWords(
  tokens: Array<{ text: string; accent?: boolean }>,
  start: number,
  end: number
): SyncedLyricWord[] {
  const weights = tokens.map((t) => Math.max(2, t.text.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(0.2, end - start);
  let cursor = start;
  return tokens.map((tok, idx) => {
    const dur = (weights[idx] / totalWeight) * span;
    const wStart = cursor;
    const wEnd = idx === tokens.length - 1 ? end : cursor + dur;
    cursor = wEnd;
    return {
      text: tok.text,
      start: wStart,
      end: wEnd,
      accent: tok.accent,
    };
  });
}

export const BARI_SONG_LYRICS_CUES: SyncedLyricCue[] = [
  {
    id: "cue-intro",
    startTime: 0.4,
    endTime: 5.6,
    speaker: "hostA",
    words: buildTimedWords(
      [
        { text: "♪" },
        { text: "One" },
        { text: "Georgian" },
        { text: "word:" },
        { text: "ბარი", accent: true },
        { text: "(ba-ri)" },
        { text: "♪" },
      ],
      0.4,
      5.6
    ),
  },
  {
    id: "cue-clue",
    startTime: 5.8,
    endTime: 9.1,
    speaker: "hostB",
    words: buildTimedWords(
      [
        { text: "♪" },
        { text: "Watch" },
        { text: "the" },
        { text: "verb" },
        { text: "for" },
        { text: "the" },
        { text: "clue" },
        { text: "♪" },
      ],
      5.8,
      9.1
    ),
  },
  {
    id: "cue-v1a",
    startTime: 9.2,
    endTime: 12.2,
    speaker: "hostA",
    words: buildTimedWords(
      [
        { text: "Walking" },
        { text: "down" },
        { text: "the" },
        { text: "mountain" },
        { text: "road," },
        { text: "the" },
        { text: "verb" },
        { text: "says" },
        { text: "ჩავედით", accent: true },
      ],
      9.2,
      12.2
    ),
  },
  {
    id: "cue-v1b",
    startTime: 12.2,
    endTime: 15.0,
    speaker: "hostA",
    words: buildTimedWords(
      [
        { text: "ბარში", accent: true },
        { text: "ჩავედით", accent: true },
        { text: "—" },
        { text: "now" },
        { text: "you" },
        { text: "know" },
        { text: "the" },
        { text: "valley's" },
        { text: "where" },
        { text: "we" },
        { text: "sit" },
      ],
      12.2,
      15.0
    ),
  },
  {
    id: "cue-v2a",
    startTime: 15.0,
    endTime: 17.6,
    speaker: "hostB",
    words: buildTimedWords(
      [
        { text: "Pick" },
        { text: "up" },
        { text: "the" },
        { text: "garden" },
        { text: "spade," },
        { text: "hear" },
        { text: "the" },
        { text: "verb" },
        { text: "go" },
        { text: "თხრის", accent: true },
      ],
      15.0,
      17.6
    ),
  },
  {
    id: "cue-v2b",
    startTime: 17.6,
    endTime: 20.3,
    speaker: "hostB",
    words: buildTimedWords(
      [
        { text: "ბარით", accent: true },
        { text: "მიწას" },
        { text: "თხრის", accent: true },
        { text: "—" },
        { text: "digging" },
        { text: "soil" },
        { text: "beneath" },
        { text: "the" },
        { text: "trees" },
      ],
      17.6,
      20.3
    ),
  },
  {
    id: "cue-c1",
    startTime: 20.3,
    endTime: 23.2,
    speaker: "hostA",
    words: buildTimedWords(
      [
        { text: "Oh," },
        { text: "ბარი!", accent: true },
        { text: "One" },
        { text: "short" },
        { text: "sound," },
        { text: "three" },
        { text: "worlds" },
        { text: "inside" },
        { text: "the" },
        { text: "line" },
      ],
      20.3,
      23.2
    ),
  },
  {
    id: "cue-c2",
    startTime: 23.2,
    endTime: 26.0,
    speaker: "hostB",
    words: buildTimedWords(
      [
        { text: "Valley,", accent: true },
        { text: "shovel,", accent: true },
        { text: "Tbilisi" },
        { text: "café", accent: true },
        { text: "where" },
        { text: "we" },
        { text: "go" },
        { text: "to" },
        { text: "dine" },
      ],
      23.2,
      26.0
    ),
  },
  {
    id: "cue-c3",
    startTime: 26.0,
    endTime: 30.0,
    speaker: "hostA",
    words: buildTimedWords(
      [
        { text: "If" },
        { text: "you" },
        { text: "hear" },
        { text: "სვამს", accent: true },
        { text: "—" },
        { text: "pour" },
        { text: "a" },
        { text: "cup," },
        { text: "you're" },
        { text: "at" },
        { text: "the" },
        { text: "bar", accent: true },
        { text: "tonight" },
      ],
      26.0,
      29.7
    ),
  },
  {
    id: "cue-c4",
    startTime: 30.2,
    endTime: 34.0,
    speaker: "hostB",
    words: buildTimedWords(
      [
        { text: "Watch" },
        { text: "the" },
        { text: "Georgian" },
        { text: "verb" },
        { text: "and" },
        { text: "every" },
        { text: "meaning" },
        { text: "lands" },
        { text: "just" },
        { text: "right!" },
      ],
      30.2,
      33.5
    ),
  },
  {
    id: "cue-outro",
    startTime: 34.0,
    endTime: 42.84,
    speaker: "hostA",
    words: buildTimedWords(
      [
        { text: "ბარი", accent: true },
        { text: "·" },
        { text: "Valley" },
        { text: "·" },
        { text: "Spade" },
        { text: "·" },
        { text: "Bar" },
      ],
      34.0,
      36.5
    ),
  },
];
