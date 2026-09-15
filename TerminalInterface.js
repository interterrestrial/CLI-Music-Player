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
    }

    drawSeekBar(timeElapsed, duration) {
        const width = 30;
        const fraction = Math.min(1, timeElapsed / duration);
        const fill = Math.floor(fraction * width);
        const empty = width - fill;

        const bar = `${'█'.repeat(fill)}${'░'.repeat(empty)}`;
        process.stdout.write(`\r[${bar}] ${timeElapsed}/${duration}s`);
    }

    handleInput(chunk) {
        const total = this.songManager.getSongCount();

        // Exit on Ctrl+C (3), 'Q' (81), 'q' (113)
        if (chunk[0] === 3 || chunk[0] === 81 || chunk[0] === 113) {
            process.kill(process.pid, 'SIGINT');
            return;
        }

        // Arrow keys
        if (chunk[0] === 27 && chunk[1] === 91) {
            if (chunk[2] === 65) { // Up Arrow
                if (!this.audioEngine.paused) {
                    this.currentSongIndex = (this.currentSongIndex === 0 ? total - 1 : this.currentSongIndex - 1) % total;
                    this.buildMenu();
                }
            } else if (chunk[2] === 66) { // Down Arrow
                if (!this.audioEngine.paused) {
                    this.currentSongIndex = (this.currentSongIndex + 1) % total;
                    this.buildMenu();
                }
            }
            return;
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
