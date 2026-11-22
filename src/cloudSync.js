import mqtt from 'mqtt';
import { getSupabase } from './supabase';

const ROOM_CHANNEL = 'duo_chat_v1_room_alireza_fatemeh_sec9981';
const NTFY_TOPIC = ROOM_CHANNEL;
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

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
const TOPIC_TOGETHER = `${ROOM_CHANNEL}/together`;
const TOPIC_CALL = `${ROOM_CHANNEL}/call`;

const BROKER_SERVERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];
let currentBrokerIdx = 0;
let consecutiveFails = 0;

let client = null;
let eventSource = null;
let isConnecting = false;
let callbacks = {};
const processedMsgIds = new Set();
const processedEvents = new Map(); // key -> timestamp

// Outbound queue for offline resilience
const outboxQueue = [];

function isEventProcessed(key, windowMs = 5000) {
  const now = Date.now();
  if (processedEvents.has(key)) {
    const prev = processedEvents.get(key);
    if (now - prev < windowMs) return true;
  }
  processedEvents.set(key, now);
  // Clean old entries
  if (processedEvents.size > 1000) {
    for (const [k, ts] of processedEvents.entries()) {
      if (now - ts > 30000) processedEvents.delete(k);
    }
  }
  return false;
}

// ---------------------------------------------------------
// Dispatches incoming events to App.jsx with deduplication
// ---------------------------------------------------------
function routeEvent(type, payload, isHistorical = false) {
  if (!payload) return;

  // Ephemeral realtime events must NEVER be replayed from history
  if (isHistorical && (type === 'presence' || type === 'typing' || type === 'nudge' || type === 'call')) {
    return;
  }

  switch (type) {
    case 'msg': {
      if (!payload.id) return;
      if (processedMsgIds.has(payload.id)) return;
      processedMsgIds.add(payload.id);
      if (callbacks.onMessage) callbacks.onMessage({ ...payload, isHistorical });
      break;
    }
    case 'nudge': {
      const key = `nudge_${payload.sender}_${Math.floor(Date.now() / 2000)}`;
      if (isEventProcessed(key, 2000)) return;
      if (callbacks.onNudge) callbacks.onNudge(payload);
      break;
    }
    case 'typing': {
      if (callbacks.onTyping) callbacks.onTyping(payload);
      break;
    }
    case 'memory': {
      if (payload.id && processedMsgIds.has('mem_' + payload.id)) return;
      if (payload.id) processedMsgIds.add('mem_' + payload.id);
      if (callbacks.onMemory) callbacks.onMemory(payload);
      break;
    }
    case 'playlist': {
      if (payload.id && processedMsgIds.has('pl_' + payload.id)) return;
      if (payload.id) processedMsgIds.add('pl_' + payload.id);
      if (callbacks.onPlaylist) callbacks.onPlaylist(payload);
      break;
    }
    case 'delete': {
      if (callbacks.onDeleteMessage) callbacks.onDeleteMessage(payload);
      break;
    }
    case 'seen': {
      const key = `seen_${payload.reader}_${JSON.stringify(payload.messageIds)}_${Math.floor(Date.now() / 1500)}`;
      if (isEventProcessed(key, 1500)) return;
      if (callbacks.onSeen) callbacks.onSeen(payload);
      break;
    }
    case 'presence': {
      if (callbacks.onPresence) callbacks.onPresence(payload);
      break;
    }
    case 'profile': {
      if (callbacks.onProfile) callbacks.onProfile(payload);
      break;
    }
    case 'together': {
      if (callbacks.onTogetherAction) callbacks.onTogetherAction(payload);
      break;
    }
    case 'call': {
      if (callbacks.onCall) callbacks.onCall(payload);
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------
// Catch up on missed messages from Ntfy buffer (last 12h)
// ---------------------------------------------------------
async function pollNtfyHistory() {
  try {
    const res = await fetch(`${NTFY_URL}/json?poll=1&since=12h`);
    if (!res.ok) return;
    const text = await res.text();
    const lines = text.trim().split('\n');
    for (const line of lines) {
      if (!line) continue;
      try {
        const item = JSON.parse(line);
        if (item.event === 'message' && item.message) {
          const parsed = JSON.parse(item.message);
          if (parsed && parsed.event && parsed.data) {
            routeEvent(parsed.event, parsed.data, true);
          }
        }
      } catch (err) {}
    }
  } catch (err) {
    // Network offline or polling failed, non-blocking
  }
}

// ---------------------------------------------------------
// Catch up from Supabase (if user enabled it)
// ---------------------------------------------------------
async function syncFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(300);

    if (!error && Array.isArray(msgs)) {
      for (const row of msgs) {
        if (row && row.id && !processedMsgIds.has(row.id)) {
          processedMsgIds.add(row.id);
          const fullMsg = {
            id: row.id,
            sender: row.sender,
            text: row.text,
            type: row.type || 'text',
            time: row.time,
            timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            seen: row.seen || false,
            ...(row.meta || {})
          };
          if (callbacks.onMessage) callbacks.onMessage({ ...fullMsg, isHistorical: true });
        }
      }
    }
  } catch (err) {
    console.warn('Supabase catch-up error:', err);
  }
}

// ---------------------------------------------------------
// Connect Ntfy SSE Stream (Port 443 HTTPS - Ultra-Reliable)
// ---------------------------------------------------------
function initNtfySSE() {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') return;

  try {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    eventSource = new EventSource(`${NTFY_URL}/sse`);

    eventSource.onopen = () => {
      if (callbacks.onStatusChange) callbacks.onStatusChange(true);
    };

    eventSource.onmessage = (e) => {
      if (!e || !e.data) return;
      try {
        const item = JSON.parse(e.data);
        if (item.event === 'message' && item.message) {
          const parsed = JSON.parse(item.message);
          if (parsed && parsed.event && parsed.data) {
            routeEvent(parsed.event, parsed.data, false);
          }
        }
      } catch (err) {}
    };

    eventSource.onerror = () => {
      // EventSource auto-retries in browsers
    };
  } catch (e) {
    console.warn('Ntfy SSE error:', e);
  }
}

// ---------------------------------------------------------
// Connect MQTT Broker (High-speed instant delivery with Auto-Failover)
// ---------------------------------------------------------
function initMqtt() {
  if (client && client.connected) return;

  const clientId = 'two_souls_' + Math.random().toString(16).substring(2, 10);
  const targetBroker = BROKER_SERVERS[currentBrokerIdx];

  try {
    if (client) {
      try { client.end(true); } catch (e) {}
      client = null;
    }

    client = mqtt.connect(targetBroker, {
      clientId,
      clean: true,
      connectTimeout: 7000,
      reconnectPeriod: 3000,
      keepalive: 45,
    });

    client.on('connect', () => {
      consecutiveFails = 0;
      isConnecting = false;
      if (callbacks.onStatusChange) callbacks.onStatusChange(true);

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
        TOPIC_PROFILE,
        TOPIC_TOGETHER,
        TOPIC_CALL
      ], { qos: 1 });

      // Flush outbox queue
      while (outboxQueue.length > 0) {
        const item = outboxQueue.shift();
        if (item && item.topic && item.payload) {
          client.publish(item.topic, item.payload, { qos: 1 });
        }
      }
    });

    client.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        if (topic === TOPIC_MSG) routeEvent('msg', data, false);
        else if (topic === TOPIC_NUDGE) routeEvent('nudge', data, false);
        else if (topic === TOPIC_TYPING) routeEvent('typing', data, false);
        else if (topic === TOPIC_MEMORY) routeEvent('memory', data, false);
        else if (topic === TOPIC_PLAYLIST) routeEvent('playlist', data, false);
        else if (topic === TOPIC_DELETE) routeEvent('delete', data, false);
        else if (topic === TOPIC_SEEN) routeEvent('seen', data, false);
        else if (topic === TOPIC_PRESENCE) routeEvent('presence', data, false);
        else if (topic === TOPIC_PROFILE) routeEvent('profile', data, false);
        else if (topic === TOPIC_TOGETHER) routeEvent('together', data, false);
        else if (topic === TOPIC_CALL) routeEvent('call', data, false);
      } catch (err) {}
    });

    client.on('error', () => {
      consecutiveFails++;
      if (consecutiveFails >= 2) {
        currentBrokerIdx = (currentBrokerIdx + 1) % BROKER_SERVERS.length;
        consecutiveFails = 0;
        setTimeout(() => initMqtt(), 2000);
      }
    });

    client.on('offline', () => {
      // Ntfy SSE stays active as fallback
    });
  } catch (err) {
    console.warn('MQTT init error:', err);
  }
}

// ---------------------------------------------------------
// Broadcaster: Broadcasts across MQTT + Ntfy + Supabase
// ---------------------------------------------------------
async function broadcast(eventType, mqttTopic, data, options = { qos: 1, bufferInNtfy: true }) {
  const jsonStr = JSON.stringify(data);

  // 1. Send via MQTT if connected, or queue for when reconnecting
  if (client && client.connected) {
    client.publish(mqttTopic, jsonStr, { qos: options.qos ?? 1 });
  } else if (eventType === 'msg' || eventType === 'memory' || eventType === 'playlist' || eventType === 'seen') {
    outboxQueue.push({ topic: mqttTopic, payload: jsonStr });
  }

  // 2. Send via Ntfy HTTP relay (always over HTTPS Port 443)
  if (options.bufferInNtfy !== false) {
    try {
      fetch(NTFY_URL, {
        method: 'POST',
        body: JSON.stringify({ event: eventType, data })
      }).catch(() => {});
    } catch (e) {}
  }

  // 3. Send via Supabase if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      if (eventType === 'msg' && data.id) {
        supabase.from('messages').upsert({
          id: data.id,
          sender: data.sender,
          text: data.text || '',
          type: data.type || 'text',
          time: data.time || '',
          seen: !!data.seen
        }).catch(() => {});
      }
    } catch (e) {}
  }
}

// ---------------------------------------------------------
// Main Initializer
// ---------------------------------------------------------
export function initCloudSync(cbs) {
  callbacks = cbs || {};

  // 1. Initial catch-up from Ntfy buffer & Supabase
  pollNtfyHistory();
  syncFromSupabase();

  // 2. Start Ntfy Realtime SSE (HTTPS 443)
  initNtfySSE();

  // 3. Start MQTT (WebSocket)
  initMqtt();

  // Periodic resync check every 45s to ensure nothing was missed
  const intervalId = setInterval(() => {
    pollNtfyHistory();
  }, 45000);

  return {
    disconnect: () => {
      clearInterval(intervalId);
      if (client) {
        try { client.end(true); } catch (e) {}
      }
      if (eventSource) {
        try { eventSource.close(); } catch (e) {}
      }
    }
  };
}

// ---------------------------------------------------------
// Exported Action Methods
// ---------------------------------------------------------
export function sendCloudMessage(messageObj) {
  if (messageObj && messageObj.id) {
    processedMsgIds.add(messageObj.id);
  }
  broadcast('msg', TOPIC_MSG, messageObj, { qos: 1, bufferInNtfy: true });
}

export function sendCloudNudge(sender) {
  broadcast('nudge', TOPIC_NUDGE, { sender }, { qos: 1, bufferInNtfy: true });
}

export function sendCloudTyping(sender) {
  // Typing is transient, no need to buffer in Ntfy
  broadcast('typing', TOPIC_TYPING, { sender }, { qos: 0, bufferInNtfy: false });
}

export function sendCloudMemory(memoryObj) {
  if (memoryObj && memoryObj.id) {
    processedMsgIds.add('mem_' + memoryObj.id);
  }
  broadcast('memory', TOPIC_MEMORY, memoryObj, { qos: 1, bufferInNtfy: true });
}

export function sendCloudPlaylist(trackObj) {
  if (trackObj && trackObj.id) {
    processedMsgIds.add('pl_' + trackObj.id);
  }
  broadcast('playlist', TOPIC_PLAYLIST, trackObj, { qos: 1, bufferInNtfy: true });
}

export function sendCloudDelete(messageIdOrData) {
  const payload = typeof messageIdOrData === 'object' ? messageIdOrData : { id: messageIdOrData };
  broadcast('delete', TOPIC_DELETE, payload, { qos: 1, bufferInNtfy: true });
}

export function sendCloudSeen(seenData) {
  broadcast('seen', TOPIC_SEEN, seenData, { qos: 1, bufferInNtfy: true });
}

export function sendCloudPresence(presenceData) {
  // Presence: Instant realtime signal only; never buffer in Ntfy history to avoid ghost online status
  broadcast('presence', TOPIC_PRESENCE, presenceData, { qos: 0, bufferInNtfy: false });
}

export function sendCloudProfile(profileData) {
  broadcast('profile', TOPIC_PROFILE, profileData, { qos: 1, bufferInNtfy: true });
}

export function sendCloudTogetherAction(actionData) {
  broadcast('together', TOPIC_TOGETHER, actionData, { qos: 1, bufferInNtfy: true });
}

export function sendCloudCall(callData) {
  broadcast('call', TOPIC_CALL, callData, { qos: 1, bufferInNtfy: false });
}
