export class TerminalInterface {
    constructor(songManager, audioEngine) {
        this.songManager = songManager;
        this.audioEngine = audioEngine;
        this.currentSongIndex = 0;
        this.isRawMode = true;

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
        process.stdout.write('\x1B[2J');   // clear screen
        process.stdout.write('\x1B[0;0H'); // move cursor to row 0, col 0

        const songs = this.songManager.allSongs;
        songs.forEach((song, index) => {
            if (this.currentSongIndex === index) {
                console.log(` > ${song}`);
            } else {
                console.log(`   ${song}`);
            }
        });

        const volText = this.audioEngine.isMuted
            ? `[MUTED]`
            : `Vol: ${this.audioEngine.getVolumePercent()}%`;

        console.log(`\n[↑/↓] Select | [Enter] Play | [P] Pause | [←/→] ±10s Seek`);
        console.log(`[+/-] Volume | [M] Mute (${volText}) | [N/B] Next/Prev | [Q] Quit`);
    }

    drawSeekBar(timeElapsed, duration) {
        const width = 24;
        const fraction = Math.min(1, Math.max(0, timeElapsed / duration));
        const fill = Math.floor(fraction * width);
        const empty = width - fill;

        const volStatus = this.audioEngine.isMuted
            ? `🔇 MUTED`
            : `🔊 ${this.audioEngine.getVolumePercent()}%`;

        const visualizer = this.audioEngine.getVisualizerWave(16);
        const progressBar = `${'█'.repeat(fill)}${'░'.repeat(empty)}`;

        // Single in-place line with Seekbar, Animated EQ, and Volume HUD
        process.stdout.write(`\r[${progressBar}] ${timeElapsed}/${duration}s | ♫ [${visualizer}] | ${volStatus} `);
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



