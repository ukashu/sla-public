import React from 'react';
import logo from '../../assets/img/logo.svg';
import Greetings from '../../containers/Greetings/Greetings';
import './Popup.css';
import { useState } from 'react';



const Popup = () => {

  const [watcherOrStreamer, setStreamer] = useState(undefined)

  chrome.storage.sync.get(['watcherOrStreamer'],(result) => {
    setStreamer(result.watcherOrStreamer)
  })

  function setStreamerStorage() {
    chrome.storage.sync.set({watcherOrStreamer: 'streamer'})
    chrome.runtime.sendMessage({msg:"streamer-mode-on"})
    chrome.tabs.query({}, (tabs) => tabs.forEach( tab => chrome.tabs.sendMessage(tab.id, {msg:"streamer-mode-on"})))
    setStreamer(true)
  }
  
  function setWatcherStorage() {
    chrome.storage.sync.set({watcherOrStreamer: 'watcher'})
    chrome.runtime.sendMessage({msg:"watcher-mode-on"})
    chrome.tabs.query({}, (tabs) => tabs.forEach( tab => chrome.tabs.sendMessage(tab.id, {msg:"watcher-mode-on"})))
    setStreamer(false)
  }

  function resetStreamerWatcherStorage() {
    chrome.storage.sync.remove(['watcherOrStreamer'])
    chrome.runtime.sendMessage({msg:"undefined-mode-on"})
    chrome.tabs.query({}, (tabs) => tabs.forEach( tab => chrome.tabs.sendMessage(tab.id, {msg:"undefined-mode-on"})))
    setStreamer(undefined)
  }

  if (watcherOrStreamer === undefined) {
    return (
      <div className="App">
        <div onClick={setStreamerStorage} className="streamer">
          Streamer
        </div>
        <div onClick={setWatcherStorage} className="watcher">
          Watcher
        </div>
      </div>
    );
  }
  if (watcherOrStreamer === 'streamer') {
    return (
      <div className="App">
        <div onClick={resetStreamerWatcherStorage} className="home"></div>
        IM A STREAMER
      </div>
    )
  } else {
    return (
      <div className="App">
        <div onClick={resetStreamerWatcherStorage} className="home"></div>
        IM A WATCHER
      </div>
    )
  }
};

export default Popup;
