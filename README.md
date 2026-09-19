# 🎵 Interactive CLI Music Player

A sleek, interactive, and feature-rich Terminal Music Player built with **Node.js** — featuring VLC-powered playback, ID3 tag metadata display, embedded lyrics, animated audio visualizer, volume control, multiple color themes, and a real-time progress seekbar with in-place ANSI rendering.

---

## ✨ Features

- 🎹 **Interactive Navigation**: Seamlessly navigate through songs using the **Up (↑)** and **Down (↓)** arrow keys.
- 🔄 **In-Place UI Redraw**: Uses ANSI escape sequences to refresh the terminal menu without scrolling or screen flicker.
- 🎶 **VLC-Powered Playback**: Spawns VLC in headless RC mode for reliable, cross-platform audio playback with IPC command support.
- ⏸ **True Pause & Resume**: Pause/resume playback cleanly via VLC's RC interface with accurate timestamp tracking.
- ⏩ **Fast-Forward & Rewind**: Seek ±10 seconds with the Left/Right arrow keys for precise navigation within a track.
- 🔊 **Volume Control & Mute**: Adjust volume with `+`/`-` keys and toggle mute with `M` — all reflected live in the HUD.
- 📊 **Dynamic Live Seekbar**: Real-time ASCII progress bar displaying current playback position, time elapsed, and total song duration.
- 🎛 **Animated Audio Visualizer**: Live equalizer-style waveform animation that reacts during playback and freezes when paused.
- 🏷 **ID3 Tag Reader**: Reads embedded metadata (Title, Artist, Album, Year, Genre) from MP3 files using the `music-metadata` package.
- 📝 **Lyrics Display**: Toggle embedded lyrics on/off with the `L` key — lyrics are read directly from the file's ID3 tags.
- 🎨 **Color Themes**: Cycle between **Cyberpunk 2077**, **Dark Modern**, and **The Matrix** palettes with the `T` key.
- ⏭ **Track Controls & Auto-Advance**: Skip to next/previous tracks manually or let the player automatically advance when a song finishes.
- 🧹 **Graceful Cleanup**: Safely shuts down VLC processes and clears timers upon exit (`Q` / `Ctrl+C`).
- 🏗 **Clean Object-Oriented Architecture**: Modular codebase structured into `SongManager`, `AudioEngine`, and `TerminalInterface`.

---

## 🎮 Keyboard Controls

| Key | Action |
| :--- | :--- |
| **`↑` (Up Arrow)** | Move selection to previous song |
| **`↓` (Down Arrow)** | Move selection to next song |
| **`Enter`** | Play highlighted song |
| **`P` / `p`** | Pause / Resume current playback |
| **`→` (Right Arrow)** | Fast-forward 10 seconds |
| **`←` (Left Arrow)** | Rewind 10 seconds |
| **`+` / `=`** | Increase volume (~6%) |
| **`-` / `_`** | Decrease volume (~6%) |
| **`M` / `m`** | Toggle mute |
| **`N` / `n`** | Skip to Next track |
| **`B` / `b`** | Skip to Previous track |
| **`T` / `t`** | Cycle color theme |
| **`L` / `l`** | Toggle lyrics display |
| **`Q` / `q`** or **`Ctrl + C`** | Quit application cleanly |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [VLC Media Player](https://www.videolan.org/) installed and available on your system `PATH`

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/interterrestrial/CLI-Music-Player.git
   cd CLI-Music-Player
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Add your audio files:**
   Place your `.mp3` tracks into the `songs/` directory:
   ```bash
   mkdir -p songs
   # Copy your .mp3 files into the songs/ folder
   ```

4. **Run the Music Player:**
   ```bash
   node musicplayer.js
   ```

---

## 🏛 Architecture

The player follows a clean separation of concerns:

- **`SongManager`**: Scans directory for `.mp3` tracks and manages playlist indexing.
- **`AudioEngine`**: Manages VLC process spawning (headless RC mode), ID3 metadata extraction via `music-metadata`, timestamp/seekbar intervals, volume/mute state, seek commands, visualizer wave generation, and auto-advance on track completion.
- **`TerminalInterface`**: Handles `stdin` raw-mode byte streams, keyboard event dispatching, in-place ANSI menu/seekbar/visualizer rendering, ID3 tag display, lyrics overlay, and color theme cycling.

For detailed UML class diagrams, use cases, and ER models, check out [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 📦 Dependencies

| Package | Purpose |
| :--- | :--- |
| [`music-metadata`](https://www.npmjs.com/package/music-metadata) | Parse ID3 tags (title, artist, album, year, genre, lyrics) from audio files |

All other functionality uses Node.js built-in modules (`fs`, `path`, `child_process`).

---

## 📜 License
This project is open source and available under the [MIT License](LICENSE).
