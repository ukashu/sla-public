const CLIENT_ID = ''
const RESPONSE_TYPE = 'code'
const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`
const STATE = encodeURIComponent('meet' + Math.random().toString(36).substring(2, 15))
const SCOPE = 'user-read-playback-state user-modify-playback-state'
const SHOW_DIALOG = encodeURIComponent('false')
const CODE_CHALLENGE_METHOD = 'S256' //TODO

let spotify_access_token = ''
let spotify_refresh_token = ''
let last_saved_track = ''
let last_saved_progress = null
let isPaused = true

//GENERATING CODE VERIFIER
function dec2hex(dec) {
  return ('0' + dec.toString(16)).substr(-2)
}

function generateRandomString() {
  var array = new Uint32Array(56/2);
  crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join('');
}

const CODE_VERIFIER = generateRandomString();
//GENERATING CODE VERIFIER

//GENERATING CODE CHALLENGE
function sha256(plain) { // returns promise ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
      var str = "";
      var bytes = new Uint8Array(a);
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      return btoa(str)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }

async function challenge_from_verifier(v) {
  let hashed = await sha256(v);
  let base64encoded = base64urlencode(hashed);
  return base64encoded;
}

const CODE_CHALLENGE = await challenge_from_verifier(CODE_VERIFIER)
//GENERATING CODE CHALLENGE

function createSpotifyEndpoint() {
  let oauth2_spotify_url = 
    `https://accounts.spotify.com/authorize\
?client_id=${encodeURIComponent(CLIENT_ID)}\
&response_type=${encodeURIComponent(RESPONSE_TYPE)}\
&redirect_uri=${encodeURIComponent(REDIRECT_URI)}\
&state=${STATE}\
&scope=${encodeURIComponent(SCOPE)}\
&show_dialog=${SHOW_DIALOG}\
&code_challenge_method=${CODE_CHALLENGE_METHOD}\
&code_challenge=${CODE_CHALLENGE}`
    console.log(oauth2_spotify_url)

    return oauth2_spotify_url
}

function loginPKCE() {
  chrome.identity.launchWebAuthFlow({
    url: createSpotifyEndpoint(),
    interactive: true
  }, (res)=>{
    //extract code from res url
    let code = res.substring(res.indexOf('code=') + 5)
    code = code.substring(0, code.indexOf('&'))
    console.log(code)
    //extract state from res url
    let state = res.substring(res.indexOf('state=') + 6)
    console.log(state)
    if (state === null) {
      console.log('error') 
      return
    } else {
      console.log('success')
      let spotify_token_fetch_url ='https://accounts.spotify.com/api/token'
      const body_urlencoded = new URLSearchParams({
        'code': code,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code',
        'client_id': CLIENT_ID,
        'code_verifier': CODE_VERIFIER
      });
      let spotify_token_fetch_options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body_urlencoded
      }
      fetch(spotify_token_fetch_url, spotify_token_fetch_options)
      .then(res=>res.json())
      .then(res => {
        console.log(res)
        spotify_access_token = res.access_token
        if (res.refresh_token) {
          chrome.storage.sync.set({"SLA_spotify_refresh_token": res.refresh_token})
        }
      })
      .catch((error) => {
        console.error('Error:', error)
      })
    }
  }
)}

function refreshPKCE(refresh_token) {
  console.log('get token from refresh')
  let spotify_token_refresh_url ='https://accounts.spotify.com/api/token'
  const body_urlencoded = new URLSearchParams({
    'refresh_token': refresh_token,
    'grant_type': 'refresh_token',
    'client_id': CLIENT_ID
  });
  let spotify_token_refresh_options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body_urlencoded
  }
  fetch(spotify_token_refresh_url, spotify_token_refresh_options)
  .then(res=>res.json())
  .then(res => {
      if (res.error_description) {
        chrome.storage.sync.remove(["SLA_spotify_refresh_token"])
        dynamicLogin()
        return
      }
      console.log(res)
      spotify_access_token = res.access_token
      chrome.storage.sync.set({"SLA_spotify_refresh_token": res.refresh_token})
  })
  .catch((error) => {
      console.error('Error:', error)
  })
}

function dynamicLogin() {
  chrome.storage.sync.get(['SLA_spotify_refresh_token'], (result)=>{
    console.log(result.SLA_spotify_refresh_token)
    if (result.SLA_spotify_refresh_token) {
        //Request access_token with refresh_token
        refreshPKCE(result.SLA_spotify_refresh_token)
        // TODO If error (refresh token expires or sth) it should delete the chrome storage entry TODO
    } else {
        //Login and request refresh_token
        loginPKCE()
    }
  })
}

//Streamer side functionality
function getTrackCheckAndFetch() {
  console.log('getTrackINFO')
  let device_fetch_url = 'https://api.spotify.com/v1/me/player/currently-playing'
  let device_fetch_options = {
    method: 'GET',
    headers: {
      "Authorization": `Bearer ${spotify_access_token}`, //Old tokens work too
      "Content-Type" : 'application/json',
      "Accept": 'application/json'
    }
  }
  fetch(device_fetch_url, device_fetch_options)
  .then(res=>res.json())
  .then(res => {
    console.log(res)
    if (last_saved_track != res.item.uri && isPaused === false) {
      //Send track data to server
      console.log('the last track is different and is resumed!')
      putSessionChange(res.item.uri, res.progress_ms, 'resume')
      .then((res)=>{console.log(res)})
    } else if (last_saved_progress === res.progress_ms && isPaused === false) { // && isPaused === false
      //Send signal to pause to server
      putSessionChange(res.item.uri, res.progress_ms, 'pause')
      .then((res)=>{console.log(res)})
      isPaused = true
      console.log('you should pause!')
    } else if (last_saved_progress != res.progress_ms && isPaused === true) {
      console.log('You should resume!')
      //send signal to resume(set track) to server/change 
      putSessionChange(res.item.uri, res.progress_ms, 'resume')
      .then((res)=>{console.log(res)})
      isPaused = false
    }
    console.log('the track remains unchanged')
    last_saved_track = res.item.uri
    last_saved_progress = res.progress_ms
  })
  .catch((error) => {
    error = JSON.stringify(error)
    console.error('Error:', error)
  })
}

function putSessionChange(trackURI, trackProgress, action) {
  let data = { trackURI, trackProgress, action }
  return fetch('http://localhost:5000/api/session', { //If there's no return fetch gets called regardless of the checks in getTrackCheckAndFetch
    method: 'put',
    body: JSON.stringify(data),
    headers: { 'Content-type': 'application/json' }
  })
  .then((res)=>{console.log(res)})
}
//Streamer side functionality

//Watcher side functionality
function startPlayback(data) {
  console.log('PLAY!')
  let body = {
    uris: [data.trackURI],
    position_ms: data.trackProgress
  }
  let device_fetch_url = 'https://api.spotify.com/v1/me/player/play'
  let device_fetch_options = {
    method: 'PUT',
    headers: {
      "Authorization": `Bearer ${spotify_access_token}`, //Old tokens work too
      "Content-Type" : 'application/json',
    },
    body: JSON.stringify(body)
  }
  fetch(device_fetch_url, device_fetch_options)
  .then(res=>res.json())
  .then(res => {console.log(res)})
  .catch((error) => {
      console.error('Error:', error)
  })
}

function pausePlayback() {
  console.log('PAUSE!')
  let device_fetch_url = 'https://api.spotify.com/v1/me/player/pause'
  let device_fetch_options = {
    method: 'PUT',
    headers: {
      "Authorization": `Bearer ${spotify_access_token}`, //Old tokens work too
      "Content-Type" : 'application/json',
    }
  }
  fetch(device_fetch_url, device_fetch_options)
  .then(res=>res.json())
  .then(res => {console.log(res)})
  .catch((error) => {
    console.error('Error:', error)
  })
}
//Watcher side functionality

async function testingPurposes() {
  console.log('testing purposes')
}

export {createSpotifyEndpoint, testingPurposes, dynamicLogin, getTrackCheckAndFetch, startPlayback, pausePlayback}