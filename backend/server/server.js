const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.get('/', (req, res) => {
  res.send('Socket.IO server is running');
});

//Keep track of room and users
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  //Join room
  socket.on('join-room', ({ roomId }) => {
    console.log(`${socket.id} want to join room: ${roomId}`);
    //so if the room doesn't have key of the following roomId it will add one
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    //room cannot more then 10 user
    if (rooms[roomId].length >= 10) {
      socket.emit('room-full');
    }
    //adding user to the room
    rooms[roomId].push(socket.id);
    socket.join(roomId);
    socket.emit('joined-room');

    // so this portion checks if this other user's socket id is in the room or not
    const otherUser = rooms[roomId].find((id) => id !== socket.id);
    if (otherUser) {
      socket.to(otherUser).emit('user-joined', { socketId: socket.id });
      console.log('user joined the room');
    }
  });

  // Handle Offer
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  //Handle ICE candidates
  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  //Handle Disconnect
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
    console.log(`Disconnect: ${socket.id}`);
  });
});

server.listen(8080, () => {
  console.log('Socket.IO server is listening on port 8080');
});
