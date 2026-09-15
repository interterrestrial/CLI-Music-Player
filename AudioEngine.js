import { spawn } from "child_process";
import path from "path";
import { SongMetadata } from "./SongManager.js";

export class AudioEngine {
    constructor(songManager, onTrackChange = null, onSeekBar = null) {
        this.songManager = songManager;
        this.onTrackChange = onTrackChange;
        this.onSeekBar = onSeekBar; // callback to draw seekbar from UI

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

            if (this.onSeekBar) {
                if (timeElapsed >= duration) {
                    this.onSeekBar(duration, duration);
                    clearInterval(this.seekBarInterval);
                } else {
                    this.onSeekBar(timeElapsed, duration);
                }
            }
        }, 1000);
    }
}
