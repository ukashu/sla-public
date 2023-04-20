const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { errorHandler } = require('./middleware/errorMiddleware');

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

    socket.on('join',(room) => {socket.join(room)})
  });

//pass io to routes
app.use((req, res, next) => {
  req.io = io;
  return next();
});

app.use('/api/session', require('./routes/sessionRoutes.js'))

//TODO endpoint for those joining to get the current track and play it
//Example resume request
//curl -X PUT -H "Content-Type: application/json" -d '{"trackURI": "spotify:track:2Jb5Qyy37fdGOTJ6iPYq1y", "trackProgress": "134000", "action": "resume"}' http://localhost:5000/api/session
//Example pause request
//curl -X PUT -H "Content-Type: application/json" -d '{"action": "pause"}' http://localhost:5000/api/session

app.use(errorHandler);

server.listen(port, () => {
  console.log(`listening on ${port}`);
});