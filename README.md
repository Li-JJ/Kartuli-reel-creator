# Kartuli Reel Studio — Georgian Wordplay Reel Builder

Create 1080×1920 vertical Georgian language wordplay reels featuring deadpan animated hosts (**Khinkali & Qvevri** or **Highland Sheep & Svaneti Tower**), highlighted verb clues, dual-speaker AI voiceovers, custom MP3 uploads, and MP4 export.

## Features

- **Georgian Wordplay Library**: Comes with starter homonym lessons (`ბარი`, `თვალი`, `კარი`, `წელი`, `ხელი`) plus live script and meaning editing.
- **Unlimited AI Lesson Generation**: Generate new Georgian homonym lessons on demand in the **AI Writer** tab (automatically saved in your browser so you can build an ongoing series).
- **Dual-Host Voiceover & Custom MP3 Upload**: Synthesize podcast dialogue with Gemini TTS or upload your own `.mp3` / `.wav` / `.m4a` file either as the **Main Reel Audio** or as a looping **Background Music Bed**.
- **Instagram-Ready Export**: Export **1080×1920 MP4** (H.264 + AAC), **WebM**, or **Cover PNG**.

## Prerequisites

- **Node.js 20+**
- **FFmpeg** installed on your system (with `libx264` and `aac` encoders) for `.mp4` export
- A **Gemini API Key** (`GEMINI_API_KEY`) for generating new lessons and voiceovers

## Setup & Run Locally

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` and add your Gemini API key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## Generating More Reels

1. Open **AI Writer** (or click **Generate Lesson** from **Lessons**), enter any Georgian word or click **Surprise Me**, and generate a new script.
2. Customize any Georgian line, verb clue, or dialogue turn under **Script**.
3. Generate an AI voiceover with **Generate Audio** or attach your own MP3 under **Upload MP3**.
4. Click **Export Video** to download a ready-to-post `1080×1920` `.mp4` reel.
