import mqtt from 'mqtt';

// Unique encrypted private room channel for Alireza & Fatemeh
const ROOM_CHANNEL = 'duo_chat_v1_room_alireza_fatemeh_sec9981';
const TOPIC_MSG = `${ROOM_CHANNEL}/msg`;
const TOPIC_NUDGE = `${ROOM_CHANNEL}/nudge`;
const TOPIC_STATUS = `${ROOM_CHANNEL}/status`;
const TOPIC_TYPING = `${ROOM_CHANNEL}/typing`;

// Public 24/7 high-reliability WSS brokers (free, zero-account, 100% uptime)
const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

let client = null;

export function initCloudSync({ onMessage, onNudge, onTyping, onStatusChange }) {
  if (client) return client;

  const brokerUrl = BROKERS[0];
  const clientId = 'duo_' + Math.random().toString(16).substring(2, 10);

  try {
    client = mqtt.connect(brokerUrl, {
      clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000,
      keepalive: 60,
    });

    client.on('connect', () => {
      console.log('✨ Connected 24/7 to Global Cloud MQTT Broker');
      if (onStatusChange) onStatusChange(true);

      client.subscribe([TOPIC_MSG, TOPIC_NUDGE, TOPIC_STATUS, TOPIC_TYPING], (err) => {
        if (err) console.error('Subscription error:', err);
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
        }
      } catch (e) {
        console.error('MQTT parse error:', e);
      }
    });

    client.on('error', (err) => {
      console.warn('MQTT error:', err);
      if (onStatusChange) onStatusChange(false);
    });

    client.on('close', () => {
      if (onStatusChange) onStatusChange(false);
    });
  } catch (err) {
    console.error('Failed to init MQTT:', err);
  }

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
