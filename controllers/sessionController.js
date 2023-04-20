const asyncHandler = require('express-async-handler')

const setTrackState = asyncHandler(async (req, res) => {
  console.log('URI: ', req.body.trackURI, ' progress: ', req.body.trackProgress, ' action: ', req.body.action)
  console.log('someone hit session endpoint')

  //emit track state change to listening sockets 
  req.io.to('room1').emit('signal-for-content-script', { trackURI: req.body.trackURI, trackProgress: req.body.trackProgress, action: req.body.action })

  res.status(200).send('emit send successfully')
})

module.exports = {
  setTrackState
}