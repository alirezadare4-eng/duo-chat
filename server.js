import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB for voice notes and photos
});

const DB_FILE = path.join(__dirname, 'messages.json');

// Helper to load and save messages
function getStoredMessages() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveMessage(msg) {
  try {
    const list = getStoredMessages();
    list.push(msg);
    // Keep last 1000 messages
    if (list.length > 1000) list.shift();
    fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Save error:', e);
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve frontend static build if exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Connected users mapping
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('register_user', (userId) => {
    onlineUsers.set(socket.id, userId);
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('send_message', (msg) => {
    saveMessage(msg);
    // Broadcast message to the partner
    socket.broadcast.emit('receive_message', msg);
  });

  socket.on('send_nudge', (sender) => {
    socket.broadcast.emit('receive_nudge', sender);
  });

  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    if (userId) {
      io.emit('user_status', { userId, status: 'offline' });
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Duo-Chat server is running on http://localhost:${PORT}`);
});
