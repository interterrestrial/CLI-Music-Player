# CLI Music Player - System Architecture & Specification

## 1. System Overview
The **CLI Music Player** is a terminal-based interactive audio player developed in Node.js. It features raw-mode terminal event handling, in-place ANSI rendering, audio metadata extraction, background process spawning for playback, time-accurate playback tracking with pausing capabilities, and a dynamic progress seek bar.

---

## 2. Use Case Diagram

```mermaid
graph LR
    User((User / Listener))

    subgraph "CLI Music Player System"
        UC1[Browse / Navigate Songs]
        UC2[Play Selected Song]
        UC3[Pause / Resume Song]
        UC4[View Live Progress / Seekbar]
        UC5[Skip Track Next / Previous]
        UC6[Auto-Advance Next Track]
        UC7[Exit Application Safely]
    end

    subgraph "OS & Subsystems"
        OS_FS[(File System / Directory)]
        OS_Meta[Metadata Extractor afinfo]
        OS_Audio[Audio Player Process vlc / afplay]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC7

    UC1 -.->|Scan Directory| OS_FS
    UC2 -.->|Extract Duration| OS_Meta
    UC2 -.->|Spawn Playback| OS_Audio
    UC3 -.->|IPC Command / Signals| OS_Audio
    UC4 -.->|Timer Tick Calculation| UC2
    UC6 -.->|Process Exit Trigger| UC2
    UC7 -.->|Kill Processes / Clear Timers| OS_Audio
```

---

## 3. UML Class / Module Diagram

```mermaid
classDiagram
    class TerminalInterface {
        -isRawMode: Boolean
        -currentSongIndex: Number
        +buildMenu(): void
        +drawSeekBar(timeElapsed: Number, duration: Number): void
        +handleInput(chunk: Buffer): void
    }

    class AudioEngine {
        -player: ChildProcess
        -paused: Boolean
        -startTime: Number
        -pausedAt: Number
        -totalPausedTime: Number
        -seekBarInterval: NodeJS.Timer
        +playSong(songIndex: Number): Promise~void~
        +pauseResume(): void
        +nextSong(): void
        +previousSong(): void
        +stop(): void
        +getSongInfo(songPath: String): Promise~SongMetadata~
    }

    class SongManager {
        -songsDirectory: String
        -allSongs: String[]
        +loadSongs(): String[]
        +getSongPath(index: Number): String
        +getSongCount(): Number
    }

    class SongMetadata {
        +duration: Number
        +fileName: String
        +filePath: String
    }

    TerminalInterface --> SongManager : Queries playlist
    TerminalInterface --> AudioEngine : Dispatches commands (Play, Pause, Skip)
    AudioEngine --> SongManager : Resolves file paths
    AudioEngine --> SongMetadata : Extracts & utilizes
```

---

## 4. Entity-Relationship (ER) Diagram / Data Model

```mermaid
erDiagram
    PLAYLIST ||--|{ TRACK : contains
    TRACK ||--|| TRACK_METADATA : has
    PLAYER_SESSION ||--|| TRACK : plays
    PLAYER_SESSION ||--|| PROGRESS_STATE : tracks

    PLAYLIST {
        string directoryPath PK
        int totalSongs
    }

    TRACK {
        int songIndex PK
        string fileName
        string fileExtension
        string absolutePath
    }

    TRACK_METADATA {
        string absolutePath FK
        float durationSeconds
        string format
    }

    PLAYER_SESSION {
        int processId PK
        string status "PLAYING | PAUSED | STOPPED"
        timestamp startedAt
    }

    PROGRESS_STATE {
        int processId FK
        float timeElapsed
        float totalPausedTime
        int percentage
        string visualBar
    }
```

---
