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

// Standard HTTPS/WSS Port 443 GunDB Cloud Relays
const GUN_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wallie.io/gun',
  'https://relay.peer.ooo/gun',
  'https://gunjs.herokuapp.com/gun'
];

let gunInstance = null;
let gunRoom = null;

function getGunRoom() {
  if (!gunRoom) {
    try {
      gunInstance = Gun({
        peers: GUN_PEERS,
        localStorage: true
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
  onStatusChange 
}) {
  // 1. Initialize Gun Cloud Database
  const room = getGunRoom();
  if (room) {
    if (onStatusChange) onStatusChange(true);

    // Sync historical and new messages from Cloud Database
    room.get('messages').map().on((jsonStr, id) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && data.id) {
          if (processedMsgIds.has(data.id)) return;
          processedMsgIds.add(data.id);
          if (onMessage) onMessage(data);
        }
      } catch (e) {
        console.error('Gun msg parse error:', e);
      }
    });

    // Real-time Presence
    room.get('presence').map().on((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && onPresence) onPresence(data);
      } catch (e) {}
    });

    // Nudges
    room.get('nudge').on((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && onNudge) onNudge(data);
      } catch (e) {}
    });

    // Typing status
    room.get('typing').on((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && onTyping) onTyping(data);
      } catch (e) {}
    });

    // Seen status
    room.get('seen').on((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && onSeen) onSeen(data);
      } catch (e) {}
    });

    // Memories
    room.get('memories').map().on((jsonStr) => {
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

    // Shared Playlist
    room.get('playlist').map().on((jsonStr) => {
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

    // Message Deletions
    room.get('delete').on((jsonStr) => {
      if (!jsonStr) return;
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (data && onDeleteMessage) onDeleteMessage(data);
      } catch (e) {}
    });
  }

  // 2. High-speed MQTT backup channel
  if (client && client.connected) {
    if (onStatusChange) onStatusChange(true);
    return client;
  }

  function connectToBroker(index) {
    if (isConnecting) return;
    isConnecting = true;

    const brokerUrl = BROKERS[index % BROKERS.length];
    const clientId = 'duo_' + Math.random().toString(16).substring(2, 10);

    try {
      if (client) {
        try { client.end(true); } catch (e) {}
      }

      client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 4000,
        keepalive: 60,
      });

      client.on('connect', () => {
        isConnecting = false;
        console.log(`✨ Connected to Cloud Broker [${brokerUrl}]`);
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
          TOPIC_PRESENCE
        ], (err) => {
          if (err) console.error('Sub error:', err);
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          if (topic === TOPIC_MSG && onMessage) {
            if (data && data.id && !processedMsgIds.has(data.id)) {
              processedMsgIds.add(data.id);
              onMessage(data);
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
          }
        } catch (e) {
          console.error('MQTT parse error:', e);
        }
      });

      client.on('error', () => {
        isConnecting = false;
        currentBrokerIdx = (currentBrokerIdx + 1) % BROKERS.length;
        setTimeout(() => connectToBroker(currentBrokerIdx), 4000);
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
  // 1. Store permanently in Cloud Database (Gun)
  const room = getGunRoom();
  if (room && messageObj && messageObj.id) {
    room.get('messages').get(messageObj.id).put(JSON.stringify(messageObj));
  }

  // 2. Broadcast via MQTT
  if (client && client.connected) {
    client.publish(TOPIC_MSG, JSON.stringify(messageObj), { qos: 1 });
  }
}

export function sendCloudNudge(sender) {
  const room = getGunRoom();
  if (room) {
    room.get('nudge').put(JSON.stringify({ sender, timestamp: Date.now() }));
  }
  if (client && client.connected) {
    client.publish(TOPIC_NUDGE, JSON.stringify({ sender }), { qos: 1 });
  }
}

export function sendCloudTyping(sender) {
  const room = getGunRoom();
  if (room) {
    room.get('typing').put(JSON.stringify({ sender, timestamp: Date.now() }));
  }
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
    room.get('memories').get(memoryObj.id).put(JSON.stringify(memoryObj));
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
    room.get('playlist').get(trackObj.id).put(JSON.stringify(trackObj));
  }
  if (client && client.connected) {
    client.publish(TOPIC_PLAYLIST, JSON.stringify(trackObj), { qos: 1 });
  }
}

export function sendCloudDelete(messageIdOrData) {
  const payload = typeof messageIdOrData === 'object' ? messageIdOrData : { id: messageIdOrData };
  const room = getGunRoom();
  if (room) {
    if (payload.id) {
      room.get('messages').get(payload.id).put(null);
    }
    room.get('delete').put(JSON.stringify(payload));
  }
  if (client && client.connected) {
    client.publish(TOPIC_DELETE, JSON.stringify(payload), { qos: 1 });
  }
}

export function sendCloudSeen(seenData) {
  const room = getGunRoom();
  if (room) {
    room.get('seen').put(JSON.stringify(seenData));
  }
  if (client && client.connected) {
    client.publish(TOPIC_SEEN, JSON.stringify(seenData), { qos: 1 });
  }
}

export function sendCloudPresence(presenceData) {
  const room = getGunRoom();
  if (room && presenceData && presenceData.user) {
    room.get('presence').get(presenceData.user).put(JSON.stringify(presenceData));
  }
  if (client && client.connected) {
    client.publish(TOPIC_PRESENCE, JSON.stringify(presenceData), { qos: 0 });
  }
}
