# 🎵 Interactive CLI Music Player

A sleek, interactive, and lightweight Terminal Music Player built with **Node.js** featuring in-place ANSI rendering, real-time keyboard navigation, live progress seekbar, and seamless audio controls.

---

## ✨ Features

- 🎹 **Interactive Navigation**: Seamlessly navigate through songs using the **Up (↑)** and **Down (↓)** arrow keys.
- 🔄 **In-Place UI Redraw**: Uses ANSI escape sequences to refresh the terminal menu without scrolling or screen flicker.
- ⏸ **True Pause & Resume**: Pause/resume playback cleanly with accurate timestamp recalculation so progress never drifts.
- 📊 **Dynamic Live Seekbar**: Real-time ASCII progress bar displaying current playback position, time elapsed, and total song duration.
- ⏭ **Track Controls & Auto-Advance**: Skip to next/previous tracks manually or let the player automatically advance to the next song when one finishes.
- 🧹 **Graceful Cleanup**: Safely shuts down background audio processes and clears timers upon exit (`Q` / `Ctrl+C`).
- 🏗 **Clean Object-Oriented Architecture**: Modular codebase structured into `SongManager`, `AudioEngine`, and `TerminalInterface`.

---

## 🎮 Keyboard Controls

| Key | Action |
| :--- | :--- |
| **`↑` (Up Arrow)** | Move selection to previous song |
| **`↓` (Down Arrow)** | Move selection to next song |
| **`Enter`** | Play highlighted song |
| **`P` / `p`** | Pause / Resume current playback |
| **`N` / `n`** | Skip to Next track |
| **`B` / `b`** | Skip to Previous track |
| **`Q` / `q`** or **`Ctrl + C`** | Quit application cleanly |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- macOS (uses native `afplay` and `afinfo` utilities)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/interterrestrial/CLI-Music-Player.git
   cd CLI-Music-Player
   ```

2. **Add your audio files:**
   Place your `.mp3` tracks into the `songs/` directory:
   ```bash
   mkdir -p songs
   # Copy your .mp3 files into the songs/ folder
   ```

3. **Run the Music Player:**
   ```bash
   node musicplayer.js
   ```

---

## 🏛 Architecture

The player follows a clean separation of concerns:

- **`SongManager`**: Scans directory for `.mp3` tracks and manages playlist indexing.
- **`AudioEngine`**: Manages process spawning (`afplay`), metadata extraction (`afinfo`), timestamp/seekbar intervals, auto-advance, and pause/resume OS signals.
- **`TerminalInterface`**: Handles `stdin` raw-mode byte streams, keyboard event dispatching, and in-place ANSI menu/seekbar rendering.

For detailed UML class diagrams, use cases, and ER models, check out [architecture.md](./architecture.md).

---

## 📜 License
This project is open source and available under the [MIT License](LICENSE).
