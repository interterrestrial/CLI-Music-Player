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
        this.currentDuration = 0;
        this.currentTime = 0;
        this.seekBarInterval = null;
        this.currentSongIndex = 0;
    }

    getSongInfo(songPath) {
        return new Promise((resolve) => {
            const childProcess = spawn('afinfo', [songPath], {
                stdio: 'pipe'
            });

            let output = '';

            childProcess.stdout.on('data', chunk => {
                output += chunk.toString();
            });

            childProcess.on('error', () => {
                resolve(new SongMetadata(120, path.basename(songPath), songPath));
            });

            childProcess.stdout.on('end', () => {
                const match = output.match(/estimated duration:\s+([\d.]+)\s+sec/);
                const duration = match ? Number(match[1]) : 120;
                resolve(new SongMetadata(
                    duration.toFixed(2),
                    path.basename(songPath),
                    songPath
                ));
            });
        });
    }

    sendVlcCommand(command) {
        if (this.player && this.player.stdin && !this.player.stdin.destroyed) {
            try {
                this.player.stdin.write(`${command}\n`);
            } catch (e) {
                // Ignore pipe errors
            }
        }
    }

    async playSong(index = this.currentSongIndex) {
        this.stop();

        this.currentSongIndex = index;
        const songPath = this.songManager.getSongPath(this.currentSongIndex);
        if (!songPath) return;

        try {
            const metadata = await this.getSongInfo(songPath);
            this.currentDuration = Number(metadata.duration) || 0;
            this.currentTime = 0;
            this.paused = false;

            // Spawn VLC in remote control (rc) interface mode without video
            const childProcess = spawn('vlc', [
                '-I', 'rc',
                '--no-video',
                '--play-and-exit',
                songPath
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            childProcess.on('error', (err) => {
                console.log(`\nVLC Playback error: ${err.message}`);
            });

            childProcess.on('spawn', () => {
                this.startSeekBar(this.currentDuration);
            });

            childProcess.on('close', () => {
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

        this.paused = !this.paused;
        this.sendVlcCommand('pause');
    }

    seekRelative(seconds) {
        if (!this.player || this.currentDuration <= 0) return;

        const newTime = Math.max(0, Math.min(this.currentDuration, this.currentTime + seconds));
        this.currentTime = newTime;

        // VLC rc interface: 'seek <seconds>' jumps to the specified timestamp
        this.sendVlcCommand(`seek ${Math.floor(newTime)}`);

        if (this.onSeekBar) {
            this.onSeekBar(Number(this.currentTime.toFixed(0)), this.currentDuration);
        }
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
        this.currentTime = 0;

        if (this.player) {
            this.player.removeAllListeners('close');
            this.sendVlcCommand('quit');
            this.player.kill('SIGKILL');
            this.player = null;
        }
    }

    startSeekBar(duration) {
        this.seekBarInterval = setInterval(() => {
            if (this.paused || !this.player) return;

            this.currentTime += 1;

            if (this.currentTime >= duration) {
                if (this.onSeekBar) this.onSeekBar(duration, duration);
                clearInterval(this.seekBarInterval);
            } else {
                if (this.onSeekBar) this.onSeekBar(Number(this.currentTime.toFixed(0)), duration);
            }
        }, 1000);
    }
}

