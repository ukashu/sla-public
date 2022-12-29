import { io } from "socket.io-client";

console.log('Content script works!');

async function readLocalStorage(key) {
    return new Promise((resolve, reject)=>{
        chrome.storage.sync.get([key], (result)=>{resolve(result[key])})
    })
}

let watcherOrStreamer, socket

//TODO I think that when I refresh, the first connection doesnt deactivate and it doubles messages sent TODO//

async function executeWatcherLogic() {
    watcherOrStreamer = await readLocalStorage('watcherOrStreamer')
    if(watcherOrStreamer === 'watcher') {
        // WATCHER BACKGROUND LOGIC
        console.log('watcher')
        socket = io('http://localhost:5000');
        socket.emit('join', 'room1')
        socket.on('signal-for-content-script', (arg) => {
            console.log('I received a signal from the server, forwarding to background')
            chrome.runtime.sendMessage({
                msg:"forwarded-signal",
                data: arg
            })
        })
    } else {
        console.log(watcherOrStreamer)
    }
}

executeWatcherLogic()

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.msg === "streamer-mode-on") {
            executeWatcherLogic()
            console.log(request.msg)
        } else if (request.msg === 'watcher-mode-on') {
            executeWatcherLogic()
            console.log(request.msg)
        } else if (request.msg === 'undefined-mode-on') {
            socket.disconnect()
            socket = undefined
            executeWatcherLogic()
            console.log(request.msg)
        }
    }
);
