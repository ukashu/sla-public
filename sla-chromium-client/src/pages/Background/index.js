console.log('Background working')
import { dynamicLogin, testingPurposes, getTrackCheckAndFetch, startPlayback, pausePlayback } from './modules/spotifyWatcher';

async function readLocalStorage(key) {
    return new Promise((resolve, reject)=>{
        chrome.storage.sync.get([key], (result)=>{resolve(result[key])})
    })
}

let watcherOrStreamer, pollingForChanges

testingPurposes()

dynamicLogin()

async function executeLogic() {
    watcherOrStreamer = await readLocalStorage('watcherOrStreamer')
    if(watcherOrStreamer === 'watcher') {
        // WATCHER BACKGROUND LOGIC IN CONTENT SCRIPT
        clearInterval(pollingForChanges)
        console.log('watcher')
    } else if (watcherOrStreamer === 'streamer') {
        // STREAMER BACKGROUND LOGIC
        console.log('streamer')
        pollingForChanges = setInterval(()=>{
            console.log('polling for changes')
            getTrackCheckAndFetch()
        }, 2000)
    } else {
        // TURN OFF BACKGROUND LOGIC
        clearInterval(pollingForChanges)
        console.log('undefined')
    }
}

executeLogic()

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msg === "streamer-mode-on") {
            executeLogic()
            console.log(request.msg)
        } else if (request.msg === 'watcher-mode-on') {
            executeLogic()
            console.log(request.msg)
        } else if (request.msg === 'undefined-mode-on') {
            executeLogic()
            console.log(request.msg)
        } else if (request.msg === 'forwarded-signal') {
            //Received signal from content script which recived it from socket
            //fetch the spotify api to change track/pause
            console.log('Received a SAPI request, executing ')
            console.log(request.data)
            if (request.data.action === 'resume') {
                console.log('signal for resuming')
                startPlayback(request.data)
            } else if (request.data.action === 'pause') {
                pausePlayback()
                console.log('signal for pausing')
            }
            //spotifyPlayback('pause','PUT')
        }
    }
);


