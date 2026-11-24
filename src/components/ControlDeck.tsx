import React, { useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { PRESET_LESSONS, REEL_THEMES } from "../data/lessons";
import type {
  GeorgianLesson,
  HostPairId,
  PropIconKey,
  ReelSettings,
  ReelThemeId,
  UploadedAudioMode,
} from "../types/reel";

export type StudioTab = "lessons" | "script" | "style" | "ai" | "audio";

const ICON_OPTIONS: Array<{ value: PropIconKey; label: string }> = [
  { value: "valley", label: "Mountain Valley" },
  { value: "shovel", label: "Garden Spade" },
  { value: "cocktail", label: "Cocktail / Bar" },
  { value: "eye", label: "Human Eye" },
  { value: "wheel", label: "Car Wheel" },
  { value: "gem", label: "Gemstone" },
  { value: "door", label: "Front Door" },
  { value: "goal", label: "Soccer Goal" },
  { value: "book", label: "Open Book" },
  { value: "calendar", label: "Calendar Year" },
  { value: "back", label: "Lower Back" },
  { value: "cake", label: "Birthday Cake" },
  { value: "hand", label: "Hand" },
  { value: "cards", label: "Playing Cards" },
  { value: "wild", label: "Magnifier / Wild" },
  { value: "clue", label: "Clue Lens" },
];

const AI_QUICK_TOPICS = [
  "ყური (ear / cup handle)",
  "თავი (head / chapter / self)",
  "ფარი (shield / car headlight)",
  "გული (heart / core / card suit)",
];

export interface AudioTrackSummary {
  fileName: string;
  duration: number;
  isSample?: boolean;
}

function formatFullVideoScript(lesson: GeorgianLesson, hostPair: HostPairId): string {
  const hostALabel = hostPair === "khinkali-qvevri" ? "Khinkali" : "Sheep";
  const hostBLabel = hostPair === "khinkali-qvevri" ? "Qvevri" : "Tower";

  const meaningBlocks = lesson.meanings
    .map((m, idx) => {
      const lines = [
        `[${idx + 1}. ${m.meaningLabel}]`,
        `${m.georgianSentence}${m.transliteration ? ` (${m.transliteration})` : ""}`,
      ];
      if (m.clueVerb) {
        lines.push(
          `Verb clue: ${m.clueVerb}${m.clueVerbMeaning ? ` = "${m.clueVerbMeaning}"` : ""}`
        );
      }
      if (m.englishTranslation) {
        lines.push(m.englishTranslation);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const dialogueLines = lesson.dialogue
    .map((d) => `${d.speaker === "hostA" ? hostALabel : hostBLabel}: ${d.text}`)
    .join("\n");

  return [
    `${lesson.seriesTitle} — ${lesson.word}${lesson.transliteration ? ` (${lesson.transliteration})` : ""}`,
    "",
    "[Hook]",
    lesson.hookEnglish,
    "",
    "[Clue]",
    lesson.clueSetupLine,
    "",
    meaningBlocks,
    "",
    "[Recap]",
    lesson.recapLine,
    "",
    "[Dialogue]",
    dialogueLines,
  ].join("\n");
}

interface ControlDeckProps {
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  lesson: GeorgianLesson;
  customLessons: GeorgianLesson[];
  onSelectLesson: (lesson: GeorgianLesson) => void;
  onDeleteCustomLesson: (lessonId: string) => void;
  onUpdateLesson: (updated: GeorgianLesson) => void;
  settings: ReelSettings;
  onUpdateSettings: (updated: ReelSettings) => void;
  onGenerateLesson: (topicOrWord: string) => Promise<void>;
  isGeneratingLesson: boolean;
  lessonError: string | null;
  lastGeneratedLessonId: string | null;
  onGenerateAudio: () => void;
  isGeneratingAudio: boolean;
  onExportVideo: () => void;
  onExportWebm: () => void;
  onExportCover: () => void;
  isExporting: boolean;
  exportProgress: { progress: number; status: string } | null;
  exportError: string | null;
  mainAudioInfo: AudioTrackSummary | null;
  bgAudioInfo: AudioTrackSummary | null;
  isUploadingAudio: boolean;
  uploadAudioError: string | null;
  auditionTarget: UploadedAudioMode | null;
  onUploadAudio: (file: File, mode: UploadedAudioMode) => Promise<void>;
  onToggleAudition: (mode: UploadedAudioMode) => void;
  onSwitchAudioMode: (fromMode: UploadedAudioMode) => void;
  onRemoveAudio: (mode: UploadedAudioMode) => void;
  onRestoreSampleBari: () => void;
  canRestoreSampleBari: boolean;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  activeTab,
  onTabChange,
  lesson,
  customLessons,
  onSelectLesson,
  onDeleteCustomLesson,
  onUpdateLesson,
  settings,
  onUpdateSettings,
  onGenerateLesson,
  isGeneratingLesson,
  lessonError,
  lastGeneratedLessonId,
  onGenerateAudio,
  isGeneratingAudio,
  onExportVideo,
  onExportWebm,
  onExportCover,
  isExporting,
  exportProgress,
  exportError,
  mainAudioInfo,
  bgAudioInfo,
  isUploadingAudio,
  uploadAudioError,
  auditionTarget,
  onUploadAudio,
  onToggleAudition,
  onSwitchAudioMode,
  onRemoveAudio,
  onRestoreSampleBari,
  canRestoreSampleBari,
}) => {
  const [topicInput, setTopicInput] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedFullScript, setCopiedFullScript] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadedAudioMode>("main");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const customIds = new Set(customLessons.map((l) => l.id));
  const allLessons = [...customLessons, ...PRESET_LESSONS];
  const fullVideoScript = formatFullVideoScript(lesson, settings.hostPair);

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(lesson.captionText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleCopyFullScript = async () => {
    try {
      await navigator.clipboard.writeText(fullVideoScript);
      setCopiedFullScript(true);
      setTimeout(() => setCopiedFullScript(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim() || isGeneratingLesson) return;
    await onGenerateLesson(topicInput.trim());
    setTopicInput("");
  };

  const handleFilePicked = async (file: File | null | undefined) => {
    if (!file || isUploadingAudio) return;
    await onUploadAudio(file, uploadMode);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[#DDE1D4] bg-white">
      {/* Segmented Navigation Bar */}
      <div className="border-b border-[#EAEDE3] px-5 pt-4 pb-3">
        <div className="grid grid-cols-5 gap-1 rounded-lg bg-[#F1F3E9] p-1">
          {(
            [
              { id: "lessons", label: "Lessons" },
              { id: "script", label: "Script" },
              { id: "style", label: "Style" },
              { id: "ai", label: "AI Writer" },
              { id: "audio", label: "Upload MP3" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`py-2 px-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap truncate ${
                activeTab === tab.id
                  ? "bg-white text-[#184231] shadow-sm"
                  : "text-[#5B6155] hover:text-[#1C1C1A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-5 sm:p-6 space-y-6">
        {activeTab === "lessons" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1C1C1A]">
                  Georgian Wordplay Library
                </h2>
                <p className="mt-1 text-sm text-[#5B6155]">
                  Pick a Georgian homonym reel or keep generating new ones with AI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("ai")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#BF4928] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#A43B1E] whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Generate Lesson</span>
              </button>
            </div>

            <div className="divide-y divide-[#ECEFE5] border-t border-b border-[#ECEFE5]">
              {allLessons.map((item) => {
                const isSelected = item.id === lesson.id;
                const isCustom = customIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 rounded-lg transition-colors ${
                      isSelected ? "bg-[#F2F5EA]" : "hover:bg-[#FAFBF7]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectLesson(item)}
                      className="flex-1 min-w-0 py-3.5 px-3 text-left flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-georgian text-xl font-black text-[#BF4928]">
                            {item.word}
                          </span>
                          <span className="font-mono-tabular text-xs text-[#5B6155]">
                            {item.transliteration}
                          </span>
                          {isCustom && (
                            <span className="text-[11px] font-semibold text-[#184231]">
                              · Custom
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#5B6155] truncate">
                          {item.meanings.map((m) => m.meaningLabel).join("  ·  ")}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                          isSelected ? "text-[#184231]" : "text-[#8A9184]"
                        }`}
                      >
                        {isSelected ? "Active" : "Load"}
                      </span>
                    </button>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomLesson(item.id)}
                        title="Remove custom lesson"
                        aria-label={`Remove ${item.word}`}
                        className="mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8A9184] transition-colors hover:bg-[#FEE4E2] hover:text-[#B42318]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Caption Copy Box */}
            <div className="rounded-xl border border-[#E5E8DC] bg-[#FAFBF7] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#184231]">
                  Instagram Reel Caption
                </span>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BF4928] hover:underline whitespace-nowrap"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Caption</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#454940]">
                {lesson.captionText}
              </p>
            </div>
          </div>
        )}

        {activeTab === "script" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1C1C1A]">
                Edit Reel Script & Meanings
              </h2>
              <p className="mt-1 text-sm text-[#5B6155]">
                Copy the whole video script below for song generation, or edit any line live.
              </p>
            </div>

            {/* Consolidated Full Video Script for Song Generation */}
            <div className="rounded-xl border border-[#DCE0D2] bg-[#FAFBF7] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#184231]">
                  Full Video Script (Copy for Song Generation)
                </span>
                <button
                  type="button"
                  onClick={handleCopyFullScript}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BF4928] hover:underline whitespace-nowrap"
                >
                  {copiedFullScript ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Full Script</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                rows={9}
                value={fullVideoScript}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Full video script text"
                className="w-full rounded-lg border border-[#DCE0D2] bg-white px-3 py-2.5 font-sans text-xs leading-relaxed text-[#383C33] focus:border-[#184231] focus:outline-none"
              />
            </div>

            {/* Core Header & Hook */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#454940]">
                  Georgian Word
                </span>
                <input
                  type="text"
                  value={lesson.word}
                  onChange={(e) =>
                    onUpdateLesson({ ...lesson, word: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[#D8DCD0] bg-white px-3 py-2 font-georgian text-base font-bold text-[#1C1C1A] focus:border-[#184231] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#454940]">
                  Pronunciation
                </span>
                <input
                  type="text"
                  value={lesson.transliteration}
                  onChange={(e) =>
                    onUpdateLesson({ ...lesson, transliteration: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[#D8DCD0] bg-white px-3 py-2 font-mono-tabular text-sm text-[#1C1C1A] focus:border-[#184231] focus:outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#454940]">
                  Series Header
                </span>
                <input
                  type="text"
                  value={lesson.seriesTitle}
                  onChange={(e) =>
                    onUpdateLesson({ ...lesson, seriesTitle: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[#D8DCD0] bg-white px-3 py-2 text-sm font-semibold text-[#184231] focus:border-[#184231] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#454940]">
                  Hook Headline (2 lines)
                </span>
                <textarea
                  rows={2}
                  value={lesson.hookEnglish}
                  onChange={(e) =>
                    onUpdateLesson({ ...lesson, hookEnglish: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-[#D8DCD0] bg-white px-3 py-2 text-sm text-[#1C1C1A] focus:border-[#184231] focus:outline-none"
                />
              </label>
            </div>

            {/* 3 Meanings */}
            <div className="space-y-4 pt-2 border-t border-[#ECEFE5]">
              <h3 className="text-sm font-bold text-[#1C1C1A]">
                Three Context Meanings
              </h3>
              {lesson.meanings.map((meaning, idx) => (
                <div
                  key={meaning.id}
                  className="rounded-xl border border-[#E5E8DC] bg-[#FAFBF7] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#184231]">
                      0{idx + 1} · Meaning Beat
                    </span>
                    <select
                      value={meaning.icon}
                      onChange={(e) => {
                        const next = [...lesson.meanings] as GeorgianLesson["meanings"];
                        next[idx] = {
                          ...meaning,
                          icon: e.target.value as PropIconKey,
                        };
                        onUpdateLesson({ ...lesson, meanings: next });
                      }}
                      className="rounded-md border border-[#D8DCD0] bg-white px-2 py-1 text-xs text-[#1C1C1A]"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={meaning.meaningLabel}
                      placeholder="Meaning label"
                      onChange={(e) => {
                        const next = [...lesson.meanings] as GeorgianLesson["meanings"];
                        next[idx] = { ...meaning, meaningLabel: e.target.value };
                        onUpdateLesson({ ...lesson, meanings: next });
                      }}
                      className="rounded-lg border border-[#D8DCD0] bg-white px-2.5 py-1.5 text-xs text-[#1C1C1A]"
                    />
                    <input
                      type="text"
                      value={meaning.georgianSentence}
                      placeholder="Georgian sentence"
                      onChange={(e) => {
                        const next = [...lesson.meanings] as GeorgianLesson["meanings"];
                        next[idx] = { ...meaning, georgianSentence: e.target.value };
                        onUpdateLesson({ ...lesson, meanings: next });
                      }}
                      className="rounded-lg border border-[#D8DCD0] bg-white px-2.5 py-1.5 font-georgian text-xs font-semibold text-[#1C1C1A]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={meaning.clueVerb}
                      placeholder="Clue verb (highlighted)"
                      onChange={(e) => {
                        const next = [...lesson.meanings] as GeorgianLesson["meanings"];
                        next[idx] = { ...meaning, clueVerb: e.target.value };
                        onUpdateLesson({ ...lesson, meanings: next });
                      }}
                      className="rounded-lg border border-[#D8DCD0] bg-white px-2.5 py-1.5 font-georgian text-xs text-[#BF4928]"
                    />
                    <input
                      type="text"
                      value={meaning.englishTranslation}
                      placeholder="English translation"
                      onChange={(e) => {
                        const next = [...lesson.meanings] as GeorgianLesson["meanings"];
                        next[idx] = { ...meaning, englishTranslation: e.target.value };
                        onUpdateLesson({ ...lesson, meanings: next });
                      }}
                      className="rounded-lg border border-[#D8DCD0] bg-white px-2.5 py-1.5 text-xs text-[#1C1C1A]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dialogue Beats */}
            <div className="space-y-3 pt-2 border-t border-[#ECEFE5]">
              <h3 className="text-sm font-bold text-[#1C1C1A]">
                Podcast Host Dialogue (6 Turns)
              </h3>
              {lesson.dialogue.map((line, idx) => (
                <div key={line.id} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...lesson.dialogue];
                      next[idx] = {
                        ...line,
                        speaker: line.speaker === "hostA" ? "hostB" : "hostA",
                      };
                      onUpdateLesson({ ...lesson, dialogue: next });
                    }}
                    className={`mt-1 w-20 shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      line.speaker === "hostA"
                        ? "bg-[#F1F3E9] text-[#184231]"
                        : "bg-[#FBEAE4] text-[#BF4928]"
                    }`}
                  >
                    {settings.hostPair === "khinkali-qvevri"
                      ? line.speaker === "hostA"
                        ? "Khinkali"
                        : "Qvevri"
                      : line.speaker === "hostA"
                        ? "Sheep"
                        : "Tower"}
                  </button>
                  <textarea
                    rows={2}
                    value={line.text}
                    onChange={(e) => {
                      const next = [...lesson.dialogue];
                      next[idx] = { ...line, text: e.target.value };
                      onUpdateLesson({ ...lesson, dialogue: next });
                    }}
                    className="flex-1 rounded-lg border border-[#D8DCD0] bg-white px-3 py-1.5 text-xs leading-relaxed text-[#1C1C1A] focus:border-[#184231] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "style" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1C1C1A]">
                Visual Style & Video Export
              </h2>
              <p className="mt-1 text-sm text-[#5B6155]">
                Match the warm sage-and-terracotta palette or switch host characters, then export at 1080×1920.
              </p>
            </div>

            {/* Color Palette */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-[#454940]">
                Reel Color Palette
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(REEL_THEMES) as ReelThemeId[]).map((tid) => {
                  const t = REEL_THEMES[tid];
                  const active = settings.themeId === tid;
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, themeId: tid })
                      }
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-[#184231] bg-[#F2F5EA]"
                          : "border-[#DDE1D4] bg-white hover:bg-[#FAFBF7]"
                      }`}
                    >
                      <span
                        className="h-7 w-7 shrink-0 rounded-full border border-black/15 flex items-center justify-center"
                        style={{ backgroundColor: t.bg }}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: t.wordAccent }}
                        />
                      </span>
                      <span className="text-xs font-semibold text-[#1C1C1A] truncate">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Host Cast Pair */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-[#454940]">
                Deadpan Host Duo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      id: "khinkali-qvevri" as HostPairId,
                      title: "Khinkali & Qvevri",
                      desc: "Pleated dumpling + clay wine amphora",
                    },
                    {
                      id: "sheep-tower" as HostPairId,
                      title: "Highland Sheep & Tower",
                      desc: "Tusheti sheep + Svaneti stone koshki",
                    },
                  ] as const
                ).map((pair) => {
                  const active = settings.hostPair === pair.id;
                  return (
                    <button
                      key={pair.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ ...settings, hostPair: pair.id })
                      }
                      className={`rounded-xl border p-3.5 text-left transition-colors ${
                        active
                          ? "border-[#184231] bg-[#F2F5EA]"
                          : "border-[#DDE1D4] bg-white hover:bg-[#FAFBF7]"
                      }`}
                    >
                      <div className="text-xs font-bold text-[#1C1C1A]">
                        {pair.title}
                      </div>
                      <div className="mt-0.5 text-xs text-[#5B6155]">
                        {pair.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Overlay Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-[#ECEFE5]">
              <span className="text-xs font-semibold text-[#454940]">
                Display Overlays
              </span>
              <div className="space-y-2">
                {[
                  {
                    key: "showPhonetics" as const,
                    label: "Show Romanized Pronunciation",
                  },
                  {
                    key: "showSubtitles" as const,
                    label: "Show Podcast Subtitles",
                  },
                  {
                    key: "showVerbBadge" as const,
                    label: "Highlight Clue Verb in Sentences",
                  },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center justify-between rounded-lg border border-[#E5E8DC] px-3.5 py-2.5 cursor-pointer hover:bg-[#FAFBF7]"
                  >
                    <span className="text-xs font-medium text-[#1C1C1A]">
                      {opt.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings[opt.key]}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          [opt.key]: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#184231]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Export Section */}
            <div className="space-y-3 pt-2 border-t border-[#ECEFE5]">
              <span className="text-xs font-semibold text-[#454940]">
                Export Ready-to-Post Assets
              </span>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onExportVideo}
                  disabled={isExporting}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#184231] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#133527] disabled:opacity-60 whitespace-nowrap"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Encoding MP4...</span>
                    </>
                  ) : (
                    <>
                      <Film className="h-4 w-4" />
                      <span>Export 1080×1920 MP4</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onExportWebm}
                  disabled={isExporting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D8DCD0] bg-white px-3.5 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] disabled:opacity-60 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>WebM</span>
                </button>

                <button
                  type="button"
                  onClick={onExportCover}
                  disabled={isExporting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#D8DCD0] bg-white px-3.5 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] disabled:opacity-60 whitespace-nowrap"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Cover PNG</span>
                </button>
              </div>

              {exportError && (
                <div className="rounded-lg border border-[#F3C5C5] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B42318]">
                  {exportError}
                </div>
              )}

              {exportProgress && (
                <div className="rounded-lg border border-[#E5E8DC] bg-[#FAFBF7] p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-[#184231]">
                    <span>{exportProgress.status}</span>
                    <span className="font-mono-tabular">
                      {Math.round(exportProgress.progress * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E1E5D6]">
                    <div
                      className="h-full bg-[#BF4928] transition-all duration-150"
                      style={{
                        width: `${Math.round(exportProgress.progress * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#1C1C1A]">
                Generate New Georgian Wordplay
              </h2>
              <p className="mt-1 text-sm text-[#5B6155]">
                Enter any Georgian word—or let AI pick a fresh homonym you haven&rsquo;t used yet—and keep generating as many lessons as you like.
              </p>
            </div>

            <form onSubmit={handleAiSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#454940]">
                  Georgian Word or Theme
                </span>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. ყური or Georgian word with 3 meanings"
                  className="mt-1.5 w-full rounded-lg border border-[#D8DCD0] bg-white px-3.5 py-2.5 text-sm text-[#1C1C1A] placeholder:text-[#8E9487] focus:border-[#184231] focus:outline-none"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isGeneratingLesson || !topicInput.trim()}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#BF4928] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#A43B1E] disabled:opacity-60 whitespace-nowrap"
                >
                  {isGeneratingLesson ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Writing Georgian Reel Script...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Create Wordplay Script</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isGeneratingLesson}
                  onClick={() =>
                    onGenerateLesson("Pick a fresh Georgian homonym with 3 clear verb-clue meanings")
                  }
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#D8DCD0] bg-white px-3.5 text-xs font-semibold text-[#184231] transition-colors hover:bg-[#F2F5EA] disabled:opacity-60 whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Surprise Me</span>
                </button>
              </div>
            </form>

            {lessonError && (
              <div className="rounded-lg border border-[#F3C5C5] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B42318]">
                {lessonError}
              </div>
            )}

            {lastGeneratedLessonId && lastGeneratedLessonId === lesson.id && (
              <div className="rounded-xl border border-[#CFE0CC] bg-[#F2F5EA] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#184231]">
                      Generated Script:
                    </span>
                    <span className="font-georgian text-lg font-black text-[#BF4928]">
                      {lesson.word}
                    </span>
                    <span className="font-mono-tabular text-xs text-[#5B6155]">
                      ({lesson.transliteration})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFullScript}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BF4928] hover:underline whitespace-nowrap shrink-0"
                  >
                    {copiedFullScript ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Full Script</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={10}
                  value={fullVideoScript}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Generated full video script"
                  className="w-full rounded-lg border border-[#D4DEC9] bg-white px-3 py-2.5 font-sans text-xs leading-relaxed text-[#383C33] focus:border-[#184231] focus:outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onGenerateAudio}
                    disabled={isGeneratingAudio}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#184231] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#133527] disabled:opacity-60 whitespace-nowrap"
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        <span>Generate Voiceover</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange("audio")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8DCD0] bg-white px-3 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload MP3</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTabChange("script")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8DCD0] bg-white px-3 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] whitespace-nowrap"
                  >
                    <span>Edit Fields</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5 pt-2 border-t border-[#ECEFE5]">
              <span className="text-xs font-semibold text-[#454940]">
                Try Another Georgian Homonym
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_QUICK_TOPICS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isGeneratingLesson}
                    onClick={() => onGenerateLesson(suggestion)}
                    className="rounded-lg border border-[#DDE1D4] bg-[#FAFBF7] px-3 py-2 text-left text-xs font-medium text-[#1C1C1A] transition-colors hover:border-[#184231] hover:bg-[#F2F5EA] disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "audio" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#1C1C1A]">
                Upload Your Own MP3 Audio
              </h2>
              <p className="mt-1 text-sm text-[#5B6155]">
                Attach an MP3 file to{" "}
                <span className="font-georgian font-bold text-[#BF4928]">
                  {lesson.word}
                </span>{" "}
                as the main reel track or as looping background music under the host voiceover.
              </p>
            </div>

            {/* Mode Selector for Next Upload */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#454940]">
                How should the uploaded MP3 play?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadMode("main")}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    uploadMode === "main"
                      ? "border-[#184231] bg-[#F2F5EA]"
                      : "border-[#DDE1D4] bg-white hover:bg-[#FAFBF7]"
                  }`}
                >
                  <div className="text-xs font-bold text-[#1C1C1A]">
                    Main Reel Audio
                  </div>
                  <div className="mt-0.5 text-xs text-[#5B6155]">
                    Replaces voiceover and syncs reel length to your MP3
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMode("background")}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    uploadMode === "background"
                      ? "border-[#184231] bg-[#F2F5EA]"
                      : "border-[#DDE1D4] bg-white hover:bg-[#FAFBF7]"
                  }`}
                >
                  <div className="text-xs font-bold text-[#1C1C1A]">
                    Background Music Bed
                  </div>
                  <div className="mt-0.5 text-xs text-[#5B6155]">
                    Loops quietly underneath the AI podcast dialogue
                  </div>
                </button>
              </div>
            </div>

            {/* File Dropzone / Picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.aac,audio/*"
              className="hidden"
              onChange={(e) => handleFilePicked(e.target.files?.[0])}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                handleFilePicked(e.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors cursor-pointer ${
                isDraggingFile
                  ? "border-[#BF4928] bg-[#FBEAE4]/40"
                  : "border-[#D4D9C9] bg-[#FAFBF7] hover:border-[#184231] hover:bg-[#F2F5EA]/60"
              }`}
            >
              {isUploadingAudio ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-[#184231]" />
                  <span className="mt-2.5 text-xs font-semibold text-[#184231]">
                    Decoding audio file...
                  </span>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-[#184231]" />
                  <span className="mt-2.5 text-sm font-semibold text-[#1C1C1A]">
                    Drop an MP3 here or click to browse
                  </span>
                  <span className="mt-1 text-xs text-[#5B6155]">
                    Supports MP3, WAV, M4A, OGG · Stays locally in your browser
                  </span>
                </>
              )}
            </div>

            {uploadAudioError && (
              <div className="rounded-lg border border-[#F3C5C5] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B42318]">
                {uploadAudioError}
              </div>
            )}

            {/* Active Audio Tracks for This Lesson */}
            <div className="space-y-3 pt-2 border-t border-[#ECEFE5]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#454940]">
                  Audio Attached to &ldquo;{lesson.word}&rdquo;
                </span>
                {canRestoreSampleBari && (
                  <button
                    type="button"
                    onClick={onRestoreSampleBari}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#BF4928] hover:underline whitespace-nowrap"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore Sample MP3</span>
                  </button>
                )}
              </div>

              {!mainAudioInfo && !bgAudioInfo && (
                <div className="rounded-xl border border-[#E5E8DC] bg-[#FAFBF7] p-4 text-xs text-[#5B6155]">
                  No MP3 or voiceover attached to this lesson yet. Upload an MP3 above or click{" "}
                  <span className="font-semibold text-[#1C1C1A]">Generate Audio</span> under the preview stage.
                </div>
              )}

              {mainAudioInfo && (
                <div className="rounded-xl border border-[#DCE0D2] bg-[#FAFBF7] p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Music className="h-4 w-4 shrink-0 text-[#BF4928]" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1C1C1A] truncate">
                          {mainAudioInfo.fileName}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#5B6155]">
                          Main Reel Audio · {mainAudioInfo.duration.toFixed(1)}s
                          {mainAudioInfo.isSample ? " · Beat-synced" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleAudition("main")}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#BF4928] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#A43B1E] whitespace-nowrap"
                      >
                        {auditionTarget === "main" ? (
                          <>
                            <Pause className="h-3 w-3" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-current" />
                            <span>Preview</span>
                          </>
                        )}
                      </button>

                      {!mainAudioInfo.isSample && (
                        <button
                          type="button"
                          onClick={() => onSwitchAudioMode("main")}
                          title="Move to Background Music"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D8DCD0] bg-white px-2.5 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] whitespace-nowrap"
                        >
                          <ArrowLeftRight className="h-3 w-3" />
                          <span>Use as BG</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRemoveAudio("main")}
                        aria-label="Remove main audio"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8DCD0] bg-white text-[#5B6155] transition-colors hover:bg-[#FEE4E2] hover:text-[#B42318]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {bgAudioInfo && (
                <div className="rounded-xl border border-[#DCE0D2] bg-[#FAFBF7] p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Music className="h-4 w-4 shrink-0 text-[#184231]" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1C1C1A] truncate">
                          {bgAudioInfo.fileName}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#5B6155]">
                          Background Music Bed · {bgAudioInfo.duration.toFixed(1)}s (loops)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleAudition("background")}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#184231] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#133527] whitespace-nowrap"
                      >
                        {auditionTarget === "background" ? (
                          <>
                            <Pause className="h-3 w-3" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-current" />
                            <span>Preview</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onSwitchAudioMode("background")}
                        title="Move to Main Reel Audio"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D8DCD0] bg-white px-2.5 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] whitespace-nowrap"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        <span>Make Main</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveAudio("background")}
                        aria-label="Remove background music"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8DCD0] bg-white text-[#5B6155] transition-colors hover:bg-[#FEE4E2] hover:text-[#B42318]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-[#E5E8DC] pt-2.5">
                    <label
                      htmlFor="bg-music-vol"
                      className="text-xs font-medium text-[#5B6155] whitespace-nowrap"
                    >
                      Music Volume: {Math.round(settings.musicVolume * 100)}%
                    </label>
                    <input
                      id="bg-music-vol"
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.02}
                      value={settings.musicVolume}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          musicVolume: parseFloat(e.target.value),
                        })
                      }
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#E1E5D6] accent-[#184231]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
