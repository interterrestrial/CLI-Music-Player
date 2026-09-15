import { SongManager } from "./SongManager.js";
import { AudioEngine } from "./AudioEngine.js";
import { TerminalInterface } from "./TerminalInterface.js";

// Main Entry Point
const songManager = new SongManager();
const audioEngine = new AudioEngine(songManager);
const terminalUI = new TerminalInterface(songManager, audioEngine);