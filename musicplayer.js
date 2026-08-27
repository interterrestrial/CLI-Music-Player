import { spawn } from "child_process";
import path, { join } from "path";
import { readdirSync } from "fs";

process.stdin.setRawMode(true);

const songDir = readdirSync(join(process.cwd(), 'songs'), {
    encoding: 'utf8',
});


/**
    let input = ''; since chunk is immediateky transfered => no need of this    
**/
const allSongs = songDir.filter(fileName => {
    return fileName.endsWith('.mp3') ? true : false
})


let player = null;
let paused = false;

let startTime = 0;
let pausedAt = 0;
let totalPausedTime = 0;
let seekBarInterval = null;

let currentSongIndex = 0;


function buildMenu() {
    process.stdout.write('\x1B[2J'); // clears screen
    process.stdout.write('\x1B[0;0H'); // move cursor to the 0th row and column

    allSongs.forEach((song, index) => {
        if(currentSongIndex === index) {
            console.log(` > ${song}`);
        } else {
            console.log(`${song}`);
        }
    })
}

async function playSong() {
    if(player) {
        clearInterval(seekBarInterval);
        seekBarInterval = null;
        paused = false;
        startTime = 0;
        pausedAt = 0;
        totalPausedTime = 0;
        player.kill();
        player = null;
    }

    
    try {
        const songPath = join(process.cwd(), 'songs', allSongs[currentSongIndex]);

        const { duration } = await getSongInfo(songPath);

        const childProcess = spawn('vlc', [songPath, '--intf', 'rc', '--play-and-exit'], {
            stdio: 'pipe',
        });

        // vlc process started
        childProcess.on('spawn', () => {
            startTime = Date.now();
            seekBar(duration);
        })

        childProcess.on('close', (code, singal) => {
            // auto advancement
            currentSongIndex = (currentSongIndex + 1) % allSongs.length;
            buildMenu();
            playSong()
        })

        player = childProcess;

    } catch(e) {
        console.log(`Music Duration does not extracted, so music can't be played.`)
    }
}

function getSongInfo(songPath) {
    return new Promise((resolve, reject) => {
        const childProcess = spawn('afinfo', [songPath], {
            stdio: 'pipe'
        })

        let output = '';

        /**
            * chunk is recived as Buffer, which can be converted into string format using toString
        */
        childProcess.stdout.on('data', chunk => {
            output += chunk.toString();
        })

        childProcess.stdout.on('end', () => {
            const match = output.match(/estimated duration:\s+([\d.]+)\s+sec/);

            if(!match) {
                reject({
                    duration: null
                })
                return;
            }

            resolve({
                duration: Number(match[1]).toFixed(2),
            });
        })

        childProcess.stdout.on('error', (err) => {
            reject(err);
        })
    })
}

function seekBar(duration) {

    seekBarInterval = setInterval(() => {
        if(paused) {
            return;
        }
        // convert to seconds
        const timeElapsed = Number(((Date.now() - startTime - totalPausedTime) / 1000).toFixed(0)); 
        
        if(timeElapsed >= duration) {
            drawSeekBar(duration, duration);
            clearInterval(seekBarInterval);
        } else {
            drawSeekBar(timeElapsed, duration);
        }
    }, 1000);
}

function drawSeekBar(timeElapsed, duration) {
    const width = 30;
    const fraction = timeElapsed / duration;

    const fill = Math.floor(fraction * width);
    const empty = width - fill;

    const bar = `${'█'.repeat(fill)}${'░'.repeat(empty)}`
    process.stdout.write(`\r[${bar}] ${timeElapsed}/${duration}`)
}

process.stdin.on('data', chunk => {
    
    if(chunk[0] === 3 || chunk[0] === 81 || chunk[0] === 113) {
        process.kill(process.pid, 'SIGINT'); 
        return;
    }

    /**
        arrow key detection, since arrow keys arrives in 3 Bytes, length of chunk = 3
     */

    /**
        gets the escape character
     */
    if(chunk[0] === 27) {
        if(chunk[1] === 91) {
            if(chunk[2] === 65) {
                if(!paused) {
                    console.log('up key');
                    currentSongIndex = (currentSongIndex === 0 ? allSongs.length - 1 : currentSongIndex - 1) % allSongs.length;
                    buildMenu()
                } else {
                    // currently music is playing, stop and then go to next
                }
            } else if(chunk[2] === 66) {
                if(!paused) {
                    console.log('down arrow key');
                    currentSongIndex = (currentSongIndex + 1) % allSongs.length;
                    buildMenu();
                } else {
                    // currently music is playing
                }
            } else if(chunk[2] === 67) {
                console.log('right arrow key');
            } else if(chunk[2] === 68) {
                console.log('left arrow key')
            }
        }
        return
    }

    /**
        enter key represent carriage return
        ascii code is 13
     */
    if(chunk[0] === 13) {
        playSong();
        return;
    }

    /**
        pause, resume
     */

    if(chunk[0] === 80 || chunk[0] === 112) {
        player.stdin.write(`pause\n`);

        if(paused) {
            totalPausedTime += Date.now() - pausedAt;
        } else {
            // pause music
            pausedAt = Date.now()
        }

        paused = !paused;
        return
    }

    /**
        next (n), previous (b)
     */

    if(chunk[0] === 78 || chunk[0] === 110) {
        // next
        currentSongIndex = (currentSongIndex + 1) % allSongs.length;
        buildMenu();
        playSong();
        return
    }

    if(chunk[0] === 66 || chunk[0] === 98) {
        // b previous
        currentSongIndex = (currentSongIndex === 0 ? allSongs.length - 1 : currentSongIndex - 1) % allSongs.length;
        buildMenu();
        playSong();
        return
    }
    
})

process.on('SIGINT', signal => {
    console.log(`\nClosing player with recieved signal as: ${signal}`);
    console.log('Bye Bye');
    process.exit();
})

buildMenu();