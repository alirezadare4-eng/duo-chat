import mqtt from 'mqtt';

const ROOM_CHANNEL = 'duo_chat_v1_room_alireza_fatemeh_sec9981';
const TOPIC_MSG = `${ROOM_CHANNEL}/msg`;
const TOPIC_NUDGE = `${ROOM_CHANNEL}/nudge`;
const TOPIC_STATUS = `${ROOM_CHANNEL}/status`;
const TOPIC_TYPING = `${ROOM_CHANNEL}/typing`;
const TOPIC_MEMORY = `${ROOM_CHANNEL}/memory`;
const TOPIC_PLAYLIST = `${ROOM_CHANNEL}/playlist`;
const TOPIC_DELETE = `${ROOM_CHANNEL}/delete`;

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

let client = null;
let currentBrokerIdx = 0;
let isConnecting = false;

export function initCloudSync({ onMessage, onNudge, onTyping, onMemory, onPlaylist, onDeleteMessage, onStatusChange }) {
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
          TOPIC_DELETE
        ], (err) => {
          if (err) console.error('Sub error:', err);
        });
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          if (topic === TOPIC_MSG && onMessage) {
            onMessage(data);
          } else if (topic === TOPIC_NUDGE && onNudge) {
            onNudge(data);
          } else if (topic === TOPIC_TYPING && onTyping) {
            onTyping(data);
          } else if (topic === TOPIC_MEMORY && onMemory) {
            onMemory(data);
          } else if (topic === TOPIC_PLAYLIST && onPlaylist) {
            onPlaylist(data);
          } else if (topic === TOPIC_DELETE && onDeleteMessage) {
            onDeleteMessage(data);
          }
        } catch (e) {
          console.error('MQTT parse error:', e);
        }
      });

      client.on('error', (err) => {
        console.warn('MQTT error, trying alternative broker...', err);
        isConnecting = false;
        if (onStatusChange) onStatusChange(false);
      });

      client.on('close', () => {
        isConnecting = false;
        if (onStatusChange) onStatusChange(false);
      });

      client.on('offline', () => {
        if (onStatusChange) onStatusChange(false);
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
  if (client && client.connected) {
    client.publish(TOPIC_MEMORY, JSON.stringify(memoryObj), { qos: 1 });
  }
}

export function sendCloudPlaylist(trackObj) {
  if (client && client.connected) {
    client.publish(TOPIC_PLAYLIST, JSON.stringify(trackObj), { qos: 1 });
  }
}

export function sendCloudDelete(messageId) {
  if (client && client.connected) {
    client.publish(TOPIC_DELETE, JSON.stringify({ id: messageId }), { qos: 1 });
  }
}
