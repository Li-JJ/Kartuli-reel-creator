import React, { useEffect, useRef } from "react";
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Loader2,
  Download,
} from "lucide-react";
import type { GeorgianLesson, ReelSettings, ReelTheme } from "../types/reel";
import { CANVAS_H, CANVAS_W, renderReelFrame } from "../lib/reelRenderer";
import { getPlaybackFrame, type TimelineState } from "../lib/timeline";

const SCENE_LABELS = ["Hook", "Clue", "01", "02", "03", "Recap"];

interface ReelStageProps {
  lesson: GeorgianLesson;
  settings: ReelSettings;
  theme: ReelTheme;
  timeline: TimelineState;
  currentTime: number;
  isPlaying: boolean;
  isMuted: boolean;
  hasAudio: boolean;
  isGeneratingAudio: boolean;
  audioError: string | null;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onGenerateAudio: () => void;
  onDownloadAudio: () => void;
  audioDownloadLabel?: string;
}

export const ReelStage: React.FC<ReelStageProps> = ({
  lesson,
  settings,
  theme,
  timeline,
  currentTime,
  isPlaying,
  isMuted,
  hasAudio,
  isGeneratingAudio,
  audioError,
  onTogglePlay,
  onRestart,
  onSeek,
  onToggleMute,
  onGenerateAudio,
  onDownloadAudio,
  audioDownloadLabel = "WAV",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = getPlaybackFrame(timeline, currentTime, isPlaying);

  useEffect(() => {
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderReelFrame(ctx, lesson, frame, settings, theme);
    };

    draw();
    document.fonts?.ready.then(() => {
      if (!cancelled) draw();
    });

    return () => {
      cancelled = true;
    };
  }, [lesson, frame, settings, theme]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* 9:16 Vertical Video Preview Frame */}
      <div className="relative rounded-2xl border border-[#D8DCD0] bg-white p-2.5 shadow-sm">
        <div
          className="relative overflow-hidden rounded-xl bg-[#F2F4E8] cursor-pointer select-none"
          style={{ width: "min(100%, 342px)", aspectRatio: "9 / 16" }}
          onClick={onTogglePlay}
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "Pause reel preview" : "Play reel preview"}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              onTogglePlay();
            }
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="h-full w-full block"
          />

          {/* Subtle center play overlay only when paused */}
          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/5 transition-opacity">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#184231]/90 text-white shadow-md">
                <Play className="h-6 w-6 translate-x-0.5 fill-current" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls & Scene Scrubber */}
      <div className="mt-4 w-full max-w-[420px] rounded-xl border border-[#DDE1D4] bg-white p-4">
        {/* Scene Jump Segmented Strip */}
        <div
          className={`grid gap-1 rounded-lg bg-[#F1F3E9] p-1 ${
            timeline.windows.length === 7 ? "grid-cols-7" : "grid-cols-6"
          }`}
        >
          {timeline.windows.map((win, idx) => {
            const isActive =
              currentTime >= win.startTime &&
              (idx === timeline.windows.length - 1
                ? currentTime <= win.endTime + 0.05
                : currentTime < win.endTime);
            const label = win.label || SCENE_LABELS[win.sceneIndex] || `${idx + 1}`;
            return (
              <button
                key={`${win.sceneIndex}-${idx}`}
                type="button"
                onClick={() => onSeek(win.startTime + 0.02)}
                title={label}
                className={`py-1.5 px-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap truncate ${
                  isActive
                    ? "bg-white text-[#184231] shadow-sm"
                    : "text-[#5B6155] hover:text-[#1C1C1A]"
                }`}
              >
                {label.replace(/^\d+\s+/, "")}
              </button>
            );
          })}
        </div>

        {/* Range Scrubber */}
        <div className="mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={timeline.totalDuration}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Reel timeline scrubber"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#E1E5D6] accent-[#BF4928]"
          />
          <span className="font-mono-tabular text-xs font-medium text-[#5B6155] whitespace-nowrap shrink-0">
            {currentTime.toFixed(1)}s / {timeline.totalDuration.toFixed(1)}s
          </span>
        </div>

        {/* Transport & AI Voiceover Actions */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#184231] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#133527] whitespace-nowrap shrink-0"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play Reel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRestart}
              aria-label="Restart reel"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDE1D4] bg-white text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {hasAudio && (
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? "Unmute voiceover" : "Mute voiceover"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDE1D4] bg-white text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF]"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-[#BF4928]" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[#184231]" />
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasAudio && (
              <button
                type="button"
                onClick={onDownloadAudio}
                title={`Download ${audioDownloadLabel} audio`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#DDE1D4] bg-white px-3 text-xs font-semibold text-[#1C1C1A] transition-colors hover:bg-[#F5F6EF] whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{audioDownloadLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGenerateAudio}
              disabled={isGeneratingAudio}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#BF4928] bg-[#FBEAE4] px-3.5 text-xs font-semibold text-[#9B351A] transition-colors hover:bg-[#F7DCD2] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  <span>{hasAudio ? "Regenerate Audio" : "Generate Audio"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {audioError && (
          <p className="mt-2.5 text-xs font-medium text-[#B42318]">{audioError}</p>
        )}
      </div>
    </div>
  );
};
