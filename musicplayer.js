import { spawn } from "child_process";
import path, { join } from "path";
import { readdirSync } from "fs";

class SongMetadata {
    constructor(duration, fileName, filePath) {
        this.duration = duration;
        this.fileName = fileName;
        this.filePath = filePath;
    }
}

class SongManager {
    constructor(directory = join(process.cwd(), 'songs')) {
        this.songsDirectory = directory;
        this.allSongs = this.loadSongs();
    }

    loadSongs() {
        try {
            const files = readdirSync(this.songsDirectory, { encoding: 'utf8' });
            return files.filter(fileName => fileName.endsWith('.mp3'));
        } catch (e) {
            return [];
        }
    }

    getSongPath(index) {
        if (index < 0 || index >= this.allSongs.length) return null;
        return join(this.songsDirectory, this.allSongs[index]);
    }

    getSongName(index) {
        return this.allSongs[index] || null;
    }

    getSongCount() {
        return this.allSongs.length;
    }
}

class AudioEngine {
    constructor(songManager, onTrackChange = null) {
        this.songManager = songManager;
        this.onTrackChange = onTrackChange;
        this.player = null;
        this.paused = false;
        this.startTime = 0;
        this.pausedAt = 0;
        this.totalPausedTime = 0;
        this.seekBarInterval = null;
        this.currentSongIndex = 0;
    }

    getSongInfo(songPath) {
        return new Promise((resolve, reject) => {
            const childProcess = spawn('afinfo', [songPath], {
                stdio: 'pipe'
            });

            let output = '';

            childProcess.stdout.on('data', chunk => {
                output += chunk.toString();
            });

            childProcess.stdout.on('end', () => {
                const match = output.match(/estimated duration:\s+([\d.]+)\s+sec/);
                if (!match) {
                    reject({ duration: null });
                    return;
                }

                resolve(new SongMetadata(
                    Number(match[1]).toFixed(2),
                    path.basename(songPath),
                    songPath
                ));
            });

            childProcess.stdout.on('error', (err) => {
                reject(err);
            });
        });
    }

    async playSong(index = this.currentSongIndex) {
        this.stop();

        this.currentSongIndex = index;
        const songPath = this.songManager.getSongPath(this.currentSongIndex);
        if (!songPath) return;

        try {
            const metadata = await this.getSongInfo(songPath);

            const childProcess = spawn('afplay', [songPath], {
                stdio: 'pipe',
            });

            childProcess.on('error', (err) => {
                console.log(`\nPlayback error: ${err.message}`);
            });

            childProcess.on('spawn', () => {
                this.startTime = Date.now();
                this.startSeekBar(metadata.duration);
            });

            childProcess.on('close', (code, signal) => {
                if (this.player === childProcess) {
                    this.nextSong();
                }
            });

            this.player = childProcess;
        } catch (e) {
            console.log(`\nMusic duration could not be extracted, so music cannot be played.`);
        }
    }

    pauseResume() {
        if (!this.player) return;

        if (this.paused) {
            this.player.kill('SIGCONT');
            this.totalPausedTime += Date.now() - this.pausedAt;
        } else {
            this.player.kill('SIGSTOP');
            this.pausedAt = Date.now();
        }

        this.paused = !this.paused;
    }

    nextSong() {
        const total = this.songManager.getSongCount();
        if (total === 0) return;
        this.currentSongIndex = (this.currentSongIndex + 1) % total;
        if (this.onTrackChange) this.onTrackChange(this.currentSongIndex);
        this.playSong(this.currentSongIndex);
    }

    previousSong() {
        const total = this.songManager.getSongCount();
        if (total === 0) return;
        this.currentSongIndex = (this.currentSongIndex === 0 ? total - 1 : this.currentSongIndex - 1) % total;
        if (this.onTrackChange) this.onTrackChange(this.currentSongIndex);
        this.playSong(this.currentSongIndex);
    }

    stop() {
        if (this.seekBarInterval) {
            clearInterval(this.seekBarInterval);
            this.seekBarInterval = null;
        }
        this.paused = false;
        this.startTime = 0;
        this.pausedAt = 0;
        this.totalPausedTime = 0;

        if (this.player) {
            this.player.removeAllListeners('close');
            this.player.kill();
            this.player = null;
        }
    }

    startSeekBar(duration) {
        this.seekBarInterval = setInterval(() => {
            if (this.paused) return;

            const timeElapsed = Number(((Date.now() - this.startTime - this.totalPausedTime) / 1000).toFixed(0));

            if (timeElapsed >= duration) {
                TerminalInterface.drawSeekBar(duration, duration);
                clearInterval(this.seekBarInterval);
            } else {
                TerminalInterface.drawSeekBar(timeElapsed, duration);
            }
        }, 1000);
    }
}

class TerminalInterface {
    constructor(songManager, audioEngine) {
        this.songManager = songManager;
        this.audioEngine = audioEngine;
        this.currentSongIndex = 0;
        this.isRawMode = true;

        this.audioEngine.onTrackChange = (newIndex) => {
            this.currentSongIndex = newIndex;
            this.buildMenu();
        };

        this.init();
    }

    init() {
        process.stdin.setRawMode(this.isRawMode);
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

    static drawSeekBar(timeElapsed, duration) {
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

// Instantiate and start application
const songManager = new SongManager();
const audioEngine = new AudioEngine(songManager);
const terminalUI = new TerminalInterface(songManager, audioEngine);