import path, { join } from "path";
import { readdirSync } from "fs";

export class SongMetadata {
    constructor(duration, fileName, filePath, tags = {}) {
        this.duration = duration;
        this.fileName = fileName;
        this.filePath = filePath;
        this.title = tags.title || fileName.replace(/\.[^/.]+$/, "");
        this.artist = tags.artist || "Unknown Artist";
        this.album = tags.album || "Unknown Album";
        this.year = tags.year || "Unknown Year";
        this.genre = tags.genre || "Unknown Genre";
        this.lyrics = tags.lyrics || null;
    }
}


export class SongManager {
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
