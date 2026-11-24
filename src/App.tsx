import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2 } from "lucide-react";
import {
  ControlDeck,
  type AudioTrackSummary,
  type StudioTab,
} from "./components/ControlDeck";
import { ReelStage } from "./components/ReelStage";
import { PRESET_LESSONS, REEL_THEMES } from "./data/lessons";
import { UPLOADED_BARI_SONG_URL } from "./data/syncedSongTrack";
import { buildTimeline } from "./lib/timeline";
import {
  exportCoverPng,
  exportReelMp4,
  exportReelWebm,
  triggerDownload,
} from "./lib/videoExporter";
import type {
  GeorgianLesson,
  ReelSettings,
  UploadedAudioMode,
} from "./types/reel";

const CUSTOM_LESSONS_STORAGE_KEY = "kartuli-reel-custom-lessons-v1";

interface MainAudioEntry {
  url: string;
  fileName: string;
  base64: string;
  mimeType: string;
  buffer: AudioBuffer;
  isSyncedSongTrack?: boolean;
  isUploaded?: boolean;
}

interface BgAudioEntry {
  url: string;
  fileName: string;
  mimeType: string;
  buffer: AudioBuffer;
}

function loadStoredCustomLessons(): GeorgianLesson[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LESSONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GeorgianLesson =>
        Boolean(
          item &&
            typeof item.id === "string" &&
            typeof item.word === "string" &&
            Array.isArray(item.meanings) &&
            item.meanings.length === 3 &&
            Array.isArray(item.dialogue)
        )
    );
  } catch {
    return [];
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

export default function App() {
  const [customLessons, setCustomLessons] = useState<GeorgianLesson[]>(() =>
    loadStoredCustomLessons()
  );
  const [lesson, setLesson] = useState<GeorgianLesson>(PRESET_LESSONS[0]);
  const [activeTab, setActiveTab] = useState<StudioTab>("lessons");
  const [settings, setSettings] = useState<ReelSettings>({
    themeId: "sage-terracotta",
    hostPair: "khinkali-qvevri",
    showPhonetics: true,
    showSubtitles: true,
    showVerbBadge: true,
    musicVolume: 0.22,
  });

  // Main audio & background music tracks per lesson
  const [audioByLesson, setAudioByLesson] = useState<Record<string, MainAudioEntry>>({});
  const [bgMusicByLesson, setBgMusicByLesson] = useState<Record<string, BgAudioEntry>>({});
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadAudioError, setUploadAudioError] = useState<string | null>(null);
  const [auditionTarget, setAuditionTarget] = useState<UploadedAudioMode | null>(null);

  // AI Lesson generation state
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lastGeneratedLessonId, setLastGeneratedLessonId] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(1.1);
  const [isMuted, setIsMuted] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    progress: number;
    status: string;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const activeAudio = audioByLesson[lesson.id] ?? null;
  const activeBgMusic = bgMusicByLesson[lesson.id] ?? null;
  const isSyncedSongTrack = Boolean(activeAudio?.isSyncedSongTrack && lesson.id === "bari");
  const theme = REEL_THEMES[settings.themeId];
  const timeline = useMemo(
    () => buildTimeline(lesson, activeAudio?.buffer.duration, isSyncedSongTrack),
    [lesson, activeAudio, isSyncedSongTrack]
  );

  // Persist custom AI-generated lessons in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_LESSONS_STORAGE_KEY, JSON.stringify(customLessons));
    } catch {
      // Ignore storage quota issues
    }
  }, [customLessons]);

  const loadSampleBariAudio = useCallback(async (forceOverwrite: boolean) => {
    const res = await fetch(UPLOADED_BARI_SONG_URL);
    if (!res.ok) throw new Error("Could not load sample MP3");
    const arrBuf = await res.arrayBuffer();
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(arrBuf);
    await ctx.close();

    setAudioByLesson((prev) => {
      if (!forceOverwrite && prev.bari) return prev;
      if (prev.bari?.url.startsWith("blob:")) {
        URL.revokeObjectURL(prev.bari.url);
      }
      return {
        ...prev,
        bari: {
          url: UPLOADED_BARI_SONG_URL,
          fileName: "Georgian_Verb_Bar.mp3",
          base64: "",
          mimeType: "audio/mpeg",
          buffer: decoded,
          isSyncedSongTrack: true,
          isUploaded: false,
        },
      };
    });
  }, []);

  // Load the bundled Georgian_Verb_Bar MP3 on initial load for the starter Bari reel
  useEffect(() => {
    let cancelled = false;
    loadSampleBariAudio(false).catch(() => {
      if (!cancelled) {
        // Sample track is optional if missing
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadSampleBariAudio]);

  // Sync main reel HTMLAudioElement source when lesson or activeAudio changes
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    audioEl.pause();
    if (activeAudio) {
      audioEl.src = activeAudio.url;
      audioEl.currentTime = Math.min(currentTime, activeAudio.buffer.duration);
    } else {
      audioEl.removeAttribute("src");
      audioEl.load();
    }
  }, [activeAudio?.url]);

  // Sync background music HTMLAudioElement source
  useEffect(() => {
    const bgEl = bgMusicRef.current;
    if (!bgEl) return;
    bgEl.pause();
    if (activeBgMusic) {
      bgEl.src = activeBgMusic.url;
      bgEl.loop = true;
    } else {
      bgEl.removeAttribute("src");
      bgEl.load();
    }
  }, [activeBgMusic?.url]);

  // Stop audition preview when switching lessons
  useEffect(() => {
    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
    }
    setAuditionTarget(null);
  }, [lesson.id]);

  // Sync mute & background volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted;
      bgMusicRef.current.volume = Math.max(0, Math.min(1, settings.musicVolume));
    }
  }, [isMuted, settings.musicVolume]);

  // Sync background music playback with reel preview
  useEffect(() => {
    const bgEl = bgMusicRef.current;
    if (!bgEl || !activeBgMusic) {
      bgEl?.pause();
      return;
    }
    bgEl.volume = Math.max(0, Math.min(1, settings.musicVolume));
    if (isPlaying) {
      bgEl.currentTime = currentTime % Math.max(1, activeBgMusic.buffer.duration);
      bgEl.play().catch(() => {});
    } else {
      bgEl.pause();
    }
  }, [isPlaying, activeBgMusic?.url]);

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastFrameTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (activeAudio && audioRef.current && !audioRef.current.paused) {
        const t = audioRef.current.currentTime;
        if (t >= timeline.totalDuration) {
          setCurrentTime(0);
          setIsPlaying(false);
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          return;
        }
        setCurrentTime(t);
      } else {
        if (lastFrameTimeRef.current !== null) {
          const dt = (now - lastFrameTimeRef.current) / 1000;
          setCurrentTime((prev) => {
            const next = prev + dt;
            if (next >= timeline.totalDuration) {
              setIsPlaying(false);
              return 0;
            }
            return next;
          });
        }
        lastFrameTimeRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, activeAudio, timeline.totalDuration]);

  const stopAudition = useCallback(() => {
    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
    }
    setAuditionTarget(null);
  }, []);

  const handleTogglePlay = useCallback(() => {
    stopAudition();
    setIsPlaying((prev) => {
      const next = !prev;
      if (activeAudio && audioRef.current) {
        if (next) {
          if (currentTime >= timeline.totalDuration - 0.1) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
          } else {
            audioRef.current.currentTime = currentTime;
          }
          audioRef.current.play().catch(() => {});
        } else {
          audioRef.current.pause();
        }
      } else if (next && currentTime >= timeline.totalDuration - 0.1) {
        setCurrentTime(0);
      }
      return next;
    });
  }, [activeAudio, currentTime, stopAudition, timeline.totalDuration]);

  const handleRestart = useCallback(() => {
    stopAudition();
    setCurrentTime(0);
    if (activeAudio && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    if (activeBgMusic && bgMusicRef.current) {
      bgMusicRef.current.currentTime = 0;
      bgMusicRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
  }, [activeAudio, activeBgMusic, stopAudition]);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, timeline.totalDuration));
      setCurrentTime(clamped);
      if (activeAudio && audioRef.current) {
        audioRef.current.currentTime = clamped;
      }
      if (activeBgMusic && bgMusicRef.current) {
        bgMusicRef.current.currentTime =
          clamped % Math.max(1, activeBgMusic.buffer.duration);
      }
    },
    [activeAudio, activeBgMusic, timeline.totalDuration]
  );

  const handleSelectLesson = (nextLesson: GeorgianLesson) => {
    setIsPlaying(false);
    stopAudition();
    if (audioRef.current) audioRef.current.pause();
    setLesson(nextLesson);
    setCurrentTime(1.1);
    setAudioError(null);
    setUploadAudioError(null);
  };

  const handleDeleteCustomLesson = (lessonId: string) => {
    setCustomLessons((prev) => prev.filter((l) => l.id !== lessonId));
    setAudioByLesson((prev) => {
      const entry = prev[lessonId];
      if (entry?.url.startsWith("blob:")) URL.revokeObjectURL(entry.url);
      const next = { ...prev };
      delete next[lessonId];
      return next;
    });
    setBgMusicByLesson((prev) => {
      const entry = prev[lessonId];
      if (entry?.url.startsWith("blob:")) URL.revokeObjectURL(entry.url);
      const next = { ...prev };
      delete next[lessonId];
      return next;
    });
    if (lesson.id === lessonId) {
      setIsPlaying(false);
      stopAudition();
      setLesson(PRESET_LESSONS[0]);
      setCurrentTime(1.1);
    }
  };

  const handleUpdateLesson = (updated: GeorgianLesson) => {
    setLesson(updated);
    setCustomLessons((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);
    setIsPlaying(false);
    stopAudition();
    if (audioRef.current) audioRef.current.pause();

    try {
      const hostNames =
        settings.hostPair === "khinkali-qvevri"
          ? { hostA: "Khinkali", hostB: "Qvevri" }
          : { hostA: "Sheep", hostB: "Tower" };

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dialogue: lesson.dialogue,
          hostNames,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Voiceover synthesis failed.");
      }

      const blob = base64ToBlob(data.audioBase64, data.mimeType || "audio/wav");
      const url = URL.createObjectURL(blob);
      const arrayBuf = await blob.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      await ctx.close();

      setAudioByLesson((prev) => {
        if (prev[lesson.id]?.url.startsWith("blob:")) {
          URL.revokeObjectURL(prev[lesson.id].url);
        }
        return {
          ...prev,
          [lesson.id]: {
            url,
            fileName: `georgian-is-easy-${lesson.id}.wav`,
            base64: data.audioBase64,
            mimeType: data.mimeType || "audio/wav",
            buffer: decoded,
            isSyncedSongTrack: false,
            isUploaded: false,
          },
        };
      });

      setCurrentTime(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
      }, 60);
    } catch (err: unknown) {
      setAudioError(
        err instanceof Error ? err.message : "Could not generate voiceover."
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDownloadAudio = () => {
    if (!activeAudio) return;
    if (activeAudio.base64) {
      const blob = base64ToBlob(activeAudio.base64, activeAudio.mimeType);
      triggerDownload(blob, activeAudio.fileName || `georgian-is-easy-${lesson.id}.wav`);
      return;
    }
    const a = document.createElement("a");
    a.href = activeAudio.url;
    a.download = activeAudio.fileName || `${lesson.id}-audio.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleUploadAudio = async (file: File, mode: UploadedAudioMode) => {
    setUploadAudioError(null);
    if (file.size > 50 * 1024 * 1024) {
      setUploadAudioError("Audio file must be 50 MB or smaller.");
      return;
    }

    setIsUploadingAudio(true);
    setIsPlaying(false);
    stopAudition();
    if (audioRef.current) audioRef.current.pause();

    let objectUrl = "";
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new AudioContext();
      let decoded: AudioBuffer;
      try {
        decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      } finally {
        await ctx.close().catch(() => {});
      }

      objectUrl = URL.createObjectURL(file);
      const mimeType = file.type || "audio/mpeg";

      if (mode === "main") {
        setAudioByLesson((prev) => {
          if (prev[lesson.id]?.url.startsWith("blob:")) {
            URL.revokeObjectURL(prev[lesson.id].url);
          }
          return {
            ...prev,
            [lesson.id]: {
              url: objectUrl,
              fileName: file.name,
              base64: "",
              mimeType,
              buffer: decoded,
              isSyncedSongTrack: false,
              isUploaded: true,
            },
          };
        });
        setCurrentTime(0);
      } else {
        setBgMusicByLesson((prev) => {
          if (prev[lesson.id]?.url.startsWith("blob:")) {
            URL.revokeObjectURL(prev[lesson.id].url);
          }
          return {
            ...prev,
            [lesson.id]: {
              url: objectUrl,
              fileName: file.name,
              mimeType,
              buffer: decoded,
            },
          };
        });
      }
    } catch {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploadAudioError(
        "Could not decode this audio file. Try a standard MP3, WAV, or M4A track."
      );
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleToggleAudition = (mode: UploadedAudioMode) => {
    const el = auditionAudioRef.current;
    if (!el) return;
    const targetEntry = mode === "main" ? activeAudio : activeBgMusic;
    if (!targetEntry) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }

    if (auditionTarget === mode && !el.paused) {
      el.pause();
      setAuditionTarget(null);
      return;
    }

    el.src = targetEntry.url;
    el.currentTime = 0;
    el.play().catch(() => {});
    setAuditionTarget(mode);
  };

  const handleSwitchAudioMode = (fromMode: UploadedAudioMode) => {
    stopAudition();
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();

    if (fromMode === "main") {
      const currentMain = audioByLesson[lesson.id];
      if (!currentMain || currentMain.isSyncedSongTrack) return;

      const prevBg = bgMusicByLesson[lesson.id];
      setBgMusicByLesson((prev) => ({
        ...prev,
        [lesson.id]: {
          url: currentMain.url,
          fileName: currentMain.fileName,
          mimeType: currentMain.mimeType,
          buffer: currentMain.buffer,
        },
      }));

      setAudioByLesson((prev) => {
        const next = { ...prev };
        if (prevBg) {
          next[lesson.id] = {
            url: prevBg.url,
            fileName: prevBg.fileName,
            base64: "",
            mimeType: prevBg.mimeType,
            buffer: prevBg.buffer,
            isSyncedSongTrack: false,
            isUploaded: true,
          };
        } else {
          delete next[lesson.id];
        }
        return next;
      });
    } else {
      const currentBg = bgMusicByLesson[lesson.id];
      if (!currentBg) return;

      const prevMain = audioByLesson[lesson.id];
      setAudioByLesson((prev) => ({
        ...prev,
        [lesson.id]: {
          url: currentBg.url,
          fileName: currentBg.fileName,
          base64: "",
          mimeType: currentBg.mimeType,
          buffer: currentBg.buffer,
          isSyncedSongTrack: false,
          isUploaded: true,
        },
      }));

      setBgMusicByLesson((prev) => {
        const next = { ...prev };
        if (prevMain && !prevMain.isSyncedSongTrack) {
          next[lesson.id] = {
            url: prevMain.url,
            fileName: prevMain.fileName,
            mimeType: prevMain.mimeType,
            buffer: prevMain.buffer,
          };
        } else {
          delete next[lesson.id];
        }
        return next;
      });
    }
    setCurrentTime(0);
  };

  const handleRemoveAudio = (mode: UploadedAudioMode) => {
    stopAudition();
    setIsPlaying(false);
    if (mode === "main") {
      if (audioRef.current) audioRef.current.pause();
      setAudioByLesson((prev) => {
        const entry = prev[lesson.id];
        if (entry?.url.startsWith("blob:")) URL.revokeObjectURL(entry.url);
        const next = { ...prev };
        delete next[lesson.id];
        return next;
      });
      setCurrentTime(0);
    } else {
      if (bgMusicRef.current) bgMusicRef.current.pause();
      setBgMusicByLesson((prev) => {
        const entry = prev[lesson.id];
        if (entry?.url.startsWith("blob:")) URL.revokeObjectURL(entry.url);
        const next = { ...prev };
        delete next[lesson.id];
        return next;
      });
    }
  };

  const handleRestoreSampleBari = async () => {
    stopAudition();
    setUploadAudioError(null);
    try {
      await loadSampleBariAudio(true);
      setCurrentTime(0);
    } catch {
      setUploadAudioError("Could not load the sample Georgian_Verb_Bar.mp3.");
    }
  };

  const handleGenerateLesson = async (topicOrWord: string) => {
    setIsGeneratingLesson(true);
    setLessonError(null);
    setIsPlaying(false);
    stopAudition();
    if (audioRef.current) audioRef.current.pause();

    try {
      const existingWords = [...customLessons, ...PRESET_LESSONS].map((l) => l.word);
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicOrWord, existingWords }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate Georgian lesson.");
      }

      const generated = data.lesson as GeorgianLesson;
      setCustomLessons((prev) => [generated, ...prev]);
      setLesson(generated);
      setLastGeneratedLessonId(generated.id);
      setCurrentTime(1.1);
    } catch (err: unknown) {
      setLessonError(
        err instanceof Error ? err.message : "Could not generate script."
      );
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const runVideoExport = async (format: "mp4" | "webm") => {
    if (isExporting) return;
    setIsPlaying(false);
    stopAudition();
    if (audioRef.current) audioRef.current.pause();
    setIsExporting(true);
    setExportError(null);
    setExportProgress({
      progress: 0,
      status:
        format === "mp4"
          ? "Preparing 1080×1920 MP4 render..."
          : "Preparing 1080×1920 WebM render...",
    });
    setActiveTab("style");

    try {
      const exporter = format === "mp4" ? exportReelMp4 : exportReelWebm;
      await exporter(
        lesson,
        settings,
        theme,
        activeAudio?.buffer ?? null,
        (p) => setExportProgress(p),
        activeBgMusic?.buffer ?? null,
        settings.musicVolume,
        isSyncedSongTrack
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Video export failed.";
      setExportError(msg);
      setAudioError(msg);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(null), 2500);
    }
  };

  const handleExportVideo = () => runVideoExport("mp4");
  const handleExportWebm = () => runVideoExport("webm");

  const handleExportCover = async () => {
    try {
      setExportError(null);
      await exportCoverPng(lesson, settings, theme);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cover export failed.";
      setExportError(msg);
      setAudioError(msg);
    }
  };

  const mainAudioInfo: AudioTrackSummary | null = activeAudio
    ? {
        fileName: activeAudio.fileName,
        duration: activeAudio.buffer.duration,
        isSample: Boolean(activeAudio.isSyncedSongTrack),
      }
    : null;

  const bgAudioInfo: AudioTrackSummary | null = activeBgMusic
    ? {
        fileName: activeBgMusic.fileName,
        duration: activeBgMusic.buffer.duration,
      }
    : null;

  const audioDownloadLabel =
    activeAudio?.mimeType.includes("mpeg") || activeAudio?.fileName.endsWith(".mp3")
      ? "MP3"
      : "WAV";

  return (
    <div className="min-h-screen bg-[#F6F7F1] text-[#1C1C1A]">
      <audio ref={audioRef} className="hidden" />
      <audio ref={bgMusicRef} className="hidden" />
      <audio
        ref={auditionAudioRef}
        className="hidden"
        onEnded={() => setAuditionTarget(null)}
      />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-[#E1E5D6] bg-white">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("lessons");
            }}
            className="font-display text-lg font-extrabold tracking-tight text-[#184231] whitespace-nowrap shrink-0"
          >
            Kartuli Reel Studio
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5B6155]">
            <button
              type="button"
              onClick={() => setActiveTab("lessons")}
              className={`hover:text-[#184231] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "lessons" ? "text-[#184231] underline underline-offset-4" : ""
              }`}
            >
              Lessons
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("script")}
              className={`hover:text-[#184231] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "script" ? "text-[#184231] underline underline-offset-4" : ""
              }`}
            >
              Script Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={`hover:text-[#184231] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "style" ? "text-[#184231] underline underline-offset-4" : ""
              }`}
            >
              Style & Cast
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`hover:text-[#184231] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "ai" ? "text-[#184231] underline underline-offset-4" : ""
              }`}
            >
              AI Writer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audio")}
              className={`hover:text-[#184231] transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "audio" ? "text-[#184231] underline underline-offset-4" : ""
              }`}
            >
              Upload MP3
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isExporting}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#184231] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#133527] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Film className="h-3.5 w-3.5" />
                  <span>Export Video</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Zone Educational Sandbox */}
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1C1A] text-balance">
              Georgian Is Easy — Wordplay Reel Builder
            </h1>
            <p className="mt-1 text-sm text-[#5B6155]">
              {lesson.word} ({lesson.transliteration}) · Deadpan dual-host micro-podcast format · 1080×1920 vertical export
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Zone: Interactive 9:16 Stage */}
          <section className="lg:col-span-5 flex justify-center">
            <ReelStage
              lesson={lesson}
              settings={settings}
              theme={theme}
              timeline={timeline}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isMuted={isMuted}
              hasAudio={Boolean(activeAudio)}
              isGeneratingAudio={isGeneratingAudio}
              audioError={audioError}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              onSeek={handleSeek}
              onToggleMute={() => setIsMuted((m) => !m)}
              onGenerateAudio={handleGenerateAudio}
              onDownloadAudio={handleDownloadAudio}
              audioDownloadLabel={audioDownloadLabel}
            />
          </section>

          {/* Right Zone: Control & Script Deck */}
          <section className="lg:col-span-7">
            <ControlDeck
              activeTab={activeTab}
              onTabChange={setActiveTab}
              lesson={lesson}
              customLessons={customLessons}
              onSelectLesson={handleSelectLesson}
              onDeleteCustomLesson={handleDeleteCustomLesson}
              onUpdateLesson={handleUpdateLesson}
              settings={settings}
              onUpdateSettings={setSettings}
              onGenerateLesson={handleGenerateLesson}
              isGeneratingLesson={isGeneratingLesson}
              lessonError={lessonError}
              lastGeneratedLessonId={lastGeneratedLessonId}
              onGenerateAudio={handleGenerateAudio}
              isGeneratingAudio={isGeneratingAudio}
              onExportVideo={handleExportVideo}
              onExportWebm={handleExportWebm}
              onExportCover={handleExportCover}
              isExporting={isExporting}
              exportProgress={exportProgress}
              exportError={exportError}
              mainAudioInfo={mainAudioInfo}
              bgAudioInfo={bgAudioInfo}
              isUploadingAudio={isUploadingAudio}
              uploadAudioError={uploadAudioError}
              auditionTarget={auditionTarget}
              onUploadAudio={handleUploadAudio}
              onToggleAudition={handleToggleAudition}
              onSwitchAudioMode={handleSwitchAudioMode}
              onRemoveAudio={handleRemoveAudio}
              onRestoreSampleBari={handleRestoreSampleBari}
              canRestoreSampleBari={
                lesson.id === "bari" && !activeAudio?.isSyncedSongTrack
              }
            />
          </section>
        </div>
      </main>
    </div>
  );
}
