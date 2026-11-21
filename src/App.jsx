import React, { useState, useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
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
  MoreHorizontal,
  Bell,
  User,
  Camera,
  Smile,
  Edit3,
  Sparkles,
  CheckCheck,
  HeartHandshake,
  HelpCircle,
  Gift,
  ListChecks,
  Video,
  VideoOff,
  MicOff,
  PhoneCall,
  PhoneOff,
  ArrowDown
} from 'lucide-react';
import { 
  initCloudSync, 
  sendCloudMessage, 
  sendCloudNudge, 
  sendCloudTyping, 
  sendCloudMemory, 
  sendCloudPlaylist,
  sendCloudDelete,
  sendCloudSeen,
  sendCloudPresence,
  sendCloudProfile,
  sendCloudTogetherAction,
  sendCloudCall
} from './cloudSync';
import { compressImage, generateMessageId, formatSeconds } from './utils';
import { getAllFromStore, saveToStore, deleteFromStore, clearStore } from './db';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.'));

const socket = isLocal ? io(window.location.origin, {
  autoConnect: true,
  reconnectionAttempts: 5,
  timeout: 3000,
  transports: ['websocket']
}) : {
  on: () => {},
  off: () => {},
  emit: () => {}
};

const THEMES = [
  { 
    id: 'blush-white', 
    name: 'سفید و صورتی ملیح (پیش‌فرض)', 
    bg: '#fdf8fa', 
    isLight: true,
    cardBg: 'bg-white/95 border-pink-100 shadow-sm text-slate-800',
    bubbleIn: 'bg-white border border-pink-100/90 text-slate-800 shadow-sm',
    bubbleOut: 'bg-gradient-to-l from-pink-400 via-rose-400 to-pink-500 text-white shadow-md shadow-pink-200/50',
    a1: 'bg-pink-200/30', 
    a2: 'bg-rose-100/40', 
    a3: 'bg-pink-100/30' 
  },
  { 
    id: 'velvet', 
    name: 'مخملی شب', 
    bg: '#0d0915', 
    isLight: false,
    cardBg: 'bg-[#120a1f]/90 border-white/10 text-white',
    bubbleIn: 'bg-[#1c1428]/95 border-white/10 text-white/90',
    bubbleOut: 'bg-gradient-to-l from-rose-600 via-pink-600 to-rose-700 text-white',
    a1: 'bg-pink-600/40', 
    a2: 'bg-purple-700/35', 
    a3: 'bg-indigo-600/30' 
  },
  { 
    id: 'rose', 
    name: 'رز ارغوانی', 
    bg: '#170912', 
    isLight: false,
    cardBg: 'bg-[#1e0d18]/90 border-white/10 text-white',
    bubbleIn: 'bg-[#25101f]/95 border-white/10 text-white/90',
    bubbleOut: 'bg-gradient-to-l from-rose-500 to-pink-600 text-white',
    a1: 'bg-rose-600/40', 
    a2: 'bg-pink-700/35', 
    a3: 'bg-purple-600/30' 
  },
  { 
    id: 'amoled', 
    name: 'مشکی خالص', 
    bg: '#000000', 
    isLight: false,
    cardBg: 'bg-[#0f0f0f]/90 border-white/10 text-white',
    bubbleIn: 'bg-[#181818]/95 border-white/10 text-white/90',
    bubbleOut: 'bg-gradient-to-l from-neutral-700 to-neutral-800 text-white',
    a1: 'bg-neutral-800/20', 
    a2: 'bg-neutral-900/30', 
    a3: 'bg-zinc-800/20' 
  }
];

const FONTS = [
  { id: 'font-arad', name: 'آراد (پیش‌فرض مدرن)', preview: 'عشق من و تو' },
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
  const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('duo_font') || 'font-arad');
  const [themeIdx, setThemeIdx] = useState(() => Number(localStorage.getItem('duo_theme_idx')) || 0);
  const [customBg, setCustomBg] = useState(() => localStorage.getItem('duo_custom_bg') || null);
  const [bgDim, setBgDim] = useState(() => Number(localStorage.getItem('duo_bg_dim')) || 65);
  const [showSettings, setShowSettings] = useState(false);
  const [cloudOnline, setCloudOnline] = useState(false);

  // Live Partner Typing & Presence Status
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(() => {
    const saved = localStorage.getItem('duo_partner_last_seen');
    return saved ? Number(saved) : null;
  });
  const presenceTimeoutRef = useRef(null);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'آفلاین';
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 60) return 'آخرین بازدید: لحظاتی پیش';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `آخرین بازدید: ${diffMin} دقیقه پیش`;

    const d = new Date(timestamp);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && 
                    d.getMonth() === today.getMonth() && 
                    d.getFullYear() === today.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `آخرین بازدید: امروز ساعت ${hours}:${minutes}`;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() && 
                        d.getMonth() === yesterday.getMonth() && 
                        d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `آخرین بازدید: دیروز ساعت ${hours}:${minutes}`;
    }

    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `آخرین بازدید: ${month}/${day} ساعت ${hours}:${minutes}`;
  };

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
  const messagesContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Call & WebRTC State
  const [activeCall, setActiveCall] = useState(null); // { isOpen, isIncoming, isVideo, status: 'ringing'|'connected' }
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneOscRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const memoryMediaInputRef = useRef(null);
  const songInputRef = useRef(null);
  const audioContextRef = useRef(null);

  // Profile State
  const [profileTab, setProfileTab] = useState('my'); // 'my' or 'partner'
  const [myProfile, setMyProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('two_souls_my_profile')) || {
        avatar: '',
        nickname: '',
        bio: 'همیشه در قلب من هستی ✨❤️',
        mood: '🥰'
      };
    } catch (e) {
      return {
        avatar: '',
        nickname: '',
        bio: 'همیشه در قلب من هستی ✨❤️',
        mood: '🥰'
      };
    }
  });

  const [partnerProfile, setPartnerProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('two_souls_partner_profile')) || {
        avatar: '',
        nickname: '',
        bio: '',
        mood: '🥰'
      };
    } catch (e) {
      return {
        avatar: '',
        nickname: '',
        bio: '',
        mood: '🥰'
      };
    }
  });

  const [editNickname, setEditNickname] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editMood, setEditMood] = useState('🥰');
  const [editAvatar, setEditAvatar] = useState('');
  const avatarInputRef = useRef(null);

  const MOOD_OPTIONS = [
    { emoji: '🥰', label: 'عاشقانه' },
    { emoji: '🥺', label: 'دلتنگتم' },
    { emoji: '🥱', label: 'بغل می‌خوام' },
    { emoji: '☕', label: 'سرکار / شلوغ' },
    { emoji: '🌸', label: 'آروم و ریلکس' },
    { emoji: '🎉', label: 'پرانرژی' },
    { emoji: '🤒', label: 'بی‌حال' },
    { emoji: '🌙', label: 'شب‌بخیر' }
  ];

  useEffect(() => {
    setEditNickname(myProfile.nickname || (user === 'alireza' ? 'علیرضا' : 'فاطمه'));
    setEditBio(myProfile.bio || 'همیشه در قلب من هستی ✨❤️');
    setEditMood(myProfile.mood || '🥰');
    setEditAvatar(myProfile.avatar || '');
  }, [myProfile, user]);

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    const updated = {
      user,
      nickname: editNickname.trim() || (user === 'alireza' ? 'علیرضا' : 'فاطمه'),
      bio: editBio.trim(),
      mood: editMood,
      avatar: editAvatar,
      updatedAt: Date.now()
    };
    setMyProfile(updated);
    localStorage.setItem('two_souls_my_profile', JSON.stringify(updated));
    sendCloudProfile(updated);
    setNudgeAlert('پروفایل با موفقیت ذخیره و برای عشقت ارسال شد! ✨💖');
    setTimeout(() => setNudgeAlert(null), 3500);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 400, 0.7);
      setEditAvatar(compressed);
    } catch (err) {
      console.error('Avatar upload error:', err);
    }
  };

  // Together Features State
  const [togetherSubTab, setTogetherSubTab] = useState('bond'); // 'bond', 'question', 'bucket', 'capsule'
  const [myBondTouching, setMyBondTouching] = useState(false);
  const [partnerBondTouching, setPartnerBondTouching] = useState(false);

  // Daily Question
  const DAILY_QUESTIONS = [
    'اولین بار که صدام رو شنیدی چه حسی داشتی؟ 🎧❤️',
    'قشنگ‌ترین لحظه‌ای که تا حالا با هم داشتیم چی بوده؟ ✨',
    'اگر همین الان پیشت بودم، اولین کاری که می‌کردی چی بود؟ 🫂',
    'چه چیزی توی اخلاق یا نگاه من بیشتر از همه دلت رو برد؟ 🌸',
    'یک آرزوی دونفره که دوست داری امسال با هم بهش برسیم چیه؟ 💫'
  ];
  const currentDailyQuestion = DAILY_QUESTIONS[new Date().getDate() % DAILY_QUESTIONS.length];
  const [myDailyAnswer, setMyDailyAnswer] = useState(() => localStorage.getItem('duo_daily_ans') || '');
  const [partnerDailyAnswer, setPartnerDailyAnswer] = useState(() => localStorage.getItem('duo_partner_daily_ans') || '');
  const [dailyInput, setDailyInput] = useState('');

  // Bucket List
  const [bucketList, setBucketList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('duo_bucket_list')) || [
        { id: 'b1', title: 'دیدن غروب آفتاب کنار دریا دست در دست هم 🌅', done: false, addedBy: 'علیرضا' },
        { id: 'b2', title: 'سفر به یک کلبه جنگلی بارونی دونفره 🏡🌧️', done: false, addedBy: 'فاطمه' },
        { id: 'b3', title: 'پختن کیک یا پیتزای دونفره توی خونه 🍕🎂', done: true, addedBy: 'علیرضا' },
        { id: 'b4', title: 'شب‌بیداری و تماشای ستاره‌ها با یک ماگ چای داغ ☕✨', done: false, addedBy: 'فاطمه' }
      ];
    } catch(e) {
      return [];
    }
  });
  const [newBucketTitle, setNewBucketTitle] = useState('');

  // Time Capsules
  const [capsules, setCapsules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('duo_capsules')) || [
        { 
          id: 'cap1', 
          sender: 'alireza', 
          title: 'نامه‌ای برای سالگرد قشنگمون 💌', 
          content: 'عشق من، این نامه رو زمانی می‌خونی که یک سال دیگه از با هم بودنمون گذشت و هر ثانیه‌اش برام بهشت بوده...', 
          unlockDate: '2027-03-20',
          createdAt: Date.now()
        }
      ];
    } catch(e) {
      return [];
    }
  });
  const [showAddCapsule, setShowAddCapsule] = useState(false);
  const [newCapTitle, setNewCapTitle] = useState('');
  const [newCapContent, setNewCapContent] = useState('');
  const [newCapUnlockDate, setNewCapUnlockDate] = useState('');

  const handleBondTouchStart = () => {
    setMyBondTouching(true);
    sendCloudTogetherAction({ type: 'touch', sender: user, touching: true });
    if ('vibrate' in navigator) navigator.vibrate([80, 40, 80]);
  };

  const handleBondTouchEnd = () => {
    setMyBondTouching(false);
    sendCloudTogetherAction({ type: 'touch', sender: user, touching: false });
  };

  const handleSaveDailyAnswer = (e) => {
    e.preventDefault();
    const ans = dailyInput.trim();
    if (!ans) return;
    setMyDailyAnswer(ans);
    localStorage.setItem('duo_daily_ans', ans);
    sendCloudTogetherAction({ type: 'daily_answer', sender: user, answer: ans });
    setDailyInput('');
    setNudgeAlert('پاسخ شما با موفقیت ثبت شد! ✨❤️');
    setTimeout(() => setNudgeAlert(null), 3500);
  };

  const handleAddBucketItem = (e) => {
    e.preventDefault();
    const title = newBucketTitle.trim();
    if (!title) return;
    const item = {
      id: 'b_' + Date.now(),
      title,
      done: false,
      addedBy: user === 'alireza' ? 'علیرضا' : 'فاطمه'
    };
    const updated = [item, ...bucketList];
    setBucketList(updated);
    localStorage.setItem('duo_bucket_list', JSON.stringify(updated));
    sendCloudTogetherAction({ type: 'bucket_add', item });
    setNewBucketTitle('');
  };

  const handleToggleBucket = (id, currentDone) => {
    const updated = bucketList.map(b => b.id === id ? { ...b, done: !currentDone } : b);
    setBucketList(updated);
    localStorage.setItem('duo_bucket_list', JSON.stringify(updated));
    sendCloudTogetherAction({ type: 'bucket_toggle', id, done: !currentDone });
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const handleAddCapsule = (e) => {
    e.preventDefault();
    if (!newCapTitle.trim() || !newCapContent.trim() || !newCapUnlockDate) return;
    const capsule = {
      id: 'cap_' + Date.now(),
      sender: user,
      title: newCapTitle.trim(),
      content: newCapContent.trim(),
      unlockDate: newCapUnlockDate,
      createdAt: Date.now()
    };
    const updated = [capsule, ...capsules];
    setCapsules(updated);
    localStorage.setItem('duo_capsules', JSON.stringify(updated));
    sendCloudTogetherAction({ type: 'capsule_add', capsule });
    setShowAddCapsule(false);
    setNewCapTitle('');
    setNewCapContent('');
    setNewCapUnlockDate('');
    setNudgeAlert('کپسول زمان ایجاد و مهروموم شد! 🔒💌');
    setTimeout(() => setNudgeAlert(null), 3500);
  };

  const handleDoubleTapMessage = (msgId) => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
    if ('vibrate' in navigator) navigator.vibrate(60);

    setMessages((prev) => 
      prev.map((m) => {
        if (m.id === msgId) {
          const reacts = m.reactions || {};
          const count = (reacts['❤️'] || 0) + 1;
          const updated = { ...m, reactions: { ...reacts, ['❤️']: count } };
          saveToStore('messages', updated);
          return updated;
        }
        return m;
      })
    );
    sendCloudTogetherAction({ type: 'reaction', msgId, emoji: '❤️', sender: user });
  };

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

  const notifyUser = async (title, body) => {
    playChime();
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    // 1. Try Native Android Notification via Capacitor (for APK)
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title || 'two souls ❤️',
            body: body || '',
            id: Math.floor(Math.random() * 1000000),
            sound: 'beep.wav',
            vibrate: true,
            smallIcon: 'ic_launcher'
          }
        ]
      });
      return;
    } catch (e) {
      // Fallback for Web/Browser
    }

    // 2. Fallback to Web / PWA Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [200, 100, 200]
          });
        } catch (e) {
          if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, {
                body,
                icon: '/icon.svg',
                vibrate: [200, 100, 200]
              });
            });
          }
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  // Online / Offline Internet connection monitoring
  useEffect(() => {
    const handleOnline = () => {
      setNudgeAlert('📶 اتصال اینترنت برقرار شد');
      setTimeout(() => setNudgeAlert(null), 3000);
      if (user) {
        sendCloudPresence({ user, status: 'online', timestamp: Date.now() });
      }
    };
    const handleOffline = () => {
      setNudgeAlert('⚠️ اینترنت قطع شد');
      setTimeout(() => setNudgeAlert(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Load initial data from Multi-Vault (IndexedDB + localStorage Fail-safe Mirror)
  useEffect(() => {
    getAllFromStore('messages').then((dbItems) => {
      let vault = [];
      try {
        vault = JSON.parse(localStorage.getItem('two_souls_vault')) || [];
      } catch (e) {}
      const map = new Map();
      [...(dbItems || []), ...vault].forEach(m => {
        if (m && m.id) map.set(m.id, m);
      });
      const combined = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(combined);
      // Re-save any missing items into IndexedDB
      combined.forEach(m => saveToStore('messages', m));
    });
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
    if (messages && messages.length > 0) {
      try {
        // Multi-Vault: keep fail-safe copy in localStorage so chats never get wiped
        localStorage.setItem('two_souls_vault', JSON.stringify(messages.slice(-1000)));
      } catch (e) {}
    }
  }, [messages]);

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
          // Partner is actively messaging
          setPartnerOnline(true);
          const nowTs = Date.now();
          setPartnerLastSeen(nowTs);
          localStorage.setItem('duo_partner_last_seen', nowTs);
          if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
          presenceTimeoutRef.current = setTimeout(() => setPartnerOnline(false), 20000);

          const isChatActive = activeTab === 'chat' && document.visibilityState === 'visible';
          const msgToStore = isChatActive ? { ...msg, seen: true } : { ...msg, seen: false };

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            saveToStore('messages', msgToStore);
            return [...prev, msgToStore];
          });

          if (isChatActive) {
            sendCloudSeen({ reader: user, messageIds: [msg.id], timestamp: nowTs });
          }

          if (!msg.isHistorical) {
            if (!isChatActive) {
              const partnerDisplay = user === 'alireza' ? 'فاطمه من 🌸' : 'علیرضای من 👨‍💻';
              const previewText = msg.type === 'text' ? msg.text : msg.type === 'audio' ? 'یک پیام صوتی فرستاد 🎙️' : 'یک عکس فرستاد 📷';
              notifyUser(partnerDisplay, previewText);
            } else {
              playChime();
            }
          }
        }
      },
      onNudge: ({ sender }) => {
        if (sender !== user) {
          setPartnerOnline(true);
          const nowTs = Date.now();
          setPartnerLastSeen(nowTs);
          localStorage.setItem('duo_partner_last_seen', nowTs);
          if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
          presenceTimeoutRef.current = setTimeout(() => setPartnerOnline(false), 20000);

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
          setPartnerOnline(true);
          const nowTs = Date.now();
          setPartnerLastSeen(nowTs);
          localStorage.setItem('duo_partner_last_seen', nowTs);
          if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
          presenceTimeoutRef.current = setTimeout(() => setPartnerOnline(false), 20000);

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
      },
      onSeen: ({ reader, messageIds, timestamp }) => {
        if (reader !== user) {
          // Partner has seen our messages! Update from single tick to double tick
          setMessages((prev) => 
            prev.map((m) => {
              if (m.sender === user && (messageIds === 'all' || (Array.isArray(messageIds) && messageIds.includes(m.id)))) {
                const updated = { ...m, seen: true };
                saveToStore('messages', updated);
                return updated;
              }
              return m;
            })
          );

          // Update partner presence
          setPartnerOnline(true);
          const nowTs = timestamp || Date.now();
          setPartnerLastSeen(nowTs);
          localStorage.setItem('duo_partner_last_seen', nowTs);
          if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
          presenceTimeoutRef.current = setTimeout(() => setPartnerOnline(false), 20000);
        }
      },
      onPresence: ({ user: fromUser, status, timestamp }) => {
        if (fromUser !== user) {
          const nowTs = timestamp || Date.now();
          if (status === 'online') {
            setPartnerOnline((prevWasOnline) => {
              if (!prevWasOnline) {
                const pName = user === 'alireza' ? 'فاطمه' : 'علیرضا';
                setNudgeAlert(`🟢 ${pName} آنلاین شد!`);
                setTimeout(() => setNudgeAlert(null), 3500);
                notifyUser('وضعیت اتصال 🟢', `${pName} به اینترنت متصل و آنلاین شد!`);
              }
              return true;
            });
            setPartnerLastSeen(nowTs);
            localStorage.setItem('duo_partner_last_seen', nowTs);
            if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
            presenceTimeoutRef.current = setTimeout(() => setPartnerOnline(false), 20000);
          } else {
            setPartnerOnline(false);
            setPartnerLastSeen(nowTs);
            localStorage.setItem('duo_partner_last_seen', nowTs);
            if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
          }
        }
      },
      onProfile: (data) => {
        if (data && data.user) {
          if (data.user !== user) {
            setPartnerProfile(data);
            localStorage.setItem('two_souls_partner_profile', JSON.stringify(data));
          } else {
            setMyProfile(data);
            localStorage.setItem('two_souls_my_profile', JSON.stringify(data));
          }
        }
      },
      onTogetherAction: (action) => {
        if (!action || !action.type) return;
        if (action.type === 'touch') {
          if (action.sender !== user) {
            setPartnerBondTouching(action.touching);
            if (action.touching) {
              playChime();
              if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 300]);
            }
          }
        } else if (action.type === 'reaction') {
          setMessages((prev) => 
            prev.map((m) => {
              if (m.id === action.msgId) {
                const reacts = m.reactions || {};
                const count = (reacts[action.emoji] || 0) + 1;
                const updated = { ...m, reactions: { ...reacts, [action.emoji]: count } };
                saveToStore('messages', updated);
                return updated;
              }
              return m;
            })
          );
        } else if (action.type === 'daily_answer') {
          if (action.sender !== user) {
            setPartnerDailyAnswer(action.answer);
            localStorage.setItem('duo_partner_daily_ans', action.answer);
            playChime();
            setNudgeAlert(`عشقت به سوال روز دونفره پاسخ داد! 💌`);
            setTimeout(() => setNudgeAlert(null), 3500);
          }
        } else if (action.type === 'bucket_add') {
          setBucketList((prev) => {
            if (prev.some(b => b.id === action.item.id)) return prev;
            const updated = [action.item, ...prev];
            localStorage.setItem('duo_bucket_list', JSON.stringify(updated));
            return updated;
          });
          playChime();
          setNudgeAlert(`یک آرزوی جدید به لیست دونفره اضافه شد! 💫`);
          setTimeout(() => setNudgeAlert(null), 3500);
        } else if (action.type === 'bucket_toggle') {
          setBucketList((prev) => {
            const updated = prev.map(b => b.id === action.id ? { ...b, done: action.done } : b);
            localStorage.setItem('duo_bucket_list', JSON.stringify(updated));
            return updated;
          });
        } else if (action.type === 'capsule_add') {
          setCapsules((prev) => {
            if (prev.some(c => c.id === action.capsule.id)) return prev;
            const updated = [action.capsule, ...prev];
            localStorage.setItem('duo_capsules', JSON.stringify(updated));
            return updated;
          });
          playChime();
          setNudgeAlert(`یک کپسول زمان جدید با تاریخ قفل ایجاد شد! ⏳🔒`);
          setTimeout(() => setNudgeAlert(null), 3500);
        }
      },
      onCall: (data) => {
        handleCloudCall(data);
      }
    });

    // Broadcast our profile on startup
    const savedMyProfile = localStorage.getItem('two_souls_my_profile');
    if (savedMyProfile) {
      try {
        const parsed = JSON.parse(savedMyProfile);
        sendCloudProfile({ user, ...parsed });
      } catch (e) {}
    } else {
      sendCloudProfile({
        user,
        nickname: user === 'alireza' ? 'علیرضا' : 'فاطمه',
        bio: 'همیشه در قلب من هستی ✨❤️',
        mood: '🥰',
        avatar: ''
      });
    }
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
      seen: false, // Single tick until partner sees it
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

  const markIncomingAsSeen = () => {
    if (activeTab !== 'chat' || document.visibilityState !== 'visible' || !user) return;
    setMessages((prev) => {
      const unread = prev.filter((m) => m.sender !== user && !m.seen);
      if (unread.length === 0) return prev;

      const unreadIds = unread.map((m) => m.id);
      sendCloudSeen({ reader: user, messageIds: unreadIds, timestamp: Date.now() });

      return prev.map((m) => {
        if (unreadIds.includes(m.id)) {
          const updated = { ...m, seen: true };
          saveToStore('messages', updated);
          return updated;
        }
        return m;
      });
    });
  };

  // Heartbeat & Presence Lifecycle
  useEffect(() => {
    if (!user) return;

    sendCloudPresence({ user, status: 'online', timestamp: Date.now() });
    markIncomingAsSeen();

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        sendCloudPresence({ user, status: 'online', timestamp: Date.now() });
        markIncomingAsSeen();
      } else {
        sendCloudPresence({ user, status: 'offline', timestamp: Date.now() });
      }
    };

    const handleUnload = () => {
      sendCloudPresence({ user, status: 'offline', timestamp: Date.now() });
    };

    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('beforeunload', handleUnload);

    const hbInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendCloudPresence({ user, status: 'online', timestamp: Date.now() });
      }
    }, 25000);

    return () => {
      clearInterval(hbInterval);
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, activeTab]);

  // ----------------------------------------------------
  // Auto-scroll to latest message
  // ----------------------------------------------------
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 280;
        const lastMsg = messages[messages.length - 1];
        const isMyMsg = lastMsg && lastMsg.sender === user;
        if (isNearBottom || isMyMsg) {
          scrollToBottom('smooth');
          setShowScrollBottom(false);
        } else {
          setShowScrollBottom(true);
        }
      } else {
        scrollToBottom('auto');
      }
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [activeTab]);

  const handleMessageScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 180;
    setShowScrollBottom(!isNearBottom);
  };

  // ----------------------------------------------------
  // WebRTC 1-on-1 Voice & Video Calling
  // ----------------------------------------------------
  const startRingtone = (isIncoming = false) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(isIncoming ? 440 : 400, ctx.currentTime);
        osc2.frequency.setValueAtTime(isIncoming ? 480 : 450, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        if (isIncoming && navigator.vibrate) {
          try { navigator.vibrate([300, 200, 300]); } catch(e) {}
        }
      }, 2500);
      ringtoneOscRef.current = { interval, ctx };
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringtoneOscRef.current) {
      clearInterval(ringtoneOscRef.current.interval);
      try { ringtoneOscRef.current.ctx.close(); } catch (e) {}
      ringtoneOscRef.current = null;
    }
  };

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const createPeer = () => {
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch(e) {}
    }
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCloudCall({
          type: 'webrtc-ice',
          sender: user,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const initiateCall = async (isVideo = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user' } : false
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('لطفاً دسترسی به میکروفون/دوربین را در مرورگر یا گوشی تأیید کنید.');
      return;
    }

    setActiveCall({
      isOpen: true,
      isIncoming: false,
      isVideo,
      status: 'ringing'
    });
    startRingtone(false);

    sendCloudCall({
      type: 'call-request',
      sender: user,
      isVideo
    });
  };

  const endCall = (notifyPartner = true) => {
    stopRingtone();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch(e) {}
      peerConnectionRef.current = null;
    }
    if (notifyPartner) {
      sendCloudCall({ type: 'call-end', sender: user });
    }
    setActiveCall(null);
    setCallDuration(0);
    setIsMicMuted(false);
    setIsCamOff(false);
  };

  const acceptIncomingCall = async () => {
    stopRingtone();
    if (!activeCall) return;
    const isVideo = activeCall.isVideo;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user' } : false
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeer();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      setActiveCall((prev) => ({ ...prev, status: 'connected' }));
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);

      sendCloudCall({
        type: 'call-accepted',
        sender: user,
        isVideo
      });
    } catch (err) {
      alert('دسترسی به دوربین/میکروفون داده نشد!');
      endCall(true);
    }
  };

  const rejectIncomingCall = () => {
    stopRingtone();
    sendCloudCall({ type: 'call-rejected', sender: user });
    setActiveCall(null);
  };

  const handleCloudCall = async (data) => {
    if (!data || data.sender === user) return;

    if (data.type === 'call-request') {
      setActiveCall({
        isOpen: true,
        isIncoming: true,
        isVideo: !!data.isVideo,
        status: 'ringing'
      });
      startRingtone(true);
    } else if (data.type === 'call-accepted') {
      stopRingtone();
      setActiveCall((prev) => prev ? { ...prev, status: 'connected' } : null);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);

      const pc = createPeer();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendCloudCall({
          type: 'webrtc-offer',
          sender: user,
          sdp: offer
        });
      } catch (e) {
        console.error('Error creating offer:', e);
      }
    } else if (data.type === 'webrtc-offer') {
      const pc = peerConnectionRef.current || createPeer();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendCloudCall({
          type: 'webrtc-answer',
          sender: user,
          sdp: answer
        });
      } catch (e) {
        console.error('Error creating answer:', e);
      }
    } else if (data.type === 'webrtc-answer') {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (e) {
          console.error('Error setting remote desc:', e);
        }
      }
    } else if (data.type === 'webrtc-ice') {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {}
      }
    } else if (data.type === 'call-rejected') {
      stopRingtone();
      alert(`${partnerName} تماس را رد کرد.`);
      endCall(false);
    } else if (data.type === 'call-end') {
      endCall(false);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
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
        className={`fixed inset-0 w-full h-full flex justify-center items-center p-4 select-none overflow-y-auto ${selectedFont} ${currentTheme.isLight ? 'blush-white-bg' : ''}`}
        style={{ backgroundColor: currentTheme.bg }}
      >
        <div className={`relative w-full max-w-[390px] rounded-[36px] ${currentTheme.isLight ? 'bg-white/95 border border-pink-200 text-slate-800 shadow-xl' : 'bg-[#120a1f]/90 border border-white/15 text-white'} p-6 backdrop-blur-2xl flex flex-col items-center text-center`}>
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-400 via-rose-400 to-pink-500 flex items-center justify-center text-3xl shadow-xl border border-white/20 mb-4 animate-bounce">
            🔐
          </div>

          <h2 className={`text-xl font-extrabold ${currentTheme.isLight ? 'text-slate-900' : 'text-white'} mb-1 tracking-wider`}>two souls ❤️</h2>
          <p className={`text-xs ${currentTheme.isLight ? 'text-pink-500 font-medium' : 'text-pink-200/80'} mb-6`}>فضای کاملاً خصوصی و رمزشده علیرضا و فاطمه</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className={`${currentTheme.isLight ? 'bg-pink-50 border border-pink-100' : 'bg-black/40 border border-white/10'} p-1.5 rounded-2xl flex items-center gap-1`}>
              <button
                type="button"
                onClick={() => setSelectedRoleOnLogin('alireza')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedRoleOnLogin === 'alireza' ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow' : currentTheme.isLight ? 'text-slate-600' : 'text-white/60 hover:text-white'}`}
              >
                من علیرضا هستم 👨‍💻
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoleOnLogin('fatemeh')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedRoleOnLogin === 'fatemeh' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow' : currentTheme.isLight ? 'text-slate-600' : 'text-white/60 hover:text-white'}`}
              >
                من فاطمه هستم 🌸
              </button>
            </div>

            <div className="relative text-right">
              <label className={`text-[11px] ${currentTheme.isLight ? 'text-slate-600' : 'text-white/70'} block mb-1.5`}>شماره موبایل شما:</label>
              <div className="relative">
                <input 
                  type="tel"
                  dir="ltr"
                  placeholder="09..."
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className={`w-full ${currentTheme.isLight ? 'bg-slate-50 border border-pink-200 text-slate-800 placeholder-slate-400 focus:border-pink-500' : 'bg-black/40 border border-white/15 text-white placeholder-white/30 focus:border-pink-500'} rounded-2xl px-4 py-3 text-sm text-center font-mono transition-all`}
                />
                <Phone className={`w-4 h-4 ${currentTheme.isLight ? 'text-slate-400' : 'text-white/40'} absolute left-3.5 top-1/2 -translate-y-1/2`} />
              </div>
            </div>

            {loginError && (
              <p className="text-[11px] text-rose-500 font-medium">{loginError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all mt-2"
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
      className={`fixed inset-0 w-full h-full flex justify-center items-center p-0 select-none overflow-hidden ${selectedFont}`}
      style={{ backgroundColor: currentTheme.bg }}
    >
      <div className="relative w-full h-full sm:max-w-[430px] sm:h-[94vh] sm:max-h-[900px] bg-[#0d0915] sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl border-0 sm:border sm:border-white/10">
        
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
        <div className="shrink-0 relative z-20 px-4 pt-[max(0.65rem,env(safe-area-inset-top,10px))] pb-1.5 flex items-center justify-between text-xs">
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
            <div className={`shrink-0 px-4 py-2 mx-3 mt-1 rounded-2xl ${currentTheme.isLight ? 'bg-white/95 border border-pink-100 shadow-md' : 'glass-panel shadow-xl'} flex items-center justify-between`}>
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  setProfileTab('partner');
                  setActiveTab('profile');
                }}
                title="مشاهده پروفایل عشقم"
              >
                <div className={`relative ${partnerOnline ? 'online-aura rounded-2xl' : ''}`}>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-400 to-emerald-400 opacity-75 blur-[3px]"></div>
                  <div className={`relative w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br ${user === 'alireza' ? 'from-rose-500 to-pink-600' : 'from-blue-500 to-indigo-600'} flex items-center justify-center font-bold text-lg text-white shadow-lg border border-white/20`}>
                    {partnerProfile.avatar ? (
                      <img src={partnerProfile.avatar} alt="Partner" className="w-full h-full object-cover" />
                    ) : (
                      partnerInitial
                    )}
                  </div>
                  {partnerOnline ? (
                    <span className="absolute -bottom-1 -left-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-sm"></span>
                    </span>
                  ) : (
                    <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-2 border-white rounded-full bg-neutral-400 shadow-sm"></span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className={`font-bold text-sm tracking-tight ${currentTheme.isLight ? 'text-slate-900 group-hover:text-pink-600' : 'text-white group-hover:text-pink-300'} transition-colors`}>
                      {partnerProfile.nickname || partnerName}
                    </h1>
                    <span className="text-xs">{partnerProfile.mood || '🥰'}</span>
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 heart-pulse" />
                  </div>

                  {partnerIsTyping ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-pink-500 font-semibold mt-0.5 animate-pulse">
                      <span>در حال نوشتن...</span>
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:0.4s]"></span>
                      </span>
                      <Heart className="w-3 h-3 fill-pink-400 text-pink-400 heart-pulse" />
                    </div>
                  ) : partnerOnline ? (
                    <p className="text-[10px] text-emerald-500 mt-0.5 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>آنلاین و در کنارت ✨</span>
                      {partnerProfile.bio && (
                        <span className={`${currentTheme.isLight ? 'text-slate-400' : 'text-white/40'} truncate max-w-[110px] mr-1`}>• {partnerProfile.bio}</span>
                      )}
                    </p>
                  ) : (
                    <p className={`text-[10px] ${currentTheme.isLight ? 'text-slate-500' : 'text-white/50'} mt-0.5 font-light flex items-center gap-1`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                      <span>{formatLastSeen(partnerLastSeen)}</span>
                      {partnerProfile.bio && (
                        <span className={`${currentTheme.isLight ? 'text-slate-400' : 'text-white/40'} truncate max-w-[110px] mr-1`}>• {partnerProfile.bio}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => initiateCall(false)}
                  className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-all active:scale-90"
                  title="تماس صوتی"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => initiateCall(true)}
                  className="p-2.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-400 transition-all active:scale-90"
                  title="تماس تصویری"
                >
                  <Video className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => {
                    setProfileTab('my');
                    setActiveTab('profile');
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                  title="پروفایل من"
                >
                  <User className="w-4 h-4 text-pink-400" />
                </button>

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
            <div 
              ref={messagesContainerRef}
              onScroll={handleMessageScroll}
              className="flex-1 min-h-0 px-4 py-3 overflow-y-auto space-y-3 lux-scroll flex flex-col relative"
            >
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
                  const isRecent = !m.isHistorical && (Date.now() - (m.timestamp || 0) < 5000);

                  return (
                    <div 
                      key={m.id} 
                      id={`msg-${m.id}`}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 ${isRecent ? 'animate-msg-pop' : ''} ${highlightedMsgId === m.id ? 'scale-102 ring-2 ring-rose-400 rounded-3xl p-1 bg-rose-500/15' : ''}`}
                    >
                      <div 
                        onDoubleClick={() => handleDoubleTapMessage(m.id)}
                        onTouchStart={() => handleMessageTouchStart(m)}
                        onTouchEnd={handleMessageTouchEnd}
                        onTouchMove={handleMessageTouchMove}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedMsgForMenu(m);
                          setShowDeleteConfirm(false);
                        }}
                        className={`max-w-[85%] ${
                          isMe 
                            ? (currentTheme.isLight 
                                ? 'bubble-out bg-gradient-to-l from-pink-400 via-rose-400 to-pink-500 text-white shadow-md shadow-pink-200/50' 
                                : 'bubble-out glass-bubble-out text-white')
                            : (currentTheme.isLight 
                                ? 'bubble-in bg-white border border-pink-100 text-slate-800 shadow-sm' 
                                : 'bubble-in glass-bubble-in text-white/95')
                        } p-3.5 shadow-md group relative select-text transition-transform active:scale-[0.99]`}
                      >
                        {/* Quoted Replying Header */}
                        {m.replyTo && (
                          <div 
                            onClick={() => scrollToMessage(m.replyTo.id)}
                            className={`mb-2 p-2 rounded-xl ${currentTheme.isLight ? 'bg-pink-50/70 border-r-2 border-pink-400 text-slate-700' : 'bg-black/30 border-r-2 border-rose-400/90 text-white/80'} cursor-pointer text-right transition-colors`}
                          >
                            <div className="flex items-center gap-1 text-[10px] text-pink-500 font-medium">
                              <Reply className="w-3 h-3 inline-block rotate-180" />
                              <span>{m.replyTo.sender === user ? 'شما' : partnerName}</span>
                            </div>
                            <p className="text-[11px] truncate mt-0.5 select-none font-normal">
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

                        {/* Voice Note with Waveform */}
                        {m.type === 'audio' && (
                          <div className="flex items-center gap-2.5 w-60">
                            <button 
                              onClick={() => toggleAudio(m.id, m.text)}
                              className={`w-9 h-9 rounded-full ${isMe ? 'bg-white/25 hover:bg-white/35 text-white' : currentTheme.isLight ? 'bg-pink-500 text-white shadow-sm' : 'bg-white/20 text-white'} flex items-center justify-center active:scale-95 transition-all shrink-0`}
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 ml-0.5 fill-current" />
                              )}
                            </button>
                            <div className="flex-1 flex flex-col justify-center">
                              <div className="flex items-center gap-1 h-5">
                                {[4, 7, 3, 6, 8, 5, 7, 4, 6, 3, 5, 2].map((h, i) => (
                                  <span 
                                    key={i} 
                                    style={{ height: `${h * 2.2}px` }} 
                                    className={`w-1 rounded-full transition-all ${isAudioPlaying ? (isMe ? 'bg-white wave-bar-anim' : 'bg-pink-500 wave-bar-anim') : (isMe ? 'bg-white/50' : currentTheme.isLight ? 'bg-slate-300' : 'bg-white/30')}`}
                                  />
                                ))}
                              </div>
                              <span className={`text-[9px] ${isMe ? (currentTheme.isLight ? 'text-pink-100' : 'text-white/80') : (currentTheme.isLight ? 'text-slate-400' : 'text-white/60')} font-mono mt-0.5`}>
                                {isAudioPlaying ? 'در حال پخش...' : 'پیام صوتی دونفره'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Reaction Badges */}
                        {m.reactions && Object.keys(m.reactions).length > 0 && (
                          <div className={`flex items-center gap-1 mt-1 -mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(m.reactions).map(([emoji, count]) => (
                              <span 
                                key={emoji} 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-400/30 text-[10px] text-pink-500 font-bold shadow-sm"
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span className="text-[9px] font-mono">{count}</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta info & Action trigger */}
                        <div className={`flex items-center justify-between gap-2 mt-1 text-[9px] ${isMe ? (currentTheme.isLight ? 'text-pink-100' : 'text-white/80') : (currentTheme.isLight ? 'text-slate-400' : 'text-white/40')} font-mono`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMsgForMenu(m);
                              setShowDeleteConfirm(false);
                            }}
                            className={`opacity-50 hover:opacity-100 p-0.5 ${isMe ? 'text-white' : currentTheme.isLight ? 'text-slate-500' : 'text-white/60'} transition-opacity active:scale-90`}
                            title="گزینه‌ها (ریپلای و حذف)"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center gap-1">
                            <span>{m.time}</span>
                            {isMe && (
                              m.seen ? (
                                <CheckCheck className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-pink-100" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />

              {showScrollBottom && (
                <div className="sticky bottom-2 mx-auto z-20 pointer-events-auto">
                  <button 
                    onClick={() => scrollToBottom('smooth')}
                    className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-medium shadow-lg shadow-pink-500/30 flex items-center gap-1.5 active:scale-95 transition-all animate-bounce"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>پیام‌های جدید 👇</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input & Voice Deck */}
            <div className={`shrink-0 p-2.5 sm:p-3 ${currentTheme.isLight ? 'bg-white/95 border-pink-100/90 shadow-lg' : 'bg-black/70 border-white/10'} backdrop-blur-2xl border-t`}>
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
                    className={`p-2.5 rounded-2xl ${currentTheme.isLight ? 'bg-pink-50 hover:bg-pink-100 text-pink-500 border border-pink-100' : 'glass-panel text-rose-400 hover:text-rose-300'} active:scale-95 transition-all shadow-sm shrink-0`}
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
                    className={`p-2.5 rounded-2xl ${currentTheme.isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200' : 'glass-panel text-white/70 hover:text-white'} active:scale-95 transition-all shadow-sm shrink-0`}
                    title="ارسال عکس"
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
                      className={`w-full ${currentTheme.isLight ? 'bg-slate-50 border border-pink-200/80 text-slate-800 placeholder-slate-400 focus:ring-pink-300' : 'glass-input text-white placeholder-white/40 focus:ring-pink-500/60'} rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 transition-all shadow-inner`}
                    />
                  </div>

                  {inputVal.trim() ? (
                    <button 
                      type="submit" 
                      className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-500 text-white active:scale-95 transition-all shadow-lg flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4 rotate-180" />
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={startRecording}
                      className={`p-2.5 rounded-2xl ${currentTheme.isLight ? 'bg-pink-50 hover:bg-pink-100 text-pink-500 border border-pink-200' : 'glass-panel text-white/80'} active:scale-95 transition-all shadow-lg flex items-center justify-center shrink-0`}
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
        {/* TAB 2: TOGETHER (با هم - لمس همزمان، سوال روز، آرزوها، کپسول) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'together' && (
          <div className="flex-1 flex flex-col overflow-y-auto lux-scroll relative z-10 p-4">
            
            {/* Header & Sub-tab Pill Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-pink-100/50 mb-4">
              <div>
                <h2 className={`text-sm font-bold ${currentTheme.isLight ? 'text-slate-900' : 'text-white'} flex items-center gap-1.5`}>
                  <HeartHandshake className="w-4 h-4 text-pink-500" />
                  <span>فضای پیوند دونفره</span>
                </h2>
                <p className={`text-[10px] ${currentTheme.isLight ? 'text-slate-500' : 'text-pink-200/60'} mt-0.5`}>
                  لحظات پیوند همزمان، سوال روز، آرزوها و کپسول زمان
                </p>
              </div>
            </div>

            {/* Sub-tab navigation */}
            <div className={`flex p-1 rounded-2xl ${currentTheme.isLight ? 'bg-pink-50/90 border border-pink-100' : 'bg-white/10 border border-white/10'} mb-4 text-xs font-semibold`}>
              <button
                type="button"
                onClick={() => setTogetherSubTab('bond')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${togetherSubTab === 'bond' ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-md' : currentTheme.isLight ? 'text-slate-600' : 'text-white/60'}`}
              >
                <span>🫀</span>
                <span>لمس همزمان</span>
              </button>
              <button
                type="button"
                onClick={() => setTogetherSubTab('question')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${togetherSubTab === 'question' ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-md' : currentTheme.isLight ? 'text-slate-600' : 'text-white/60'}`}
              >
                <span>💌</span>
                <span>سوال روز</span>
              </button>
              <button
                type="button"
                onClick={() => setTogetherSubTab('bucket')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${togetherSubTab === 'bucket' ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-md' : currentTheme.isLight ? 'text-slate-600' : 'text-white/60'}`}
              >
                <span>✨</span>
                <span>آرزوها</span>
              </button>
              <button
                type="button"
                onClick={() => setTogetherSubTab('capsule')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${togetherSubTab === 'capsule' ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-md' : currentTheme.isLight ? 'text-slate-600' : 'text-white/60'}`}
              >
                <span>⏳</span>
                <span>کپسول</span>
              </button>
            </div>

            {/* SUB-TAB 1: TWO SOULS BOND TOUCH */}
            {togetherSubTab === 'bond' && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center animate-fadeIn">
                <div className="relative my-6 select-none cursor-pointer">
                  {/* Outer pulsating rings */}
                  {(myBondTouching && partnerBondTouching) && (
                    <div className="absolute -inset-8 rounded-full bg-pink-400/30 blur-2xl animate-ping"></div>
                  )}
                  <div className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border-4 ${
                    myBondTouching && partnerBondTouching 
                      ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 border-white scale-110 shadow-pink-500/50' 
                      : myBondTouching 
                        ? 'bg-gradient-to-tr from-rose-400 to-pink-500 border-pink-300 scale-105' 
                        : partnerBondTouching 
                          ? 'bg-pink-100 border-pink-400 animate-pulse' 
                          : currentTheme.isLight ? 'bg-white border-pink-200' : 'bg-white/5 border-white/20'
                  }`}
                    onMouseDown={handleBondTouchStart}
                    onMouseUp={handleBondTouchEnd}
                    onTouchStart={handleBondTouchStart}
                    onTouchEnd={handleBondTouchEnd}
                  >
                    <Heart className={`w-16 h-16 ${myBondTouching || partnerBondTouching ? 'fill-white text-white' : 'text-pink-400'} heart-pulse`} />
                    <span className={`text-[11px] font-bold mt-2 ${myBondTouching || partnerBondTouching ? 'text-white' : currentTheme.isLight ? 'text-slate-600' : 'text-white/70'}`}>
                      {myBondTouching && partnerBondTouching 
                        ? '❤️ پیوند قلب‌ها برقرار شد!' 
                        : myBondTouching 
                          ? 'در حال لمس... منتظر عشقت' 
                          : partnerBondTouching 
                            ? 'عشقت صفحه را لمس کرده! 💓' 
                            : 'انگشتت را اینجا نگه دار'}
                    </span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl max-w-xs ${currentTheme.isLight ? 'bg-white border border-pink-100 text-slate-700 shadow-sm' : 'bg-white/5 border border-white/10 text-white/80'} text-xs leading-relaxed`}>
                  <p className="font-semibold text-pink-500 mb-1">✨ نحوه کارکرد تپش همزمان:</p>
                  <p>وقتی هر دو نفر همزمان انگشتتان را روی قلب نگه دارید، حلقه نوری متصل شده و گوشی هر دو به‌صورت همزمان ویبره ضربان قلب می‌زند.</p>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: DAILY COUPLE QUESTION */}
            {togetherSubTab === 'question' && (
              <div className="space-y-4 animate-fadeIn">
                <div className={`p-4 rounded-3xl ${currentTheme.isLight ? 'bg-white border border-pink-100 shadow-sm' : 'glass-panel'} text-right`}>
                  <span className="text-[10px] font-bold text-pink-500 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200">
                    سوال اختصاصی امروز 💌
                  </span>
                  <h3 className={`text-sm font-bold ${currentTheme.isLight ? 'text-slate-800' : 'text-white'} mt-2 leading-relaxed`}>
                    « {currentDailyQuestion} »
                  </h3>
                </div>

                {/* My Answer */}
                <div className={`p-4 rounded-3xl ${currentTheme.isLight ? 'bg-white border border-pink-100 shadow-sm' : 'glass-panel'} text-right`}>
                  <h4 className="text-xs font-bold text-pink-500 mb-2">پاسخ شما:</h4>
                  {myDailyAnswer ? (
                    <div className={`p-3 rounded-2xl ${currentTheme.isLight ? 'bg-pink-50/70 border border-pink-100 text-slate-800' : 'bg-white/10 text-white'} text-xs leading-relaxed`}>
                      {myDailyAnswer}
                    </div>
                  ) : (
                    <form onSubmit={handleSaveDailyAnswer} className="space-y-2">
                      <textarea
                        rows={3}
                        value={dailyInput}
                        onChange={(e) => setDailyInput(e.target.value)}
                        placeholder="پاسخ صمیمانه خودت را اینجا بنویس..."
                        className={`w-full p-3 rounded-2xl text-xs ${currentTheme.isLight ? 'bg-slate-50 border border-pink-200 text-slate-800 placeholder-slate-400' : 'bg-white/5 border border-white/10 text-white'} focus:outline-none focus:ring-1 focus:ring-pink-400 resize-none`}
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold text-xs shadow-md active:scale-98"
                      >
                        ثبت پاسخ من ✨
                      </button>
                    </form>
                  )}
                </div>

                {/* Partner's Answer */}
                <div className={`p-4 rounded-3xl ${currentTheme.isLight ? 'bg-white border border-pink-100 shadow-sm' : 'glass-panel'} text-right`}>
                  <h4 className="text-xs font-bold text-pink-500 mb-2">پاسخ {partnerName}:</h4>
                  {myDailyAnswer && partnerDailyAnswer ? (
                    <div className={`p-3 rounded-2xl ${currentTheme.isLight ? 'bg-rose-50/80 border border-rose-200 text-slate-800' : 'bg-rose-950/40 text-white'} text-xs leading-relaxed animate-fadeIn`}>
                      « {partnerDailyAnswer} »
                    </div>
                  ) : partnerDailyAnswer && !myDailyAnswer ? (
                    <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 text-center text-xs text-slate-600">
                      <p className="font-bold text-pink-600 mb-1">🔒 پاسخ عشقتان آماده است!</p>
                      <p className="text-[11px]">برای فاش شدن و خواندن پاسخ، ابتدا پاسخ خود را در بالا بنویسید.</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      هنوز پاسخی از طرف عشقتان ثبت نشده است ⏳
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: SHARED BUCKET LIST */}
            {togetherSubTab === 'bucket' && (
              <div className="space-y-3 animate-fadeIn">
                <form onSubmit={handleAddBucketItem} className="flex gap-2">
                  <input
                    type="text"
                    value={newBucketTitle}
                    onChange={(e) => setNewBucketTitle(e.target.value)}
                    placeholder="یک آرزو یا برنامه دونفره جدید بنویسید..."
                    className={`flex-1 px-3.5 py-2.5 rounded-2xl text-xs ${currentTheme.isLight ? 'bg-white border border-pink-200 text-slate-800 placeholder-slate-400' : 'bg-white/5 border border-white/10 text-white'} focus:outline-none focus:ring-1 focus:ring-pink-400`}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-500 text-white text-xs font-bold shadow-md shrink-0 active:scale-95"
                  >
                    افزودن ✨
                  </button>
                </form>

                <div className="space-y-2 mt-2">
                  {bucketList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleBucket(item.id, item.done)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        item.done 
                          ? currentTheme.isLight ? 'bg-pink-50/60 border-pink-200 text-slate-400 line-through' : 'bg-white/5 border-white/10 text-white/50 line-through' 
                          : currentTheme.isLight ? 'bg-white border-pink-100 text-slate-800 shadow-sm' : 'bg-white/5 border-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${item.done ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-300'}`}>
                          {item.done && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs font-medium">{item.title}</span>
                      </div>
                      <span className="text-[9px] text-pink-400 font-mono">
                        {item.addedBy}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 4: TIME CAPSULES */}
            {togetherSubTab === 'capsule' && (
              <div className="space-y-3 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setShowAddCapsule(!showAddCapsule)}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-500 text-white text-xs font-bold shadow-md active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Gift className="w-4 h-4" />
                  <span>ایجاد کپسول زمان جدید 💌</span>
                </button>

                {showAddCapsule && (
                  <form onSubmit={handleAddCapsule} className={`p-4 rounded-3xl ${currentTheme.isLight ? 'bg-white border border-pink-200 shadow-md' : 'glass-panel'} space-y-2.5 animate-fadeIn`}>
                    <input
                      type="text"
                      value={newCapTitle}
                      onChange={(e) => setNewCapTitle(e.target.value)}
                      placeholder="عنوان کپسول (مثلاً: برای سالگردمون)"
                      className={`w-full px-3 py-2 rounded-xl text-xs ${currentTheme.isLight ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-white/5 border border-white/10 text-white'} focus:outline-none`}
                    />
                    <textarea
                      rows={3}
                      value={newCapContent}
                      onChange={(e) => setNewCapContent(e.target.value)}
                      placeholder="نامه یا یادداشت محرمانه شما که تا تاریخ مشخص قفل می‌ماند..."
                      className={`w-full p-3 rounded-xl text-xs ${currentTheme.isLight ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-white/5 border border-white/10 text-white'} focus:outline-none resize-none`}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">تاریخ باز شدن:</span>
                      <input
                        type="date"
                        value={newCapUnlockDate}
                        onChange={(e) => setNewCapUnlockDate(e.target.value)}
                        className={`flex-1 px-3 py-1.5 rounded-xl text-xs ${currentTheme.isLight ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-white/5 border border-white/10 text-white'} focus:outline-none`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-pink-500 text-white text-xs font-bold shadow active:scale-98"
                    >
                      مهروموم کردن و قفل کپسول 🔒
                    </button>
                  </form>
                )}

                <div className="space-y-2.5 mt-2">
                  {capsules.map((cap) => {
                    const isUnlocked = new Date(cap.unlockDate).getTime() <= Date.now();
                    return (
                      <div
                        key={cap.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isUnlocked 
                            ? currentTheme.isLight ? 'bg-white border-pink-200 shadow-sm' : 'glass-panel' 
                            : currentTheme.isLight ? 'bg-pink-50/50 border-pink-100' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-pink-500 flex items-center gap-1.5">
                            {isUnlocked ? '🔓' : '🔒'}
                            <span>{cap.title}</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cap.unlockDate}
                          </span>
                        </div>
                        {isUnlocked ? (
                          <p className="text-xs leading-relaxed text-slate-700 mt-2">
                            {cap.content}
                          </p>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-white/40 border border-pink-100 text-center text-[11px] text-slate-500 mt-2">
                            ⏳ این کپسول تا تاریخ <span className="font-bold text-pink-500 font-mono">{cap.unlockDate}</span> قفل است و نمی‌توان آن را باز کرد.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: MEMORIES & MILESTONES */}
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
        {/* TAB 4: PROFILE SCREEN */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'profile' && (
          <div className="flex-1 flex flex-col overflow-y-auto lux-scroll relative z-10 p-4">
            
            {/* Header & Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-pink-400" />
                  <span>پروفایل و حس‌وحال عاشقانه</span>
                </h2>
                <p className="text-[10px] text-pink-200/60 mt-0.5">مدیریت آواتار، وضعیت روحی و بیوگرافی مشترک</p>
              </div>

              {/* Segment Toggle */}
              <div className="flex p-0.5 rounded-xl bg-white/10 border border-white/10">
                <button
                  type="button"
                  onClick={() => setProfileTab('my')}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${profileTab === 'my' ? 'bg-pink-500 text-white font-bold shadow' : 'text-white/60 hover:text-white'}`}
                >
                  پروفایل من
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('partner')}
                  className={`px-3 py-1 text-xs rounded-lg transition-all ${profileTab === 'partner' ? 'bg-pink-500 text-white font-bold shadow' : 'text-white/60 hover:text-white'}`}
                >
                  عشقم 🌸
                </button>
              </div>
            </div>

            {profileTab === 'my' ? (
              /* MY PROFILE (EDITABLE) */
              <form onSubmit={handleSaveProfile} className="space-y-4 pb-6">
                {/* Avatar Picker */}
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 opacity-75 blur-[6px] animate-pulse"></div>
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#1c122c] border-2 border-pink-400/80 flex items-center justify-center shadow-xl">
                      {editAvatar ? (
                        <img src={editAvatar} alt="My Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-pink-300">
                          {user === 'alireza' ? 'ع' : 'ف'}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white mb-0.5" />
                        <span className="text-[9px] text-white/90">تغییر عکس</span>
                      </div>
                    </div>
                  </div>
                  <input 
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <p className="text-[11px] text-pink-300/80 mt-2 font-medium">عکس پروفایل خود را لمس کنید</p>
                </div>

                {/* Nickname Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/80 font-medium flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-pink-400" />
                    <span>لقب یا نام شما (برای عشقتان نمایش داده می‌شود):</span>
                  </label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder={user === 'alireza' ? 'علیرضا' : 'فاطمه'}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/60 transition-colors"
                  />
                </div>

                {/* Mood Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/80 font-medium flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-pink-400" />
                    <span>حس‌وحال و وضعیت الان شما:</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOOD_OPTIONS.map((item) => (
                      <button
                        key={item.emoji}
                        type="button"
                        onClick={() => setEditMood(item.emoji)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          editMood === item.emoji 
                            ? 'bg-pink-500/25 border-pink-400 text-white shadow-md shadow-pink-900/30 scale-102 font-bold' 
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <span className="text-[9px]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Romantic Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/80 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>جمله دلنشین / بیو عاشقانه شما:</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="یک متن عاشقانه بنویسید که در بالای چت همسرتان بدرخشد..."
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/60 transition-colors resize-none lux-scroll"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-pink-900/40 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره و ارسال زنده به عشقم ✨❤️</span>
                </button>
              </form>
            ) : (
              /* PARTNER PROFILE VIEW */
              <div className="space-y-4 pb-6 animate-fadeIn">
                <div className="p-5 rounded-3xl glass-panel border border-pink-500/20 text-center relative overflow-hidden shadow-2xl">
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  {/* Partner Avatar */}
                  <div className="relative inline-block mx-auto mb-3">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-500 opacity-80 blur-[6px] animate-pulse"></div>
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#1c122c] border-2 border-pink-400/90 flex items-center justify-center shadow-xl">
                      {partnerProfile.avatar ? (
                        <img src={partnerProfile.avatar} alt="Partner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-pink-300">{partnerInitial}</span>
                      )}
                    </div>
                    <span className={`absolute bottom-0 left-1 w-5 h-5 border-2 border-[#120a1f] rounded-full shadow ${partnerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`}></span>
                  </div>

                  {/* Partner Name & Mood */}
                  <h3 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                    <span>{partnerProfile.nickname || partnerName}</span>
                    <span className="text-lg">{partnerProfile.mood || '🥰'}</span>
                  </h3>

                  {/* Partner Online Status */}
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                    {partnerOnline ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        هم‌اکنون آنلاین و در کنارت
                      </span>
                    ) : (
                      <span className="text-white/50 font-light">
                        {formatLastSeen(partnerLastSeen)}
                      </span>
                    )}
                  </div>

                  {/* Partner Bio */}
                  {partnerProfile.bio ? (
                    <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-pink-200/90 italic">
                      « {partnerProfile.bio} »
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-white/40">هنوز متنی در بیوگرافی نوشته نشده است</p>
                  )}

                  {/* Quick Action Button */}
                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={sendNudge}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-rose-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                      <span>ارسال تپش قلب (ویبره)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>ارسال پیام</span>
                    </button>
                  </div>
                </div>

                {/* Love Counter Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Heart className="w-5 h-5 fill-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">روزهای عاشقی ما</p>
                      <p className="text-[10px] text-white/50">لحظاتی که قلب‌هامون به هم وصل بوده</p>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-lg font-bold text-pink-400">{realDays || 1}</span>
                    <span className="text-xs text-white/60 mr-1">روز</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* BOTTOM NAVIGATION BAR */}
        {/* ---------------------------------------------------- */}
        <div className={`shrink-0 relative z-30 ${currentTheme.isLight ? 'bg-white/95 border-pink-100 shadow-xl' : 'bg-black/90 border-white/10 shadow-2xl'} backdrop-blur-2xl border-t px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,18px))] flex items-center justify-around transition-colors`}>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${activeTab === 'chat' ? 'text-pink-500 font-bold scale-105' : currentTheme.isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'}`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px]">گفتگو</span>
          </button>

          <button 
            onClick={() => setActiveTab('together')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${activeTab === 'together' ? 'text-pink-500 font-bold scale-105' : currentTheme.isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'}`}
          >
            <HeartHandshake className="w-5 h-5" />
            <span className="text-[10px]">با هم</span>
          </button>

          <button 
            onClick={() => setActiveTab('memories')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${activeTab === 'memories' ? 'text-pink-500 font-bold scale-105' : currentTheme.isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'}`}
          >
            <BookHeart className="w-5 h-5" />
            <span className="text-[10px]">خاطرات</span>
          </button>

          <button 
            onClick={() => setActiveTab('playlist')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${activeTab === 'playlist' ? 'text-pink-500 font-bold scale-105' : currentTheme.isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'}`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[10px]">موزیک</span>
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${activeTab === 'profile' ? 'text-pink-500 font-bold scale-105' : currentTheme.isLight ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white/80'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">پروفایل</span>
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
            <div className="bg-[#140d21] border-t border-white/20 rounded-t-[36px] p-5 pb-[max(1.75rem,env(safe-area-inset-bottom,24px))] max-h-[85%] overflow-y-auto lux-scroll shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  <h3 className="font-bold text-sm text-white">تنظیمات two souls</h3>
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

              {/* Notification Permission & Test */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <button 
                  onClick={async () => {
                    let granted = false;
                    try {
                      const res = await LocalNotifications.requestPermissions();
                      if (res && res.display === 'granted') granted = true;
                    } catch (e) {}

                    if (!granted && typeof window !== 'undefined' && 'Notification' in window) {
                      try {
                        const perm = await Notification.requestPermission();
                        if (perm === 'granted') granted = true;
                      } catch (e) {}
                    }

                    try {
                      await notifyUser('two souls ❤️', 'سیستم اعلان‌ها و نوتیفیکیشن با موفقیت فعال شد!');
                      setNudgeAlert('🔔 نوتیفیکیشن با موفقیت فعال شد!');
                      setTimeout(() => setNudgeAlert(null), 3000);
                    } catch (err) {
                      setNudgeAlert('🔔 اعلان فعال شد');
                      setTimeout(() => setNudgeAlert(null), 3000);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mb-2"
                >
                  <Bell className="w-4 h-4 text-pink-400" />
                  <span>فعال‌سازی و تست اعلان‌ها (نوتیفیکیشن) 🔔</span>
                </button>
              </div>

              {/* Permanent Chat History Backup */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <button 
                  onClick={() => {
                    try {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `two_souls_backup_${new Date().toISOString().slice(0,10)}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      setNudgeAlert('💾 نسخه پشتیبان دانلود و ذخیره شد!');
                      setTimeout(() => setNudgeAlert(null), 3500);
                    } catch (e) {
                      setNudgeAlert('⚠️ خطا در دریافت پشتیبان');
                      setTimeout(() => setNudgeAlert(null), 3000);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>پشتیبان‌گیری و دانلود تاریخچه پیام‌ها 💾</span>
                </button>
                <p className="text-[10px] text-white/40 text-center mt-1">پیام‌های شما در صندوق چندلایه ذخیره شده و هیچ‌وقت پاک نمی‌شوند.</p>
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

        {/* ================= 1-ON-1 CALL OVERLAY ================= */}
        {activeCall && (
          <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 animate-fadeIn text-white select-none">
            
            {/* Top Bar / Status */}
            <div className="w-full max-w-sm flex flex-col items-center pt-8 space-y-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-pink-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{activeCall.isVideo ? 'تماس تصویری دونفره 📹' : 'تماس صوتی اختصاصی 🎙️'}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-1">
                {partnerProfile.nickname || partnerName}
              </h2>
              <p className="text-xs text-white/60">
                {activeCall.status === 'connected' ? (
                  <span className="font-mono text-emerald-400 font-bold">{formatSeconds(callDuration)}</span>
                ) : activeCall.isIncoming ? (
                  'در حال تماس با شما... 🌸'
                ) : (
                  'در حال برقراری تماس... 📞'
                )}
              </p>
            </div>

            {/* Middle: Video Screens OR Romantic Avatar */}
            <div className="relative flex-1 w-full max-w-md my-4 flex items-center justify-center overflow-hidden rounded-3xl bg-black/40 border border-white/10 shadow-2xl">
              {activeCall.isVideo && activeCall.status === 'connected' ? (
                <>
                  {/* Remote Full Video */}
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover rounded-3xl"
                  />
                  {/* Local PiP Video */}
                  <div className="absolute bottom-4 left-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-pink-400 shadow-xl bg-black/80 z-20">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
                    />
                    {isCamOff && (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-[10px]">
                        <VideoOff className="w-5 h-5 mb-1" />
                        <span>دوربین خاموش</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Avatar with Pulsing Aura */
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 opacity-60 blur-xl animate-pulse"></div>
                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-5xl font-bold text-white">
                      {partnerProfile.avatar ? (
                        <img src={partnerProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        partnerInitial
                      )}
                    </div>
                  </div>
                  
                  {activeCall.status === 'connected' && (
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500 heart-pulse" />
                      <span className="text-xs text-pink-200">صدای آرامش‌بخش تو...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="w-full max-w-sm flex items-center justify-center gap-6 pb-6">
              {activeCall.status === 'ringing' && activeCall.isIncoming ? (
                /* Incoming Call: Accept (Green) or Reject (Red) */
                <div className="flex items-center justify-around w-full px-4">
                  <button 
                    onClick={rejectIncomingCall}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-90 transition-all"
                    title="رد تماس"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>

                  <button 
                    onClick={acceptIncomingCall}
                    className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-bounce active:scale-90 transition-all"
                    title="پاسخ به تماس"
                  >
                    <PhoneCall className="w-7 h-7" />
                  </button>
                </div>
              ) : (
                /* Connected or Outgoing Call Controls */
                <div className="flex items-center justify-center gap-4 w-full">
                  {/* Mute Mic */}
                  <button 
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full ${isMicMuted ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' : 'bg-white/10 text-white hover:bg-white/20'} flex items-center justify-center active:scale-95 transition-all`}
                    title={isMicMuted ? 'وصل میکروفون' : 'قطع میکروفون'}
                  >
                    {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Toggle Video (if video call) */}
                  {activeCall.isVideo && (
                    <button 
                      onClick={toggleCam}
                      className={`w-12 h-12 rounded-full ${isCamOff ? 'bg-rose-500/30 text-rose-400 border border-rose-500/50' : 'bg-white/10 text-white hover:bg-white/20'} flex items-center justify-center active:scale-95 transition-all`}
                      title={isCamOff ? 'روشن کردن دوربین' : 'خاموش کردن دوربین'}
                    >
                      {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}

                  {/* Send In-Call Heart Spark */}
                  <button 
                    onClick={() => {
                      sendNudge();
                      setShowHeartBurst(true);
                      setTimeout(() => setShowHeartBurst(false), 1200);
                    }}
                    className="w-12 h-12 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-400 flex items-center justify-center active:scale-90 transition-all"
                    title="ارسال تپش قلب حین مکالمه 💖"
                  >
                    <Heart className="w-6 h-6 fill-current animate-pulse" />
                  </button>

                  {/* End Call (Red) */}
                  <button 
                    onClick={() => endCall(true)}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-90 transition-all mr-2"
                    title="قطع تماس"
                  >
                    <PhoneOff className="w-6 h-6" />
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
