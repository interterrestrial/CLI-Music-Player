// Color Palettes
const THEMES = {
    cyberpunk: {
        name: "Cyberpunk 2077",
        bannerBg: "\x1b[45m",
        bannerFg: "\x1b[97m\x1b[1m",
        primary: "\x1b[96m",       // Neon Cyan
        secondary: "\x1b[95m",     // Neon Magenta
        accent: "\x1b[93m",        // Neon Yellow
        highlightBg: "\x1b[44m",
        text: "\x1b[97m",
        dim: "\x1b[90m",
        bar: "\x1b[92m",
        border: "\x1b[35m"
    },
    dark: {
        name: "Dark Modern",
        bannerBg: "\x1b[40m",
        bannerFg: "\x1b[97m\x1b[1m",
        primary: "\x1b[36m",       // Soft Cyan
        secondary: "\x1b[34m",     // Blue
        accent: "\x1b[33m",        // Amber
        highlightBg: "\x1b[100m",
        text: "\x1b[37m",
        dim: "\x1b[90m",
        bar: "\x1b[32m",
        border: "\x1b[90m"
    },
    matrix: {
        name: "The Matrix",
        bannerBg: "\x1b[42m",
        bannerFg: "\x1b[30m\x1b[1m",
        primary: "\x1b[92m",       // Bright Green
        secondary: "\x1b[32m",     // Forest Green
        accent: "\x1b[97m",        // White
        highlightBg: "\x1b[42m\x1b[30m",
        text: "\x1b[32m",
        dim: "\x1b[90m",
        bar: "\x1b[92m",
        border: "\x1b[32m"
    }
};

const RESET = "\x1b[0m";

export class TerminalInterface {
    constructor(songManager, audioEngine) {
        this.songManager = songManager;
        this.audioEngine = audioEngine;
        this.currentSongIndex = 0;
        this.isRawMode = true;

        // Theme management
        this.themeKeys = ["cyberpunk", "dark", "matrix"];
        this.currentThemeIndex = 0;

        this.audioEngine.onTrackChange = (newIndex) => {
            this.currentSongIndex = newIndex;
            this.buildMenu();
        };

        this.audioEngine.onSeekBar = (timeElapsed, duration) => {
            this.drawSeekBar(timeElapsed, duration);
        };

        this.audioEngine.onVisualizerTick = (timeElapsed, duration) => {
            this.drawSeekBar(timeElapsed, duration);
        };

        this.init();
    }

    get theme() {
        return THEMES[this.themeKeys[this.currentThemeIndex]];
    }

    cycleTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themeKeys.length;
        this.buildMenu();
    }

    init() {
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(this.isRawMode);
        }
        process.stdin.resume();
        process.stdin.on('data', (chunk) => this.handleInput(chunk));

        process.on('SIGINT', (signal) => {
            this.audioEngine.stop();
            console.log(`\nClosing player with received signal: ${signal}`);
            console.log('Bye Bye');
            process.exit();
        });

        this.buildMenu();
    }

    buildMenu() {
        const t = this.theme;
        process.stdout.write('\x1B[2J');   // clear screen
        process.stdout.write('\x1B[0;0H'); // move cursor to row 0, col 0

        // Banner Header
        console.log(`${t.bannerBg}${t.bannerFg} 🎧 CLI MUSIC PLAYER 🎵 [Theme: ${t.name}] ${RESET}`);
        console.log(`${t.border}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

        const songs = this.songManager.allSongs;
        songs.forEach((song, index) => {
            if (this.currentSongIndex === index) {
                console.log(` ${t.accent}➔${RESET} ${t.highlightBg}${t.text} [${index + 1}] ${song} ${RESET}`);
            } else {
                console.log(`   ${t.dim} [${index + 1}] ${song}${RESET}`);
            }
        });

        const volText = this.audioEngine.isMuted
            ? `${t.accent}[MUTED]${RESET}`
            : `${t.secondary}Vol: ${this.audioEngine.getVolumePercent()}%${RESET}`;

        console.log(`${t.border}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
        console.log(`${t.primary}[↑/↓]${RESET} Select | ${t.primary}[Enter]${RESET} Play | ${t.primary}[P]${RESET} Pause | ${t.primary}[←/→]${RESET} ±10s Seek`);
        console.log(`${t.primary}[+/-]${RESET} Volume | ${t.primary}[M]${RESET} Mute (${volText}) | ${t.primary}[T]${RESET} Cycle Theme`);
        console.log(`${t.primary}[N/B]${RESET} Next/Prev | ${t.accent}[Q]${RESET} Quit`);
        console.log(`${t.border}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    }

    drawSeekBar(timeElapsed, duration) {
        const t = this.theme;
        const width = 20;
        const fraction = Math.min(1, Math.max(0, timeElapsed / duration));
        const fill = Math.floor(fraction * width);
        const empty = width - fill;

        const volStatus = this.audioEngine.isMuted
            ? `${t.accent}🔇 MUTED${RESET}`
            : `${t.secondary}🔊 ${this.audioEngine.getVolumePercent()}%${RESET}`;

        const rawVis = this.audioEngine.getVisualizerWave(16);
        const coloredVis = `${t.accent}${rawVis}${RESET}`;
        const progressBar = `${t.bar}${'█'.repeat(fill)}${RESET}${t.dim}${'░'.repeat(empty)}${RESET}`;

        // Single in-place line with Seekbar, Animated EQ, and Volume HUD
        process.stdout.write(`\r[${progressBar}] ${t.primary}${timeElapsed}/${duration}s${RESET} | ♫ [${coloredVis}] | ${volStatus} `);
    }

    handleInput(chunk) {
        const total = this.songManager.getSongCount();

        // Exit on Ctrl+C (3), 'Q' (81), 'q' (113)
        if (chunk[0] === 3 || chunk[0] === 81 || chunk[0] === 113) {
            process.kill(process.pid, 'SIGINT');
            return;
        }

        // Arrow keys (3 bytes: [27, 91, 65/66/67/68])
        if (chunk[0] === 27 && chunk[1] === 91) {
            if (chunk[2] === 65) { // Up Arrow
                if (!this.audioEngine.paused) {
                    this.currentSongIndex = (this.currentSongIndex === 0 ? total - 1 : this.currentSongIndex - 1) % total;
                    this.buildMenu();
                }
                return;
            } else if (chunk[2] === 66) { // Down Arrow
                if (!this.audioEngine.paused) {
                    this.currentSongIndex = (this.currentSongIndex + 1) % total;
                    this.buildMenu();
                }
                return;
            } else if (chunk[2] === 67) { // Right Arrow -> Fast-forward 10s
                this.audioEngine.seekRelative(10);
                return;
            } else if (chunk[2] === 68) { // Left Arrow -> Rewind 10s
                this.audioEngine.seekRelative(-10);
                return;
            }
        }

        // Enter key (13)
        if (chunk[0] === 13) {
            this.audioEngine.playSong(this.currentSongIndex);
            return;
        }

        // Pause / Resume on 'P' (80) or 'p' (112)
        if (chunk[0] === 80 || chunk[0] === 112) {
            this.audioEngine.pauseResume();
            return;
        }

        // Cycle Theme on 'T' (84) or 't' (116)
        if (chunk[0] === 84 || chunk[0] === 116) {
            this.cycleTheme();
            return;
        }

        // Volume Up on '+' or '='
        if (chunk[0] === 43 || chunk[0] === 61) {
            this.audioEngine.setVolumeRelative(16); // +~6%
            this.buildMenu();
            return;
        }

        // Volume Down on '-' or '_'
        if (chunk[0] === 45 || chunk[0] === 95) {
            this.audioEngine.setVolumeRelative(-16); // -~6%
            this.buildMenu();
            return;
        }

        // Mute toggle on 'M' (77) or 'm' (109)
        if (chunk[0] === 77 || chunk[0] === 109) {
            this.audioEngine.toggleMute();
            this.buildMenu();
            return;
        }

        // Next song on 'N' (78) or 'n' (110)
        if (chunk[0] === 78 || chunk[0] === 110) {
            this.audioEngine.nextSong();
            return;
        }

        // Previous song on 'B' (66) or 'b' (98)
        if (chunk[0] === 66 || chunk[0] === 98) {
            this.audioEngine.previousSong();
            return;
        }
    }
}




