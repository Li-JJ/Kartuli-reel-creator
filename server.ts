import "dotenv/config";
import express from "express";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { GoogleGenAI, Type } from "@google/genai";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Generate a custom Georgian wordplay reel script using Gemini 4 Hydrogen
  app.post("/api/generate-lesson", async (req, res) => {
    try {
      const topicOrWord = String(req.body?.topicOrWord || "").trim();
      const existingWords = Array.isArray(req.body?.existingWords)
        ? req.body.existingWords
            .map((w: unknown) => String(w || "").trim())
            .filter(Boolean)
            .slice(0, 40)
        : [];

      if (!topicOrWord) {
        return res.status(400).json({ error: "Please enter a Georgian word or wordplay topic." });
      }
      if (topicOrWord.length > 200) {
        return res.status(400).json({ error: "Topic or word must be 200 characters or fewer." });
      }

      const avoidClause =
        existingWords.length > 0
          ? `\nAvoid reusing any of these already-created Georgian words unless the user explicitly requested that exact word: ${existingWords.join(", ")}.`
          : "";

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Create an accurate, witty, bite-sized 20-second Georgian language educational reel script inspired by short-form deadpan dual-host wordplay videos.
User prompt / Georgian word: "${topicOrWord}"${avoidClause}

Requirements:
1. Pick a real Georgian word (Mkhedruli script) that has 3 genuinely distinct meanings, homonyms, or contextual senses where the verb or surrounding word gives the clue (or if the user gave a specific Georgian word, use that word and its real 3 meanings/uses).
2. Keep every line punchy, conversational, and grammatically accurate in Georgian (ქართული ენა).
3. "clueVerb" MUST appear verbatim inside "georgianSentence".
4. "dialogue" must have exactly 6 short turns (sceneIndex 0 through 5 in order), alternating between "hostA" and "hostB". Total spoken dialogue across all 6 turns should be around 95-125 words so it fits cleanly in a ~20 second reel. Keep spoken text in plain ASCII/English with intuitive phonetic spellings for Georgian phrases so TTS pronounces them smoothly!
5. For each meaning's "icon", choose the closest match from: valley, shovel, cocktail, eye, wheel, gem, door, goal, book, calendar, back, cake, hand, cards, wild, clue.`,
        config: {
          systemInstruction:
            "You are a Georgian linguist and short-form educational comedy writer. Be 100% accurate with Georgian Mkhedruli spelling, transliteration, and grammar.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "Georgian Mkhedruli word, e.g. ბარი" },
              transliteration: { type: Type.STRING, description: "Syllable transliteration, e.g. ba-ri" },
              hookEnglish: {
                type: Type.STRING,
                description: "Two-line rhythmic English hook with \\n, e.g. A valley? A shovel?\\nA cocktail bar, too.",
              },
              clueSetupLine: {
                type: Type.STRING,
                description: "Short clue setup sentence explaining how the verb gives the meaning away.",
              },
              recapLine: { type: Type.STRING, description: "Short 3-5 word punchy recap line." },
              captionText: {
                type: Type.STRING,
                description: "Instagram Reel caption with 2-3 relevant hashtags.",
              },
              meanings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    meaningLabel: { type: Type.STRING },
                    icon: { type: Type.STRING },
                    georgianSentence: { type: Type.STRING },
                    transliteration: { type: Type.STRING },
                    clueVerb: { type: Type.STRING },
                    clueVerbMeaning: { type: Type.STRING },
                    englishTranslation: { type: Type.STRING },
                  },
                  required: [
                    "meaningLabel",
                    "icon",
                    "georgianSentence",
                    "transliteration",
                    "clueVerb",
                    "clueVerbMeaning",
                    "englishTranslation",
                  ],
                },
              },
              dialogue: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    speaker: { type: Type.STRING, description: "Either hostA or hostB" },
                    sceneIndex: { type: Type.INTEGER, description: "0 to 5" },
                    text: { type: Type.STRING },
                  },
                  required: ["speaker", "sceneIndex", "text"],
                },
              },
            },
            required: [
              "word",
              "transliteration",
              "hookEnglish",
              "clueSetupLine",
              "recapLine",
              "captionText",
              "meanings",
              "dialogue",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);

      const allowedIcons = new Set([
        "valley",
        "shovel",
        "cocktail",
        "eye",
        "wheel",
        "gem",
        "door",
        "goal",
        "book",
        "calendar",
        "back",
        "cake",
        "hand",
        "cards",
        "wild",
        "clue",
      ]);

      const meanings = (parsed.meanings || []).slice(0, 3).map((m: Record<string, string>, idx: number) => ({
        id: `ai-m-${Date.now()}-${idx}`,
        meaningLabel: m.meaningLabel || `Meaning ${idx + 1}`,
        icon: allowedIcons.has(m.icon) ? m.icon : "clue",
        georgianSentence: m.georgianSentence || parsed.word,
        transliteration: m.transliteration || "",
        clueVerb: m.clueVerb || "",
        clueVerbMeaning: m.clueVerbMeaning || "",
        englishTranslation: m.englishTranslation || "",
      }));

      while (meanings.length < 3) {
        meanings.push({
          id: `ai-m-pad-${meanings.length}`,
          meaningLabel: "Context Meaning",
          icon: "clue",
          georgianSentence: parsed.word || topicOrWord,
          transliteration: parsed.transliteration || "",
          clueVerb: "",
          clueVerbMeaning: "",
          englishTranslation: "",
        });
      }

      const dialogue = (parsed.dialogue || []).slice(0, 6).map((d: Record<string, unknown>, idx: number) => ({
        id: `ai-d-${Date.now()}-${idx}`,
        speaker: d.speaker === "hostB" ? "hostB" : "hostA",
        sceneIndex: typeof d.sceneIndex === "number" ? Math.max(0, Math.min(5, d.sceneIndex)) : idx,
        text: String(d.text || ""),
      }));

      const lesson = {
        id: `custom-${Date.now()}`,
        word: parsed.word || topicOrWord,
        transliteration: parsed.transliteration || "",
        seriesTitle: "GEORGIAN IS EASY",
        hookEnglish: parsed.hookEnglish || "One word.\nThree meanings.",
        clueSetupLine: parsed.clueSetupLine || "The verb gives you a clue.",
        recapLine: parsed.recapLine || "Same sound. Three worlds.",
        captionText: parsed.captionText || `Learn Georgian: ${parsed.word} #LearnGeorgian`,
        meanings,
        dialogue,
      };

      return res.json({ lesson });
    } catch (err: unknown) {
      console.error("Error generating Georgian lesson:", err);
      const message = err instanceof Error ? err.message : "Failed to generate Georgian lesson.";
      return res.status(500).json({ error: message });
    }
  });

  // Synthesize dual-speaker podcast audio using Gemini 3.8 Flash TTS
  app.post("/api/tts", async (req, res) => {
    try {
      const dialogue = req.body?.dialogue as Array<{ speaker: string; text: string }> | undefined;
      const hostNames = req.body?.hostNames as { hostA: string; hostB: string } | undefined;

      if (!Array.isArray(dialogue) || dialogue.length === 0) {
        return res.status(400).json({ error: "Dialogue lines are required to synthesize audio." });
      }

      const speakerA = hostNames?.hostA || "Khinkali";
      const speakerB = hostNames?.hostB || "Qvevri";

      const parts = dialogue
        .filter((line) => line.text && line.text.trim().length > 0)
        .map((line) => {
          const isA = line.speaker === "hostA";
          const speakerLabel = isA ? speakerA : speakerB;
          return {
            text: `${speakerLabel}: ${line.text.trim()}`,
            speechMetadata: {
              speaker: speakerLabel,
              style: isA
                ? "Deadpan, witty, calm language podcast host with crisp pacing"
                : "Dry-humored, expressive co-host with conversational timing",
            },
          };
        });

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-tts",
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: speakerA,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Puck" },
                  },
                },
                {
                  speaker: speakerB,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Kore" },
                  },
                },
              ],
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData?.data
      );
      const base64Audio = audioPart?.inlineData?.data;

      if (!base64Audio) {
        return res.status(502).json({ error: "No audio data returned by the speech synthesizer." });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: audioPart?.inlineData?.mimeType || "audio/wav",
      });
    } catch (err: unknown) {
      console.error("Error generating TTS audio:", err);
      const message = err instanceof Error ? err.message : "Failed to synthesize podcast voiceover.";
      return res.status(500).json({ error: message });
    }
  });

  // Transcode recorded WebM stream into Instagram-compatible H.264 + AAC MP4
  app.post(
    "/api/convert-mp4",
    express.raw({ type: ["video/webm", "application/octet-stream"], limit: "150mb" }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Empty or invalid WebM video payload." });
      }

      const id = randomUUID();
      const inputPath = path.join(os.tmpdir(), `reel-${id}.webm`);
      const outputPath = path.join(os.tmpdir(), `reel-${id}.mp4`);

      try {
        await fs.writeFile(inputPath, req.body);

        await execFileAsync(
          "ffmpeg",
          [
            "-y",
            "-i",
            inputPath,
            "-map",
            "0:v:0",
            "-map",
            "0:a?",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            outputPath,
          ],
          { maxBuffer: 10 * 1024 * 1024 }
        );

        const mp4Buffer = await fs.readFile(outputPath);
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", 'attachment; filename="georgian-is-easy.mp4"');
        return res.send(mp4Buffer);
      } catch (err: unknown) {
        console.error("Error converting WebM to MP4:", err);
        const message = err instanceof Error ? err.message : "Failed to convert video to MP4.";
        return res.status(500).json({ error: message });
      } finally {
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
      }
    }
  );

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
