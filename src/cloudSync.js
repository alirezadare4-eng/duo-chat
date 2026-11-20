import Gun from 'gun/gun';
import mqtt from 'mqtt';

const ROOM_CHANNEL = 'duo_chat_v1_room_alireza_fatemeh_sec9981';
const TOPIC_MSG = `${ROOM_CHANNEL}/msg`;
const TOPIC_NUDGE = `${ROOM_CHANNEL}/nudge`;
const TOPIC_STATUS = `${ROOM_CHANNEL}/status`;
const TOPIC_TYPING = `${ROOM_CHANNEL}/typing`;
const TOPIC_MEMORY = `${ROOM_CHANNEL}/memory`;
const TOPIC_PLAYLIST = `${ROOM_CHANNEL}/playlist`;
const TOPIC_DELETE = `${ROOM_CHANNEL}/delete`;
const TOPIC_SEEN = `${ROOM_CHANNEL}/seen`;
const TOPIC_PRESENCE = `${ROOM_CHANNEL}/presence`;
const TOPIC_PROFILE = `${ROOM_CHANNEL}/profile`;

// High-speed, low-overhead cloud peers
const GUN_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun'
];

let gunInstance = null;
let gunRoom = null;

function getGunRoom() {
  if (!gunRoom) {
    try {
      gunInstance = Gun({
        peers: GUN_PEERS,
        radisk: false,
        localStorage: false // Don't block localStorage, IndexedDB is handled in db.js
      });
      gunRoom = gunInstance.get(ROOM_CHANNEL);
    } catch (e) {
      console.warn('Gun init error:', e);
    }
  }
  return gunRoom;
}

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

let client = null;
let currentBrokerIdx = 0;
let isConnecting = false;
const processedMsgIds = new Set();
const processedMemIds = new Set();
const processedTrackIds = new Set();

export function initCloudSync({ 
  onMessage, 
  onNudge, 
  onTyping, 
  onMemory, 
  onPlaylist, 
  onDeleteMessage, 
  onSeen,
  onPresence,
  onProfile, 
  onStatusChange 
}) {
  // 1. Initial Cloud Database Catch-up (using .once so it doesn't burn CPU in background)
  const room = getGunRoom();
  if (room) {
    if (onStatusChange) onStatusChange(true);

    // Load stored profiles on startup
    room.get('profiles').map().once((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && onProfile) onProfile(data);
      } catch (e) {}
    });

    // Load stored messages once on startup
    room.get('messages').map().once((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && data.id) {
          if (processedMsgIds.has(data.id)) return;
          processedMsgIds.add(data.id);
          if (onMessage) onMessage({ ...data, isHistorical: true });
        }
      } catch (e) {}
    });

    // Load memories once on startup
    room.get('memories').map().once((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && data.id) {
          if (processedMemIds.has(data.id)) return;
          processedMemIds.add(data.id);
          if (onMemory) onMemory(data);
        }
      } catch (e) {}
    });

    // Load playlist once on startup
    room.get('playlist').map().once((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && data.id) {
          if (processedTrackIds.has(data.id)) return;
          processedTrackIds.add(data.id);
          if (onPlaylist) onPlaylist(data);
        }
      } catch (e) {}
    });
  }

  // 2. Ultra-Lightweight, 0% CPU MQTT for real-time events
  if (client && client.connected) {
    if (onStatusChange) onStatusChange(true);
    return client;
  }

  function connectToBroker(index) {
    if (isConnecting) return;
    isConnecting = true;

    const brokerUrl = BROKERS[index % BROKERS.length];
    const clientId = 'two_souls_' + Math.random().toString(16).substring(2, 10);

    try {
      if (client) {
        try { client.end(true); } catch (e) {}
      }

      client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 5000,
        keepalive: 60,
      });

      client.on('connect', () => {
        isConnecting = false;
        console.log(`✨ Connected to Real-time Broker [${brokerUrl}]`);
        if (onStatusChange) onStatusChange(true);

        client.subscribe([
          TOPIC_MSG, 
          TOPIC_NUDGE, 
          TOPIC_STATUS, 
          TOPIC_TYPING,
          TOPIC_MEMORY,
          TOPIC_PLAYLIST,
          TOPIC_DELETE,
          TOPIC_SEEN,
          TOPIC_PRESENCE,
          TOPIC_PROFILE
        ], (err) => {
          if (err) console.error('Sub error:', err);
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          if (topic === TOPIC_MSG && onMessage) {
            if (data && data.id) {
              if (processedMsgIds.has(data.id)) return;
              processedMsgIds.add(data.id);
              onMessage({ ...data, isHistorical: false });
            }
          } else if (topic === TOPIC_NUDGE && onNudge) {
            onNudge(data);
          } else if (topic === TOPIC_TYPING && onTyping) {
            onTyping(data);
          } else if (topic === TOPIC_MEMORY && onMemory) {
            if (data && data.id && !processedMemIds.has(data.id)) {
              processedMemIds.add(data.id);
              onMemory(data);
            }
          } else if (topic === TOPIC_PLAYLIST && onPlaylist) {
            if (data && data.id && !processedTrackIds.has(data.id)) {
              processedTrackIds.add(data.id);
              onPlaylist(data);
            }
          } else if (topic === TOPIC_DELETE && onDeleteMessage) {
            onDeleteMessage(data);
          } else if (topic === TOPIC_SEEN && onSeen) {
            onSeen(data);
          } else if (topic === TOPIC_PRESENCE && onPresence) {
            onPresence(data);
          } else if (topic === TOPIC_PROFILE && onProfile) {
            onProfile(data);
          }
        } catch (e) {
          console.error('MQTT parse error:', e);
        }
      });

      client.on('error', () => {
        isConnecting = false;
        currentBrokerIdx = (currentBrokerIdx + 1) % BROKERS.length;
        setTimeout(() => connectToBroker(currentBrokerIdx), 5000);
      });

      client.on('close', () => {
        isConnecting = false;
      });

      client.on('offline', () => {
        if (!room && onStatusChange) onStatusChange(false);
      });
    } catch (err) {
      isConnecting = false;
      console.error('Broker connect error:', err);
    }
  }

  connectToBroker(currentBrokerIdx);
  return client;
}

export function sendCloudMessage(messageObj) {
  if (messageObj && messageObj.id) {
    processedMsgIds.add(messageObj.id);
  }
  // 1. Store in Cloud Database
  const room = getGunRoom();
  if (room && messageObj && messageObj.id) {
    try {
      room.get('messages').get(messageObj.id).put(JSON.stringify(messageObj));
    } catch (e) {}
  }

  // 2. Broadcast via MQTT (instant <50ms delivery)
  if (client && client.connected) {
    client.publish(TOPIC_MSG, JSON.stringify(messageObj), { qos: 1 });
  }
}

export function sendCloudNudge(sender) {
  if (client && client.connected) {
    client.publish(TOPIC_NUDGE, JSON.stringify({ sender }), { qos: 1 });
  }
}

export function sendCloudTyping(sender) {
  if (client && client.connected) {
    client.publish(TOPIC_TYPING, JSON.stringify({ sender }), { qos: 0 });
  }
}

export function sendCloudMemory(memoryObj) {
  if (memoryObj && memoryObj.id) {
    processedMemIds.add(memoryObj.id);
  }
  const room = getGunRoom();
  if (room && memoryObj && memoryObj.id) {
    try {
      room.get('memories').get(memoryObj.id).put(JSON.stringify(memoryObj));
    } catch (e) {}
  }
  if (client && client.connected) {
    client.publish(TOPIC_MEMORY, JSON.stringify(memoryObj), { qos: 1 });
  }
}

export function sendCloudPlaylist(trackObj) {
  if (trackObj && trackObj.id) {
    processedTrackIds.add(trackObj.id);
  }
  const room = getGunRoom();
  if (room && trackObj && trackObj.id) {
    try {
      room.get('playlist').get(trackObj.id).put(JSON.stringify(trackObj));
    } catch (e) {}
  }
  if (client && client.connected) {
    client.publish(TOPIC_PLAYLIST, JSON.stringify(trackObj), { qos: 1 });
  }
}

export function sendCloudDelete(messageIdOrData) {
  const payload = typeof messageIdOrData === 'object' ? messageIdOrData : { id: messageIdOrData };
  const room = getGunRoom();
  if (room && payload.id) {
    try {
      room.get('messages').get(payload.id).put(null);
    } catch (e) {}
  }
  if (client && client.connected) {
    client.publish(TOPIC_DELETE, JSON.stringify(payload), { qos: 1 });
  }
}

export function sendCloudSeen(seenData) {
  if (client && client.connected) {
    client.publish(TOPIC_SEEN, JSON.stringify(seenData), { qos: 1 });
  }
}

export function sendCloudPresence(presenceData) {
  if (client && client.connected) {
    client.publish(TOPIC_PRESENCE, JSON.stringify(presenceData), { qos: 0 });
  }
}

export function sendCloudProfile(profileData) {
  const room = getGunRoom();
  if (room && profileData && profileData.user) {
    try {
      room.get('profiles').get(profileData.user).put(JSON.stringify(profileData));
    } catch (e) {}
  }
  if (client && client.connected) {
    client.publish(TOPIC_PROFILE, JSON.stringify(profileData), { qos: 1 });
  }
}
