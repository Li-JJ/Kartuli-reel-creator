export type PropIconKey =
  | "valley"
  | "shovel"
  | "cocktail"
  | "eye"
  | "wheel"
  | "gem"
  | "door"
  | "goal"
  | "book"
  | "calendar"
  | "back"
  | "cake"
  | "hand"
  | "cards"
  | "wild"
  | "clue";

export type HostPairId = "khinkali-qvevri" | "sheep-tower";

export type ReelThemeId =
  | "sage-terracotta"
  | "tbilisi-alabaster"
  | "svaneti-slate"
  | "midnight-qvevri";

export interface ReelTheme {
  id: ReelThemeId;
  name: string;
  bg: string;
  surface: string;
  headerText: string;
  wordAccent: string;
  bodyText: string;
  mutedText: string;
  outline: string;
  highlightFill: string;
}

export interface WordMeaning {
  id: string;
  meaningLabel: string;
  icon: PropIconKey;
  georgianSentence: string;
  transliteration: string;
  clueVerb: string;
  clueVerbMeaning: string;
  englishTranslation: string;
}

export type SpeakerRole = "hostA" | "hostB";

export interface DialogueLine {
  id: string;
  speaker: SpeakerRole;
  sceneIndex: number; // 0: Hook, 1: Clue Setup, 2: Meaning 1, 3: Meaning 2, 4: Meaning 3, 5: Recap
  text: string;
}

export interface GeorgianLesson {
  id: string;
  word: string;
  transliteration: string;
  seriesTitle: string;
  hookEnglish: string;
  clueSetupLine: string;
  recapLine: string;
  meanings: [WordMeaning, WordMeaning, WordMeaning];
  dialogue: DialogueLine[];
  captionText: string;
}

export interface ReelSettings {
  themeId: ReelThemeId;
  hostPair: HostPairId;
  showPhonetics: boolean;
  showSubtitles: boolean;
  showVerbBadge: boolean;
  musicVolume: number; // 0..1 background audio mix level
}

export type UploadedAudioMode = "main" | "background";
