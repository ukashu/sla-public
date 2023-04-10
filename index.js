const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const port = process.env.PORT || 5000

const io = new Server(server, {
  cors: {
    origin: "https://www.twitch.tv"
  }
});
require('dotenv').config();

app.use(express.json())

io.on('connection', (socket) => {
    console.log('user connected, id: ' + socket.id)
    socket.on('chat message', (msg) => {
      console.log('socket_id: ' + socket.id + ', message: ' + msg);
    });
    socket.on('join',(room) => {socket.join(room)})
  });

app.post('/send-emit', (req, res) => {
  console.log('URI: ', req.body.trackURI, ' progress: ', req.body.trackProgress, ' action: ', req.body.action)
  console.log('someone hit send-emit endpoint')
  io.to('room1').emit('signal-for-content-script', req.body)
  res.status(200).send('emit send successfully')
})

//TODO endpoint for those joining to get the current track and play it TODO
//Example resume request
//curl -X POST -H "Content-Type: application/json" -d '{"trackURI": "spotify:track:2Jb5Qyy37fdGOTJ6iPYq1y", "trackProgress": "134000", "action": "resume"}' http://localhost:5000/send-emit
//Example pause request
//curl -X POST -H "Content-Type: application/json" -d '{"action": "pause"}' http://localhost:5000/send-emit

server.listen(port, () => {
  console.log(`listening on ${port}`);
});