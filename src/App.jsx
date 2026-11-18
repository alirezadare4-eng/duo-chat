import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Heart, 
  Send, 
  Mic, 
  Square, 
  Image as ImageIcon, 
  Palette, 
  Play, 
  ShieldCheck, 
  Settings, 
  X, 
  Type, 
  Upload, 
  RotateCcw, 
  Check, 
  Cloud, 
  Phone, 
  LogOut, 
  Calendar,
  Smile
} from 'lucide-react';
import { initCloudSync, sendCloudMessage, sendCloudNudge, sendCloudTyping } from './cloudSync';

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

export default function App() {
  // Authentication
  const [myPhone, setMyPhone] = useState(() => localStorage.getItem('duo_my_phone') || '');
  const [user, setUser] = useState(() => localStorage.getItem('duo_user') || '');

  // Relationship Start Date (Real days calculation)
  const [startDate, setStartDate] = useState(() => localStorage.getItem('duo_start_date') || '');
  
  // Custom Bio/Status for each user
  const [myBio, setMyBio] = useState(() => localStorage.getItem('duo_my_bio') || '');
  const [partnerBio, setPartnerBio] = useState(() => localStorage.getItem('duo_partner_bio') || '');

  // UI state for login
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

  // Live Partner Typing Status (Realtime)
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Clean empty messages
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('duo_messages');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return parsed.filter(m => m.id !== '1' && m.id !== '2');
      } catch (e) {}
    }
    return [];
  });

  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [nudgeAlert, setNudgeAlert] = useState(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

  // Sync messages
  useEffect(() => {
    localStorage.setItem('duo_messages', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
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
      }
    });
  }, [user]);

  // Calculate REAL relationship days
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

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInputVal(e.target.value);
    sendCloudTyping(user);
  };

  const sendMessage = (type = 'text', content = '') => {
    const textToSend = content || inputVal.trim();
    if (!textToSend && type === 'text') return;

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    const newMsg = {
      id: Date.now().toString(),
      sender: user,
      text: textToSend,
      time: timeStr,
      type
    };

    setMessages((prev) => [...prev, newMsg]);
    if (type === 'text') setInputVal('');

    sendCloudMessage(newMsg);
    socket.emit('send_message', newMsg);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          sendMessage('audio', reader.result);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('دسترسی به میکروفون داده نشد.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendMessage('image', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomBg(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const currentTheme = THEMES[themeIdx];

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!myPhone || !user) {
    return (
      <div 
        className={`flex justify-center items-center w-full min-h-screen p-4 select-none ${selectedFont}`}
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
  // MAIN REAL ANDROID CHAT SCREEN
  // ----------------------------------------------------
  return (
    <div 
      className={`flex justify-center items-center w-full min-h-screen p-0 select-none ${selectedFont}`}
      style={{ backgroundColor: currentTheme.bg }}
    >
      {/* Full-bleed Mobile Container */}
      <div className="relative w-full sm:max-w-[430px] h-screen bg-[#0d0915] sm:rounded-[36px] overflow-hidden flex flex-col shadow-2xl border-0 sm:border sm:border-white/10">
        
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

        {/* Top Info Bar (Clean & Real) */}
        <div className="relative z-20 px-4 pt-3 pb-1 flex items-center justify-between text-xs">
          {/* Real Anniversary Days or Private badge */}
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

          {/* User Account / Logout */}
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

        {/* Real Profile Header */}
        <div className="relative z-20 px-4 py-2.5 mx-3 mt-1 rounded-2xl glass-panel flex items-center justify-between shadow-xl">
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

              {/* REAL Status: Live Typing or Online */}
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
              title="تنظیمات، تاریخ سالگرد، فونت و پس‌زمینه"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="relative z-10 flex-1 px-4 py-3 overflow-y-auto space-y-3 lux-scroll flex flex-col">
          
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
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className={`max-w-[82%] rounded-[22px] ${isMe ? 'rounded-tl-md glass-bubble-out text-white' : 'rounded-tr-md glass-bubble-in text-white/95'} p-3.5 shadow-md`}>
                    
                    {m.type === 'text' && (
                      <p className="text-xs leading-relaxed font-normal">{m.text}</p>
                    )}

                    {m.type === 'image' && (
                      <div className="rounded-xl overflow-hidden border border-white/20 mb-1">
                        <img src={m.text} alt="یادگاری" className="max-h-56 w-full object-cover" />
                      </div>
                    )}

                    {m.type === 'audio' && (
                      <div className="flex items-center gap-3 w-56">
                        <button 
                          onClick={() => {
                            const audio = new Audio(m.text);
                            audio.play();
                          }}
                          className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white active:scale-95"
                        >
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </button>
                        <div className="flex-1">
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="w-1/2 h-full bg-white rounded-full animate-pulse"></div>
                          </div>
                          <span className="text-[9px] text-white/70 mt-1 block">پیام صوتی اختصاصی</span>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-white/80' : 'text-white/40'} font-mono`}>
                      <span>{m.time}</span>
                      {isMe && <span className="font-bold">✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Fullscreen Heart Burst Overlay */}
        {showHeartBurst && (
          <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
            <div className="text-8xl animate-ping opacity-90">💖</div>
          </div>
        )}

        {/* Nudge Alert Toast */}
        {nudgeAlert && (
          <div className="relative z-30 mx-4 mb-2 p-3 rounded-2xl bg-gradient-to-r from-rose-500/90 to-purple-600/90 backdrop-blur-xl border border-white/20 text-white text-xs shadow-lg flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2">
              <span className="text-lg">💓</span>
              <p className="font-medium text-[11px]">{nudgeAlert}</p>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="relative z-20 p-3 bg-black/60 backdrop-blur-2xl border-t border-white/10 pb-5 sm:pb-3">
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
              className="p-2.5 rounded-2xl glass-panel text-rose-400 hover:text-rose-300 active:scale-95 transition-all shadow-md"
              title="ارسال قلب"
            >
              ❤️
            </button>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl glass-panel text-white/70 hover:text-white active:scale-95 transition-all shadow-md"
              title="ارسال عکس"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <input 
                type="text" 
                value={inputVal}
                onChange={handleInputChange}
                placeholder={`پیامی برای ${partnerName}...`}
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
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-2xl ${isRecording ? 'bg-rose-600 animate-pulse' : 'glass-panel text-white/80'} text-white active:scale-95 transition-all shadow-lg flex items-center justify-center shrink-0`}
                title={isRecording ? 'پایان ضبط' : 'ضبط وویس'}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </form>
        </div>

        {/* Customization Settings Bottom Sheet */}
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

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                بستن تنظیمات ✨
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
