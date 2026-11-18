import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Heart, 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Palette, 
  Play, 
  Pause, 
  ShieldCheck, 
  Settings, 
  X, 
  Type, 
  Upload, 
  RotateCcw, 
  Check, 
  Phone, 
  LogOut, 
  Calendar, 
  Trash2, 
  MessageCircle, 
  BookHeart, 
  Music, 
  Plus, 
  SkipForward, 
  SkipBack, 
  Clock, 
  Flame, 
  Eye, 
  Lock,
  Reply,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { 
  initCloudSync, 
  sendCloudMessage, 
  sendCloudNudge, 
  sendCloudTyping, 
  sendCloudMemory, 
  sendCloudPlaylist,
  sendCloudDelete 
} from './cloudSync';
import { compressImage, generateMessageId, formatSeconds } from './utils';
import { getAllFromStore, saveToStore, deleteFromStore, clearStore } from './db';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.'));

const socket = isLocal ? io(window.location.origin, {
  autoConnect: true,
  reconnectionAttempts: 5,
  timeout: 3000,
}) : {
  on: () => {},
  off: () => {},
  emit: () => {}
};

const THEMES = [
  { id: 'velvet', name: 'مخملی شب', bg: '#0d0915', a1: 'bg-pink-600/40', a2: 'bg-purple-700/35', a3: 'bg-indigo-600/30' },
  { id: 'emerald', name: 'زمردی تیره', bg: '#06130e', a1: 'bg-emerald-600/40', a2: 'bg-teal-700/35', a3: 'bg-cyan-600/30' },
  { id: 'rose', name: 'رز ارغوانی', bg: '#170912', a1: 'bg-rose-600/40', a2: 'bg-pink-700/35', a3: 'bg-purple-600/30' },
  { id: 'amoled', name: 'مشکی خالص', bg: '#000000', a1: 'bg-neutral-800/20', a2: 'bg-neutral-900/30', a3: 'bg-zinc-800/20' }
];

const FONTS = [
  { id: 'font-vazir', name: 'وزیرمتن (مدرن)', preview: 'سلام عزیزم' },
  { id: 'font-rubik', name: 'روبیک (گرد و صمیمی)', preview: 'دوستت دارم' },
  { id: 'font-markazi', name: 'مرکزی (کلاسیک)', preview: 'خاطرات شیرین' },
  { id: 'font-lalezar', name: 'لاله‌زار (فانتزی)', preview: 'عشق من' },
  { id: 'font-system', name: 'فونت سیستم', preview: 'چت دونفره' }
];

const TIMER_OPTIONS = [
  { label: 'دائمی', value: 0, icon: '♾️' },
  { label: 'یک‌بار مصرف', value: 'once', icon: '👁️' },
  { label: '۵ ثانیه', value: 5, icon: '⏱️' },
  { label: '۱۰ ثانیه', value: 10, icon: '⏱️' },
  { label: '۳۰ ثانیه', value: 30, icon: '⏱️' },
  { label: '۱ دقیقه', value: 60, icon: '⏱️' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  // Authentication
  const [myPhone, setMyPhone] = useState(() => localStorage.getItem('duo_my_phone') || '');
  const [user, setUser] = useState(() => localStorage.getItem('duo_user') || '');

  // Relationship Start Date
  const [startDate, setStartDate] = useState(() => localStorage.getItem('duo_start_date') || '');

  // Login inputs
  const [loginInput, setLoginInput] = useState('');
  const [selectedRoleOnLogin, setSelectedRoleOnLogin] = useState('alireza');
  const [loginError, setLoginError] = useState('');

  // Customization
  const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('duo_font') || 'font-vazir');
  const [themeIdx, setThemeIdx] = useState(() => Number(localStorage.getItem('duo_theme_idx')) || 0);
  const [customBg, setCustomBg] = useState(() => localStorage.getItem('duo_custom_bg') || null);
  const [bgDim, setBgDim] = useState(() => Number(localStorage.getItem('duo_bg_dim')) || 65);
  const [showSettings, setShowSettings] = useState(false);
  const [cloudOnline, setCloudOnline] = useState(false);

  // Live Partner Typing Status
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Chat Audio Playback
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const currentAudioRef = useRef(null);

  // Recording State & Timer
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef(null);

  // Messages (IndexedDB)
  const [messages, setMessages] = useState([]);

  // Disappearing Photo Send Modal
  const [pendingImage, setPendingImage] = useState(null);
  const [selectedTimer, setSelectedTimer] = useState(0); // 0 = permanent

  // Disappearing Photo Fullscreen Viewer
  const [activeViewingPhoto, setActiveViewingPhoto] = useState(null);
  const [viewRemainingSeconds, setViewRemainingSeconds] = useState(0);
  const viewCountdownRef = useRef(null);

  // Memories Diary State (IndexedDB)
  const [memories, setMemories] = useState([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemDate, setNewMemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newMemDesc, setNewMemDesc] = useState('');
  const [newMemMedia, setNewMemMedia] = useState(null);
  const [newMemMediaType, setNewMemMediaType] = useState('image');

  // Couple's Playlist State (IndexedDB)
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const musicAudioRef = useRef(null);

  const [inputVal, setInputVal] = useState('');
  const [nudgeAlert, setNudgeAlert] = useState(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Message Actions (Reply, Delete, Long-Press)
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const longPressTimerRef = useRef(null);
  const textInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const memoryMediaInputRef = useRef(null);
  const songInputRef = useRef(null);
  const audioContextRef = useRef(null);

  const playChime = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  // Load initial data from IndexedDB
  useEffect(() => {
    getAllFromStore('messages').then((items) => setMessages(items || []));
    getAllFromStore('memories').then((items) => setMemories(items || []));
    getAllFromStore('playlist').then((items) => {
      if (items && items.length > 0) {
        setPlaylist(items);
      } else {
        const defaultTracks = [
          {
            id: 'sample_1',
            title: 'بارون',
            artist: 'شادمهر عقیلی',
            src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-piano-112199.mp3',
            addedBy: 'علیرضا'
          },
          {
            id: 'sample_2',
            title: 'نفس',
            artist: 'موزیک عاشقانه ما',
            src: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=gentle-acoustic-guitar-110241.mp3',
            addedBy: 'فاطمه'
          }
        ];
        setPlaylist(defaultTracks);
        defaultTracks.forEach((t) => saveToStore('playlist', t));
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('duo_user', user);
      socket.emit('register_user', user);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('duo_font', selectedFont);
  }, [selectedFont]);

  useEffect(() => {
    localStorage.setItem('duo_theme_idx', themeIdx);
  }, [themeIdx]);

  useEffect(() => {
    if (customBg) {
      localStorage.setItem('duo_custom_bg', customBg);
    } else {
      localStorage.removeItem('duo_custom_bg');
    }
  }, [customBg]);

  useEffect(() => {
    localStorage.setItem('duo_bg_dim', bgDim);
  }, [bgDim]);

  useEffect(() => {
    if (startDate) {
      localStorage.setItem('duo_start_date', startDate);
    } else {
      localStorage.removeItem('duo_start_date');
    }
  }, [startDate]);

  // Connect 24/7 Global Cloud Sync
  useEffect(() => {
    if (!user) return;

    initCloudSync({
      onStatusChange: (status) => {
        setCloudOnline(status);
      },
      onMessage: (msg) => {
        if (msg.sender !== user) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            saveToStore('messages', msg);
            return [...prev, msg];
          });
          playChime();
          if ('vibrate' in navigator) navigator.vibrate(200);
        }
      },
      onNudge: ({ sender }) => {
        if (sender !== user) {
          setNudgeAlert(`${sender === 'alireza' ? 'علیرضا' : 'فاطمه'} برات تپش قلب فرستاد! 💓`);
          setShowHeartBurst(true);
          playChime();
          if ('vibrate' in navigator) navigator.vibrate([150, 80, 150, 80, 400]);
          setTimeout(() => setShowHeartBurst(false), 1200);
          setTimeout(() => setNudgeAlert(null), 4000);
        }
      },
      onTyping: ({ sender }) => {
        if (sender !== user) {
          setPartnerIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setPartnerIsTyping(false);
          }, 3000);
        }
      },
      onMemory: (mem) => {
        setMemories((prev) => {
          if (prev.some((m) => m.id === mem.id)) return prev;
          saveToStore('memories', mem);
          return [mem, ...prev];
        });
        playChime();
        setNudgeAlert(`یک خاطره جدید دونفره ثبت شد! 📖✨`);
        setTimeout(() => setNudgeAlert(null), 3500);
      },
      onPlaylist: (track) => {
        setPlaylist((prev) => {
          if (prev.some((t) => t.id === track.id)) return prev;
          saveToStore('playlist', track);
          return [...prev, track];
        });
        playChime();
        setNudgeAlert(`آهنگ «${track.title}» به پلی‌لیست مشترک اضافه شد! 🎵`);
        setTimeout(() => setNudgeAlert(null), 3500);
      },
      onDeleteMessage: ({ id, forBoth, action }) => {
        if (action === 'delete' || forBoth) {
          // Permanent deletion requested
          setMessages((prev) => prev.filter((m) => m.id !== id));
          deleteFromStore('messages', id);
        } else {
          // Timed photo expired
          setMessages((prev) => 
            prev.map((m) => {
              if (m.id === id) {
                const updated = { ...m, expired: true, text: '' };
                saveToStore('messages', updated);
                return updated;
              }
              return m;
            })
          );
        }
      }
    });
  }, [user]);

  const calculateRealDays = () => {
    if (!startDate) return null;
    try {
      const start = new Date(startDate);
      const now = new Date();
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch (e) {
      return null;
    }
  };

  const realDays = calculateRealDays();

  const handleLogin = (e) => {
    e.preventDefault();
    const phone = loginInput.trim();
    if (!phone || phone.length < 10) {
      setLoginError('لطفاً شماره موبایل معتبر خود را وارد کنید.');
      return;
    }

    const currentRole = selectedRoleOnLogin;
    localStorage.setItem('duo_my_phone', phone);
    localStorage.setItem('duo_user', currentRole);
    setMyPhone(phone);
    setUser(currentRole);
    setLoginError('');
  };

  const handleLogout = () => {
    if (confirm('آیا می‌خواهید از حساب خارج شوید و شماره را تغییر دهید؟')) {
      localStorage.removeItem('duo_my_phone');
      localStorage.removeItem('duo_user');
      setMyPhone('');
      setUser('');
      setShowSettings(false);
    }
  };

  const partnerName = user === 'alireza' ? 'فاطمه من' : 'علیرضای من';
  const partnerInitial = user === 'alireza' ? 'ف' : 'ع';

  const handleInputChange = (e) => {
    setInputVal(e.target.value);
    sendCloudTyping(user);
  };

  const sendMessage = async (type = 'text', content = '', meta = {}) => {
    const textToSend = content || inputVal.trim();
    if (!textToSend && type === 'text') return;

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    let replyData = null;
    if (meta.replyTo) {
      replyData = meta.replyTo;
    } else if (replyingTo) {
      const snippet = replyingTo.type === 'text'
        ? (replyingTo.text.length > 50 ? replyingTo.text.substring(0, 50) + '...' : replyingTo.text)
        : (replyingTo.type === 'audio' ? '🎵 پیام صوتی' : (replyingTo.type === 'timed_image' ? '⏳ عکس محوشونده' : '🖼️ عکس'));

      replyData = {
        id: replyingTo.id,
        sender: replyingTo.sender,
        text: snippet
      };
    }

    const newMsg = {
      id: generateMessageId(),
      sender: user,
      text: textToSend,
      time: timeStr,
      type,
      ...(replyData ? { replyTo: replyData } : {}),
      ...meta
    };

    setMessages((prev) => [...prev, newMsg]);
    await saveToStore('messages', newMsg);
    if (type === 'text') setInputVal('');
    setReplyingTo(null);

    sendCloudMessage(newMsg);
    socket.emit('send_message', newMsg);
  };

  // Long-press detection for touch devices
  const handleMessageTouchStart = (msg) => {
    longPressTimerRef.current = setTimeout(() => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (e) {}
      }
      setSelectedMsgForMenu(msg);
      setShowDeleteConfirm(false);
    }, 450);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMessageTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteMessage = async (msgId, forBoth = false) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    await deleteFromStore('messages', msgId);

    if (forBoth) {
      sendCloudDelete({ id: msgId, forBoth: true, action: 'delete' });
      socket.emit('delete_message', { id: msgId, forBoth: true });
      setNudgeAlert('پیام برای هر دو نفر حذف شد 🗑️');
    } else {
      setNudgeAlert('پیام از دستگاه شما حذف شد 🗑️');
    }
    setTimeout(() => setNudgeAlert(null), 2500);
    setSelectedMsgForMenu(null);
    setShowDeleteConfirm(false);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 1600);
    } else {
      setNudgeAlert('این پیام یافت نشد یا قبلاً حذف شده است');
      setTimeout(() => setNudgeAlert(null), 2000);
    }
  };

  const sendNudge = () => {
    setNudgeAlert(`نبض دلتنگی به گوشی ${partnerName} ارسال شد! 💓`);
    setShowHeartBurst(true);

    sendCloudNudge(user);
    socket.emit('send_nudge', user);

    if ('vibrate' in navigator) navigator.vibrate([100, 50, 200]);
    setTimeout(() => setShowHeartBurst(false), 1000);
    setTimeout(() => setNudgeAlert(null), 3500);
  };

  // Safe Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

      mediaRecorderRef.current = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/ogg' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          sendMessage('audio', reader.result);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      alert('دسترسی به میکروفون داده نشد.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      if (shouldSend) {
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      setRecordSeconds(0);
    }
  };

  // Image Selection Handler (opens Disappearing Timer Modal)
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file, 1000, 0.72);
      setPendingImage(compressedBase64);
      setSelectedTimer(0);
    } catch (err) {
      alert('خطا در بارگذاری تصویر.');
    }
    e.target.value = '';
  };

  // Send Photo with selected timer
  const confirmSendPhoto = () => {
    if (!pendingImage) return;

    if (selectedTimer === 0) {
      // Permanent Photo
      sendMessage('image', pendingImage);
    } else {
      // Disappearing Timed Photo
      sendMessage('timed_image', pendingImage, {
        timer: selectedTimer,
        opened: false,
        expired: false
      });
    }

    setPendingImage(null);
  };

  // View Disappearing Photo with Live Countdown
  const openTimedPhoto = (msg) => {
    if (msg.expired) return;

    setActiveViewingPhoto(msg);

    const duration = msg.timer === 'once' ? 10 : Number(msg.timer);
    setViewRemainingSeconds(duration);

    if (viewCountdownRef.current) clearInterval(viewCountdownRef.current);

    viewCountdownRef.current = setInterval(() => {
      setViewRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(viewCountdownRef.current);
          expireTimedPhoto(msg.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const expireTimedPhoto = async (msgId) => {
    setActiveViewingPhoto(null);
    if (viewCountdownRef.current) clearInterval(viewCountdownRef.current);

    // Update local state
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updated = { ...m, expired: true, text: '' };
          saveToStore('messages', updated);
          return updated;
        }
        return m;
      })
    );

    // Broadcast self-destruct signal to partner's phone
    sendCloudDelete(msgId);
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedBg = await compressImage(file, 1200, 0.75);
      setCustomBg(compressedBg);
    } catch (err) {
      alert('خطا در انتخاب والپیپر.');
    }
    e.target.value = '';
  };

  // Chat Audio Player
  const toggleAudio = (msgId, audioSrc) => {
    if (activeAudioId === msgId && currentAudioRef.current) {
      if (!currentAudioRef.current.paused) {
        currentAudioRef.current.pause();
        setActiveAudioId(null);
        return;
      }
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(audioSrc);
    currentAudioRef.current = audio;
    setActiveAudioId(msgId);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setActiveAudioId(null);
      setAudioProgress(0);
    };

    audio.play().catch(() => setActiveAudioId(null));
  };

  // Memory Creation
  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!newMemTitle.trim()) {
      alert('لطفاً عنوان خاطره را وارد کنید.');
      return;
    }

    const memItem = {
      id: generateMessageId(),
      title: newMemTitle.trim(),
      date: newMemDate,
      desc: newMemDesc.trim(),
      media: newMemMedia,
      mediaType: newMemMediaType,
      createdBy: user,
      createdAt: new Date().toISOString()
    };

    setMemories((prev) => [memItem, ...prev]);
    await saveToStore('memories', memItem);
    sendCloudMemory(memItem);

    setNewMemTitle('');
    setNewMemDesc('');
    setNewMemMedia(null);
    setShowAddMemory(false);
  };

  const handleMemoryMediaSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewMemMedia(reader.result);
        setNewMemMediaType('video');
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const compressed = await compressImage(file, 1200, 0.75);
        setNewMemMedia(compressed);
        setNewMemMediaType('image');
      } catch (e) {}
    }
  };

  // Playlist Logic
  const currentTrack = playlist[currentTrackIdx] || null;

  const toggleMusicPlay = () => {
    if (!musicAudioRef.current) return;
    if (isPlayingMusic) {
      musicAudioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      musicAudioRef.current.play().then(() => setIsPlayingMusic(true)).catch(console.error);
    }
  };

  const changeTrack = (direction) => {
    if (playlist.length === 0) return;
    let nextIdx = currentTrackIdx + direction;
    if (nextIdx < 0) nextIdx = playlist.length - 1;
    if (nextIdx >= playlist.length) nextIdx = 0;
    setCurrentTrackIdx(nextIdx);
    setIsPlayingMusic(false);
    setTimeout(() => {
      if (musicAudioRef.current) {
        musicAudioRef.current.play().then(() => setIsPlayingMusic(true)).catch(console.error);
      }
    }, 150);
  };

  const handleAddSongFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const title = file.name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = async () => {
      const newTrack = {
        id: generateMessageId(),
        title: title,
        artist: user === 'alireza' ? 'انتخاب علیرضا' : 'انتخاب فاطمه',
        src: reader.result,
        addedBy: user === 'alireza' ? 'علیرضا' : 'فاطمه'
      };

      setPlaylist((prev) => [...prev, newTrack]);
      await saveToStore('playlist', newTrack);
      sendCloudPlaylist(newTrack);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearAllMessages = async () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید تمام پیام‌ها را پاک کنید؟')) {
      setMessages([]);
      await clearStore('messages');
      setShowSettings(false);
    }
  };

  const currentTheme = THEMES[themeIdx];

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!myPhone || !user) {
    return (
      <div 
        className={`flex justify-center items-center w-full min-h-[100dvh] p-4 select-none ${selectedFont}`}
        style={{ backgroundColor: currentTheme.bg }}
      >
        <div className="relative w-full max-w-[390px] rounded-[36px] bg-[#120a1f]/90 border border-white/15 p-6 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-3xl shadow-xl border border-white/20 mb-4 animate-bounce">
            🔐
          </div>

          <h2 className="text-lg font-bold text-white mb-1">ورود به چت اختصاصی</h2>
          <p className="text-xs text-pink-200/80 mb-6">فضای کاملاً خصوصی و رمزشده دونفره</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="bg-black/40 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedRoleOnLogin('alireza')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedRoleOnLogin === 'alireza' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-white/60 hover:text-white'}`}
              >
                من علیرضا هستم 👨‍💻
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoleOnLogin('fatemeh')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedRoleOnLogin === 'fatemeh' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow' : 'text-white/60 hover:text-white'}`}
              >
                من فاطمه هستم 🌸
              </button>
            </div>

            <div className="relative text-right">
              <label className="text-[11px] text-white/70 block mb-1.5">شماره موبایل شما:</label>
              <div className="relative">
                <input 
                  type="tel"
                  dir="ltr"
                  placeholder="09..."
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3 text-sm text-center font-mono text-white placeholder-white/30 focus:outline-none focus:border-pink-500 transition-all"
                />
                <Phone className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {loginError && (
              <p className="text-[11px] text-rose-400 font-medium">{loginError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all mt-2"
            >
              ورود به فضای گفتگو ✨
            </button>
          </form>

          <div className="mt-6 flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>رمزنگاری اختصاصی • بدون واسطه و بدون ردپا</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN APP SCREEN
  // ----------------------------------------------------
  return (
    <div 
      className={`flex justify-center items-center w-full min-h-[100dvh] p-0 select-none ${selectedFont}`}
      style={{ backgroundColor: currentTheme.bg }}
    >
      <div className="relative w-full sm:max-w-[430px] h-[100dvh] bg-[#0d0915] sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl border-0 sm:border sm:border-white/10">
        
        {/* Custom Wallpaper Layer */}
        {customBg ? (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{ backgroundImage: `url(${customBg})` }}
          >
            <div 
              className="absolute inset-0 bg-black backdrop-blur-[2px]"
              style={{ opacity: bgDim / 100 }}
            />
          </div>
        ) : (
          <>
            <div className={`ambient-glow -top-20 -right-20 ${currentTheme.a1}`}></div>
            <div className={`ambient-glow top-1/3 -left-24 ${currentTheme.a2}`}></div>
            <div className={`ambient-glow -bottom-20 right-10 ${currentTheme.a3}`}></div>
          </>
        )}

        {/* Real Top Header Bar */}
        <div className="relative z-20 px-4 pt-3 pb-1 flex items-center justify-between text-xs">
          {realDays !== null ? (
            <div 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-[11px] text-pink-300 font-bold">💍 {realDays} روز باهم</span>
            </div>
          ) : (
            <div 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md cursor-pointer text-[10px] text-pink-200"
            >
              <Calendar className="w-3 h-3 text-pink-400" />
              <span>تنظیم تاریخ سالگرد 💍</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>کلود فعال</span>
            </span>
            <span className="text-white/20">•</span>
            <button 
              onClick={handleLogout}
              title="خروج و تعویض شماره"
              className="text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px]"
            >
              <span>{user === 'alireza' ? 'علیرضا' : 'فاطمه'}</span>
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: CHAT SCREEN */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            
            {/* Real Profile Card Header */}
            <div className="px-4 py-2 mx-3 mt-1 rounded-2xl glass-panel flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <div className="relative cursor-pointer" onClick={() => setShowHeartBurst(true)}>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 opacity-75 blur-[4px] animate-pulse"></div>
                  <div className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${user === 'alireza' ? 'from-rose-500 to-pink-600' : 'from-blue-500 to-indigo-600'} flex items-center justify-center font-bold text-lg text-white shadow-lg border border-white/20`}>
                    {partnerInitial}
                  </div>
                  <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#0d0915] rounded-full shadow"></span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-bold text-sm tracking-tight text-white">{partnerName}</h1>
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 heart-pulse" />
                  </div>

                  {partnerIsTyping ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-pink-300 font-medium mt-0.5 animate-pulse">
                      <span>در حال نوشتن</span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-pink-400 animate-bounce"></span>
                        <span className="w-1 h-1 rounded-full bg-pink-400 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1 h-1 rounded-full bg-pink-400 animate-bounce [animation-delay:0.4s]"></span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-emerald-400/90 mt-0.5 font-light flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>آنلاین • پیام‌رسانی امن</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={sendNudge}
                  className="p-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-rose-400 transition-all active:scale-90"
                  title="ارسال تپش قلب (ویبره)"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                  title="تنظیمات"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3 lux-scroll flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/50 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl animate-pulse">
                    💌
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/80">هنوز پیامی وجود ندارد</p>
                    <p className="text-[10px] text-white/40 mt-1">اولین پیام را برای {partnerName} بنویسید و ارسال کنید! ❤️</p>
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender === user;
                  const isAudioPlaying = activeAudioId === m.id;

                  return (
                    <div 
                      key={m.id} 
                      id={`msg-${m.id}`}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 transition-all duration-300 ${highlightedMsgId === m.id ? 'scale-102 ring-2 ring-rose-400 rounded-3xl p-1 bg-rose-500/15' : ''}`}
                    >
                      <div 
                        onTouchStart={() => handleMessageTouchStart(m)}
                        onTouchEnd={handleMessageTouchEnd}
                        onTouchMove={handleMessageTouchMove}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedMsgForMenu(m);
                          setShowDeleteConfirm(false);
                        }}
                        className={`max-w-[84%] rounded-[22px] ${isMe ? 'rounded-tl-md glass-bubble-out text-white' : 'rounded-tr-md glass-bubble-in text-white/95'} p-3.5 shadow-md group relative select-text`}
                      >
                        {/* Quoted Replying Header */}
                        {m.replyTo && (
                          <div 
                            onClick={() => scrollToMessage(m.replyTo.id)}
                            className="mb-2 p-2 rounded-xl bg-black/30 border-r-2 border-rose-400/90 cursor-pointer text-right hover:bg-black/45 transition-colors"
                          >
                            <div className="flex items-center gap-1 text-[10px] text-rose-300 font-medium">
                              <Reply className="w-3 h-3 inline-block rotate-180" />
                              <span>{m.replyTo.sender === user ? 'شما' : partnerName}</span>
                            </div>
                            <p className="text-[11px] text-white/70 truncate mt-0.5 select-none font-normal">
                              {m.replyTo.text}
                            </p>
                          </div>
                        )}

                        {/* Text Message */}
                        {m.type === 'text' && (
                          <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap">{m.text}</p>
                        )}

                        {/* Permanent Image */}
                        {m.type === 'image' && (
                          <div className="rounded-xl overflow-hidden border border-white/20 mb-1">
                            <img 
                              src={m.text} 
                              alt="عکس یادگاری" 
                              loading="lazy"
                              className="max-h-56 w-full object-cover cursor-pointer"
                              onClick={() => window.open(m.text, '_blank')}
                            />
                          </div>
                        )}

                        {/* Disappearing / Timed Image Message */}
                        {m.type === 'timed_image' && (
                          <div className="mb-1">
                            {m.expired ? (
                              <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white/40 text-[11px] flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-rose-400/60" />
                                <span>این عکس منقضی و حذف شد 🔥</span>
                              </div>
                            ) : (
                              <div 
                                onClick={() => openTimedPhoto(m)}
                                className="relative rounded-2xl overflow-hidden border border-rose-500/30 bg-black/50 p-4 text-center cursor-pointer active:scale-95 transition-all group"
                              >
                                <div className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-30 group-hover:opacity-40 transition-opacity" style={{ backgroundImage: `url(${m.text})` }} />
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-lg animate-pulse">
                                    <Flame className="w-5 h-5 fill-current" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white">عکس محوشونده ({m.timer === 'once' ? 'یک‌بار مصرف' : `${m.timer} ثانیه`})</p>
                                    <span className="text-[10px] text-pink-300">برای مشاهده لمس کنید ⏱️</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Voice Note */}
                        {m.type === 'audio' && (
                          <div className="flex items-center gap-3 w-56">
                            <button 
                              onClick={() => toggleAudio(m.id, m.text)}
                              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white active:scale-95 transition-all shadow-sm shrink-0"
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 ml-0.5 fill-current" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full bg-white rounded-full transition-all ${isAudioPlaying ? 'opacity-100' : 'opacity-60'}`}
                                  style={{ width: isAudioPlaying ? `${audioProgress}%` : '40%' }}
                                />
                              </div>
                              <span className="text-[9px] text-white/70 mt-1 block">
                                {isAudioPlaying ? 'در حال پخش...' : 'پیام صوتی اختصاصی'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Meta info & Action trigger */}
                        <div className={`flex items-center justify-between gap-2 mt-1 text-[9px] ${isMe ? 'text-white/80' : 'text-white/40'} font-mono`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMsgForMenu(m);
                              setShowDeleteConfirm(false);
                            }}
                            className="opacity-40 hover:opacity-100 p-0.5 text-white/60 hover:text-white transition-opacity active:scale-90"
                            title="گزینه‌ها (ریپلای و حذف)"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center gap-1">
                            <span>{m.time}</span>
                            {isMe && <span className="font-bold">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Voice Deck */}
            <div className="p-3 bg-black/70 backdrop-blur-2xl border-t border-white/10">
              {/* Reply Preview Bar */}
              {replyingTo && (
                <div className="flex items-center justify-between px-3 py-2 bg-white/10 backdrop-blur-md rounded-2xl border-r-4 border-rose-400 mb-2 text-xs text-white/90 animate-fadeIn">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <Reply className="w-3.5 h-3.5 rotate-180" />
                    </div>
                    <div className="flex flex-col text-right truncate">
                      <span className="text-[10px] text-rose-300 font-semibold">
                        پاسخ به {replyingTo.sender === user ? 'خودتان' : partnerName}
                      </span>
                      <span className="text-[11px] text-white/70 truncate">
                        {replyingTo.type === 'text' 
                          ? replyingTo.text 
                          : replyingTo.type === 'audio' 
                            ? '🎵 پیام صوتی' 
                            : replyingTo.type === 'timed_image' 
                              ? '⏳ عکس محوشونده' 
                              : '🖼️ عکس'}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setReplyingTo(null)} 
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white shrink-0"
                    title="لغو پاسخ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isRecording ? (
                <div className="flex items-center justify-between bg-rose-950/60 border border-rose-500/40 rounded-2xl px-4 py-2.5 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="text-xs font-mono font-bold text-rose-300">{formatSeconds(recordSeconds)}</span>
                    <span className="text-[11px] text-white/80 font-medium">در حال ضبط صدا...</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => stopRecording(false)}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] text-white/70"
                    >
                      لغو
                    </button>
                    <button 
                      type="button" 
                      onClick={() => stopRecording(true)}
                      className="p-2 rounded-xl bg-rose-500 text-white active:scale-95 shadow-md"
                    >
                      <Send className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage('text');
                  }}
                  className="flex items-center gap-2"
                >
                  <button 
                    type="button" 
                    onClick={() => sendMessage('text', '🫀❤️ دلتنگتم بی‌نهایت...')}
                    className="p-2.5 rounded-2xl glass-panel text-rose-400 hover:text-rose-300 active:scale-95 transition-all shadow-md shrink-0"
                    title="ارسال قلب"
                  >
                    ❤️
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageSelect} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-2xl glass-panel text-white/70 hover:text-white active:scale-95 transition-all shadow-md shrink-0"
                    title="ارسال عکس یا عکس تایم‌دار"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      ref={textInputRef}
                      value={inputVal}
                      onChange={handleInputChange}
                      placeholder={replyingTo ? `پاسخ به ${replyingTo.sender === user ? 'پیام خودت' : partnerName}...` : `پیامی برای ${partnerName}...`}
                      className="w-full glass-input rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-pink-500/60 transition-all shadow-inner"
                    />
                  </div>

                  {inputVal.trim() ? (
                    <button 
                      type="submit" 
                      className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white active:scale-95 transition-all shadow-lg flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4 rotate-180" />
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={startRecording}
                      className="p-2.5 rounded-2xl glass-panel text-white/80 active:scale-95 transition-all shadow-lg flex items-center justify-center shrink-0"
                      title="ضبط وویس"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </form>
              )}
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: MEMORIES & MILESTONES */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'memories' && (
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <BookHeart className="w-4 h-4 text-pink-400" />
                  <span>دفترچه خاطرات مشترک</span>
                </h2>
                <p className="text-[10px] text-pink-200/60 mt-0.5">ثبت عکس‌ها، فیلم‌ها و روزهای خاطره‌انگیز ما</p>
              </div>

              <button 
                onClick={() => setShowAddMemory(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت خاطره</span>
              </button>
            </div>

            <div className="flex-1 px-4 py-3 overflow-y-auto space-y-4 lux-scroll">
              {memories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                    📸
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/70">هنوز خاطره‌ای ثبت نکرده‌اید</p>
                    <p className="text-[10px] text-white/40 mt-1">با زدن دکمه «ثبت خاطره»، اولین عکس یادگاری دونفره را اینجا ماندگار کنید!</p>
                  </div>
                </div>
              ) : (
                memories.map((mem) => (
                  <div key={mem.id} className="rounded-3xl glass-panel p-3.5 border border-white/10 shadow-xl space-y-2.5">
                    {mem.media && (
                      <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/50 aspect-video relative flex items-center justify-center">
                        {mem.mediaType === 'video' ? (
                          <video src={mem.media} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={mem.media} alt={mem.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs text-white">{mem.title}</h3>
                        <span className="text-[9px] font-mono text-pink-300 px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20">
                          {mem.date}
                        </span>
                      </div>

                      {mem.desc && (
                        <p className="text-[11px] text-white/70 leading-relaxed mt-1.5 font-light">{mem.desc}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-white/40">
                        <span>ثبت شده توسط: {mem.createdBy === 'alireza' ? 'علیرضا 👨‍💻' : 'فاطمه 🌸'}</span>
                        <span>❤️ یادگاری همیشگی</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: COUPLE'S SHARED PLAYLIST */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'playlist' && (
          <div className="flex-1 flex flex-col overflow-hidden relative z-10 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-pink-400" />
                  <span>پلی‌لیست مشترک دونفره</span>
                </h2>
                <p className="text-[10px] text-pink-200/60 mt-0.5">آهنگ‌هایی که با شنیدنشون یاد هم می‌افتیم</p>
              </div>

              <input 
                type="file" 
                ref={songInputRef} 
                onChange={handleAddSongFile} 
                accept="audio/*" 
                className="hidden" 
              />
              <button 
                onClick={() => songInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-pink-300 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن آهنگ</span>
              </button>
            </div>

            {currentTrack && (
              <div className="my-4 p-5 rounded-3xl bg-gradient-to-b from-pink-950/40 via-purple-950/30 to-black/60 border border-pink-500/20 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
                <div className={`relative w-28 h-28 rounded-full border-4 border-pink-500/30 p-1 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.3)] ${isPlayingMusic ? 'animate-spin [animation-duration:12s]' : ''}`}>
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-purple-900 via-rose-900 to-black flex items-center justify-center border-2 border-white/20">
                    <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white/40 flex items-center justify-center text-xs">
                      🎵
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-white drop-shadow-sm">{currentTrack.title}</h3>
                <p className="text-[11px] text-pink-300/80 mt-0.5">{currentTrack.artist}</p>

                <audio 
                  ref={musicAudioRef}
                  src={currentTrack.src}
                  onTimeUpdate={() => {
                    if (musicAudioRef.current && musicAudioRef.current.duration) {
                      setMusicProgress((musicAudioRef.current.currentTime / musicAudioRef.current.duration) * 100);
                      setMusicDuration(musicAudioRef.current.duration);
                    }
                  }}
                  onEnded={() => changeTrack(1)}
                />

                <div className="w-full mt-4">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${musicProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-white/40 mt-1">
                    <span>{musicAudioRef.current ? formatSeconds(musicAudioRef.current.currentTime) : '0:00'}</span>
                    <span>{musicDuration ? formatSeconds(musicDuration) : '0:00'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-3">
                  <button 
                    onClick={() => changeTrack(-1)}
                    className="p-2 rounded-full text-white/70 hover:text-white active:scale-90 transition-all"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={toggleMusicPlay}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                  >
                    {isPlayingMusic ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    )}
                  </button>

                  <button 
                    onClick={() => changeTrack(1)}
                    className="p-2 rounded-full text-white/70 hover:text-white active:scale-90 transition-all"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1.5 lux-scroll">
              <span className="text-[10px] text-white/40 font-semibold block mb-1">لیست تمام آهنگ‌های ما ({playlist.length}):</span>
              {playlist.map((track, idx) => (
                <div 
                  key={track.id}
                  onClick={() => {
                    setCurrentTrackIdx(idx);
                    setIsPlayingMusic(false);
                    setTimeout(() => {
                      if (musicAudioRef.current) {
                        musicAudioRef.current.play().then(() => setIsPlayingMusic(true)).catch(console.error);
                      }
                    }, 100);
                  }}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${currentTrackIdx === idx ? 'bg-pink-500/20 border-pink-500/40 text-white' : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs">
                      {currentTrackIdx === idx && isPlayingMusic ? '▶️' : '🎵'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{track.title}</p>
                      <p className="text-[10px] text-white/50">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-[9px] text-pink-300 font-mono">
                    {track.addedBy ? `افزوده: ${track.addedBy}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* BOTTOM NAVIGATION BAR */}
        {/* ---------------------------------------------------- */}
        <div className="relative z-30 bg-black/85 backdrop-blur-2xl border-t border-white/10 px-6 py-2.5 flex items-center justify-around shadow-2xl">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' ? 'text-pink-400 font-bold scale-105' : 'text-white/40 hover:text-white/80'}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">گفتگو</span>
          </button>

          <button 
            onClick={() => setActiveTab('memories')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'memories' ? 'text-pink-400 font-bold scale-105' : 'text-white/40 hover:text-white/80'}`}
          >
            <BookHeart className="w-5 h-5" />
            <span className="text-[10px]">خاطرات ما</span>
          </button>

          <button 
            onClick={() => setActiveTab('playlist')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'playlist' ? 'text-pink-400 font-bold scale-105' : 'text-white/40 hover:text-white/80'}`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[10px]">موزیک ما</span>
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* MODAL: DISAPPEARING PHOTO TIMER PICKER */}
        {/* ---------------------------------------------------- */}
        {pendingImage && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end animate-fadeIn">
            <div className="bg-[#140d21] border-t border-white/20 rounded-t-[36px] p-5 max-h-[85%] overflow-y-auto lux-scroll shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-sm text-white">ارسال عکس (تعیین تایمر محوشدن)</h3>
                </div>
                <button 
                  onClick={() => setPendingImage(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Preview Thumbnail */}
              <div className="my-3.5 rounded-2xl overflow-hidden border border-white/20 max-h-48 flex items-center justify-center bg-black/40">
                <img src={pendingImage} alt="پیش‌نمایش" className="max-h-48 w-full object-contain" />
              </div>

              {/* Timer Options Grid */}
              <div>
                <label className="text-[11px] text-white/70 block mb-2">تایمر پاک شدن خودکار عکس:</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIMER_OPTIONS.map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setSelectedTimer(opt.value)}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${selectedTimer === opt.value ? 'bg-gradient-to-r from-rose-500 to-pink-500 border-rose-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                    >
                      <span className="text-base block mb-0.5">{opt.icon}</span>
                      <span className="text-[11px] font-bold block">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex gap-2">
                <button 
                  onClick={() => setPendingImage(null)}
                  className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white/70 text-xs font-semibold"
                >
                  انصراف
                </button>
                <button 
                  onClick={confirmSendPhoto}
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4 rotate-180" />
                  <span>{selectedTimer === 0 ? 'ارسال عادی عکس' : `ارسال با تایمر ${selectedTimer === 'once' ? 'یک‌بار مصرف' : `${selectedTimer} ثانیه`} 🔥`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* FULLSCREEN VIEW: DISAPPEARING PHOTO WITH COUNTDOWN */}
        {/* ---------------------------------------------------- */}
        {activeViewingPhoto && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col justify-between p-4 animate-fadeIn">
            {/* Top Bar with Countdown Badge */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold shadow-lg animate-pulse">
                <Flame className="w-4 h-4 fill-current" />
                <span>زمان باقی‌مانده: {viewRemainingSeconds} ثانیه</span>
              </div>

              <button 
                onClick={() => expireTimedPhoto(activeViewingPhoto.id)}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                title="بستن و حذف فوری"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Center */}
            <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
              <img 
                src={activeViewingPhoto.text} 
                alt="عکس محوشونده" 
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
              />
            </div>

            {/* Bottom Warning */}
            <div className="text-center pb-4 text-[11px] text-white/50">
              <span>⚠️ این عکس با اتمام زمان یا بستن صفحه، برای همیشه می‌سوزد و پاک می‌شود.</span>
            </div>
          </div>
        )}

        {/* Modal: Add New Memory */}
        {showAddMemory && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-fadeIn">
            <div className="bg-[#140d21] border-t border-white/20 rounded-t-[36px] p-5 max-h-[90%] overflow-y-auto lux-scroll shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BookHeart className="w-5 h-5 text-pink-400" />
                  <h3 className="font-bold text-sm text-white">ثبت خاطره جدید دونفره</h3>
                </div>
                <button 
                  onClick={() => setShowAddMemory(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMemory} className="mt-4 space-y-3.5 text-right">
                <div>
                  <label className="text-[11px] text-white/70 block mb-1">عنوان خاطره:</label>
                  <input 
                    type="text" 
                    placeholder="مثلاً: اولین باری که باهم رفتیم کافه..." 
                    value={newMemTitle}
                    onChange={(e) => setNewMemTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-white/70 block mb-1">تاریخ این روز قشنگ:</label>
                  <input 
                    type="date" 
                    value={newMemDate}
                    onChange={(e) => setNewMemDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-white/70 block mb-1">یادداشت / دلنوشته خاطره:</label>
                  <textarea 
                    rows="3"
                    placeholder="چیزی که اون روز حس کردی رو بنویس..." 
                    value={newMemDesc}
                    onChange={(e) => setNewMemDesc(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-pink-500 resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="text-[11px] text-white/70 block mb-1">افزودن عکس یا فیلم یادگاری:</label>
                  <input 
                    type="file" 
                    ref={memoryMediaInputRef} 
                    onChange={handleMemoryMediaSelect} 
                    accept="image/*,video/*" 
                    className="hidden" 
                  />
                  <button 
                    type="button"
                    onClick={() => memoryMediaInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl border border-dashed border-pink-500/40 bg-pink-500/10 text-pink-300 flex items-center justify-center gap-2 text-xs hover:bg-pink-500/20 active:scale-95 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{newMemMedia ? 'تغییر فایل انتخاب شده' : 'انتخاب عکس یا ویدیو از گالری'}</span>
                  </button>
                  {newMemMedia && (
                    <span className="text-[10px] text-emerald-400 mt-1 block">✓ فایل بارگذاری شد</span>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all mt-4"
                >
                  ثبت همیشگی این خاطره ❤️
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Fullscreen Heart Burst Overlay */}
        {showHeartBurst && (
          <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-8xl animate-ping opacity-90">💖</div>
          </div>
        )}

        {/* Nudge Alert Toast */}
        {nudgeAlert && (
          <div className="absolute top-14 left-4 right-4 z-40 p-3 rounded-2xl bg-gradient-to-r from-rose-500/90 to-purple-600/90 backdrop-blur-xl border border-white/20 text-white text-xs shadow-lg flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2">
              <span className="text-lg">💓</span>
              <p className="font-medium text-[11px]">{nudgeAlert}</p>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-end animate-fadeIn">
            <div className="bg-[#140d21] border-t border-white/20 rounded-t-[36px] p-5 max-h-[85%] overflow-y-auto lux-scroll shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  <h3 className="font-bold text-sm text-white">تنظیمات چت دونفره</h3>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Real Anniversary Date Setting */}
              <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-300 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>تاریخ شروع باهم بودن (محاسبه واقعی روزها):</span>
                </div>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
                <p className="text-[10px] text-white/40 mt-1">تعداد روزها از روی این تاریخ به طور خودکار محاسبه و در بالای صفحه نشان داده می‌شود.</p>
              </div>

              {/* Account / Phone Info */}
              <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-white/50 block">شماره فعال در این گوشی:</span>
                  <span className="text-xs font-mono font-bold text-pink-300">{myPhone} ({user === 'alireza' ? 'علیرضا' : 'فاطمه'})</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تغییر شماره</span>
                </button>
              </div>

              {/* Font Selection Section */}
              <div className="mt-5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-300 mb-2.5">
                  <Type className="w-4 h-4" />
                  <span>انتخاب فونت چت:</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFont(f.id)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all text-right ${selectedFont === f.id ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                    >
                      <div className={f.id}>
                        <span className="text-xs font-bold block">{f.name}</span>
                        <span className="text-[10px] text-white/50">{f.preview}</span>
                      </div>
                      {selectedFont === f.id && <Check className="w-4 h-4 text-pink-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme & Background Section */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold text-pink-300 mb-2.5">
                  <span>تم‌های نئونی پیش‌فرض:</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setThemeIdx(idx);
                        setCustomBg(null);
                      }}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between ${themeIdx === idx && !customBg ? 'border-pink-500 bg-pink-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: t.bg }}></span>
                        <span className="text-xs text-white">{t.name}</span>
                      </div>
                      {themeIdx === idx && !customBg && <Check className="w-3.5 h-3.5 text-pink-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Photo Wallpaper */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-pink-300">عکس یادگاری به عنوان والپیپر:</span>
                  {customBg && (
                    <button 
                      onClick={() => setCustomBg(null)}
                      className="flex items-center gap-1 text-[10px] text-rose-400 hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>حذف والپیپر</span>
                    </button>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={bgInputRef} 
                  onChange={handleBgUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <button 
                  onClick={() => bgInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>{customBg ? 'تغییر عکس پس‌زمینه از گالری' : 'انتخاب عکس دونفره از گالری برای والپیپر'}</span>
                </button>

                {customBg && (
                  <div className="mt-2.5 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                    <div className="flex justify-between text-[10px] text-white/70 mb-1">
                      <span>تیرگی پس‌زمینه (خوانایی پیام‌ها):</span>
                      <span className="font-mono text-pink-300">{bgDim}٪</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="90" 
                      value={bgDim}
                      onChange={(e) => setBgDim(e.target.value)}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Clear Chat History */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <button 
                  onClick={clearAllMessages}
                  className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>پاک‌سازی تاریخچه پیام‌ها</span>
                </button>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                بستن تنظیمات ✨
              </button>
            </div>
          </div>
        )}

        {/* Message Long-Press / Options Action Sheet */}
        {selectedMsgForMenu && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
            onClick={() => { setSelectedMsgForMenu(null); setShowDeleteConfirm(false); }}
          >
            <div 
              className="w-full max-w-sm rounded-[32px] bg-neutral-900/95 border border-white/20 p-5 shadow-2xl backdrop-blur-2xl animate-scaleUp text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Preview of Selected Message */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <span className="text-[11px] text-white/50 font-medium">
                  پیام {selectedMsgForMenu.sender === user ? 'شما' : partnerName} • {selectedMsgForMenu.time}
                </span>
                <button 
                  onClick={() => { setSelectedMsgForMenu(null); setShowDeleteConfirm(false); }}
                  className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Content Preview */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/90 mb-3 max-h-24 overflow-y-auto lux-scroll leading-relaxed">
                {selectedMsgForMenu.type === 'text' && selectedMsgForMenu.text}
                {selectedMsgForMenu.type === 'audio' && '🎵 پیام صوتی اختصاصی'}
                {selectedMsgForMenu.type === 'timed_image' && '⏳ عکس محوشونده تایم‌دار'}
                {selectedMsgForMenu.type === 'image' && '🖼️ عکس یادگاری'}
              </div>

              {/* Quick Emoji Reactions */}
              <div className="flex items-center justify-around py-2.5 px-3 rounded-2xl bg-white/5 border border-white/10 mb-3.5 text-2xl">
                {['❤️', '😍', '😂', '🥺', '🔥', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      sendMessage('text', emoji, {
                        replyTo: {
                          id: selectedMsgForMenu.id,
                          sender: selectedMsgForMenu.sender,
                          text: selectedMsgForMenu.type === 'text' ? selectedMsgForMenu.text : 'پیام'
                        }
                      });
                      setSelectedMsgForMenu(null);
                    }}
                    className="hover:scale-130 active:scale-90 transition-transform"
                    title={`واکنش با ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {!showDeleteConfirm ? (
                <div className="space-y-2">
                  {/* Reply Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(selectedMsgForMenu);
                      setSelectedMsgForMenu(null);
                      setTimeout(() => textInputRef.current?.focus(), 150);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 flex items-center gap-3 text-white text-xs font-medium transition-all active:scale-98"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Reply className="w-4 h-4 rotate-180" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="font-semibold text-white">پاسخ دادن (ریپلای)</p>
                      <p className="text-[10px] text-white/50">سنجاق کردن پیام جهت ارسال پاسخ</p>
                    </div>
                  </button>

                  {/* Copy Text Action (If Text) */}
                  {selectedMsgForMenu.type === 'text' && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMsgForMenu.text);
                        setNudgeAlert('متن پیام کپی شد! 📋');
                        setTimeout(() => setNudgeAlert(null), 2000);
                        setSelectedMsgForMenu(null);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 flex items-center gap-3 text-white text-xs font-medium transition-all active:scale-98"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Copy className="w-4 h-4" />
                      </div>
                      <div className="text-right flex-1">
                        <p className="font-semibold text-white">کپی کردن متن</p>
                        <p className="text-[10px] text-white/50">کپی متن پیام در حافظه گوشی</p>
                      </div>
                    </button>
                  )}

                  {/* Delete Action */}
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-medium transition-all active:scale-98"
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="font-semibold text-rose-300">پاک کردن پیام (حذف)</p>
                      <p className="text-[10px] text-rose-300/60">حذف همزمان برای هر دو نفر یا از این گوشی</p>
                    </div>
                  </button>
                </div>
              ) : (
                /* Delete Confirmation Options */
                <div className="space-y-2.5 animate-fadeIn">
                  <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center mb-1">
                    <p className="text-xs font-semibold text-rose-300">
                      نحوه حذف این پیام را انتخاب کنید:
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(selectedMsgForMenu.id, true)}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف برای هر دو نفر (همزمان دوطرفه)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(selectedMsgForMenu.id, false)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>حذف فقط برای من (در این گوشی)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-2 px-4 rounded-2xl bg-transparent text-white/50 hover:text-white text-xs transition-all text-center"
                  >
                    انصراف
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
