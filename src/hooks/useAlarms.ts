import { useState, useEffect, useRef } from 'react';
import { useSupabase } from './useSupabase';
import type { AlarmItem } from './useSupabase';

// Web Audio API Sound Synthesizer for Alarm Ringtone
class AlarmAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;

  start() {
    if (this.intervalId) return;

    // Initialize AudioContext on user interaction
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();
    
    // Play a dual-tone pulse every 1.2 seconds
    const playTone = () => {
      if (!this.audioCtx) return;
      
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.4); // A5
      
      osc2.frequency.setValueAtTime(293.66, this.audioCtx.currentTime); // D4
      osc2.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.4); // A4

      gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start();
      osc2.start();
      
      osc1.stop(this.audioCtx.currentTime + 0.6);
      osc2.stop(this.audioCtx.currentTime + 0.6);
    };

    // Immediate first chime
    playTone();
    this.intervalId = window.setInterval(playTone, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().then(() => {
        this.audioCtx = null;
      });
    }
  }
}

const audioPlayer = new AlarmAudioPlayer();

export const useAlarms = () => {
  const { user, syncAlarms, saveAlarm: dbSaveAlarm, deleteAlarm: dbDeleteAlarm } = useSupabase();
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [firingAlarm, setFiringAlarm] = useState<AlarmItem | null>(null);
  
  // Track fired alarms in the current minute to prevent double triggers
  const firedTracker = useRef<{ [key: string]: string }>({});

  // Request Notification Permissions
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  // Load and sync alarms
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem('kimi_chat_alarms') || '[]');
    setAlarms(local);

    if (user) {
      syncAlarms(local).then((synced) => {
        setAlarms(synced);
        localStorage.setItem('kimi_chat_alarms', JSON.stringify(synced));
      });
    }
  }, [user]);

  // Check alarms loop (runs every 10 seconds)
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = weekdays[now.getDay()];

      const timeKey = `${now.toDateString()}_${currentTimeStr}`;

      alarms.forEach((alarm) => {
        if (!alarm.active) return;
        
        // Match time
        if (alarm.time === currentTimeStr) {
          // Match day (or if no specific days are selected, treat as everyday)
          const matchesDay = alarm.days.length === 0 || alarm.days.includes(currentDay);
          
          if (matchesDay && firedTracker.current[alarm.id] !== timeKey) {
            triggerAlarm(alarm);
            firedTracker.current[alarm.id] = timeKey;
          }
        }
      });
    };

    const interval = setInterval(checkAlarms, 10000);
    // Initial check
    checkAlarms();

    return () => clearInterval(interval);
  }, [alarms]);

  const triggerAlarm = (alarm: AlarmItem) => {
    setFiringAlarm(alarm);
    
    // Play synthesizer chime
    audioPlayer.start();

    // Trigger local notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(alarm.label || 'Alarma de Kimi Chat', {
          body: `¡Es hora! Alarma programada para las ${alarm.time}`,
          icon: '/favicon.svg',
          requireInteraction: true,
          vibrate: [200, 100, 200]
        } as any);
      } catch (err) {
        // Fallback for some mobile browsers that don't support new Notification inside client
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TRIGGER_NOTIFICATION',
            title: alarm.label || 'Alarma de Kimi Chat',
            body: `¡Es hora! Alarma programada para las ${alarm.time}`
          });
        }
      }
    }
  };

  const stopFiringAlarm = () => {
    audioPlayer.stop();
    setFiringAlarm(null);
  };

  const addAlarm = async (time: string, label: string, days: string[]) => {
    const newAlarm: AlarmItem = {
      id: crypto.randomUUID(),
      time,
      label: label || 'Nueva Alarma',
      days,
      active: true,
      user_id: user?.id
    };

    const updated = [...alarms, newAlarm];
    setAlarms(updated);
    localStorage.setItem('kimi_chat_alarms', JSON.stringify(updated));

    if (user) {
      await dbSaveAlarm(newAlarm);
    }
  };

  const toggleAlarm = async (id: string) => {
    const updated = alarms.map((alarm) => {
      if (alarm.id === id) {
        const nextState = { ...alarm, active: !alarm.active };
        if (user) {
          dbSaveAlarm(nextState);
        }
        return nextState;
      }
      return alarm;
    });

    setAlarms(updated);
    localStorage.setItem('kimi_chat_alarms', JSON.stringify(updated));
  };

  const removeAlarm = async (id: string) => {
    const updated = alarms.filter(alarm => alarm.id !== id);
    setAlarms(updated);
    localStorage.setItem('kimi_chat_alarms', JSON.stringify(updated));

    if (user) {
      await dbDeleteAlarm(id);
    }
  };

  return {
    alarms,
    firingAlarm,
    addAlarm,
    toggleAlarm,
    removeAlarm,
    stopFiringAlarm,
    requestNotificationPermission,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default'
  };
};
