import React, { useState, useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { 
  AlarmClock, 
  Bell, 
  Trash2, 
  Plus, 
  AlertCircle
} from 'lucide-react';
import type { AlarmItem } from '../hooks/useSupabase';

interface AlarmsProps {
  alarms: AlarmItem[];
  addAlarm: (time: string, label: string, days: string[]) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_TRANSLATIONS: { [key: string]: string } = {
  'Mon': 'Lun',
  'Tue': 'Mar',
  'Wed': 'Mié',
  'Thu': 'Jue',
  'Fri': 'Vie',
  'Sat': 'Sáb',
  'Sun': 'Dom'
};

export const Alarms: React.FC<AlarmsProps> = ({
  alarms,
  addAlarm,
  toggleAlarm,
  removeAlarm,
  requestNotificationPermission,
  notificationPermission
}) => {
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [permissionState, setPermissionState] = useState(notificationPermission);
  const [isAdding, setIsAdding] = useState(false);

  const alarmsContainerRef = useRef<HTMLDivElement>(null);

  // Stagger animate alarms list load
  useEffect(() => {
    if (alarmsContainerRef.current) {
      const cards = alarmsContainerRef.current.querySelectorAll('.alarm-card');
      if (cards.length > 0) {
        animate(cards, {
          opacity: [0, 1],
          translateX: [-20, 0],
          delay: stagger(50),
          duration: 500,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [alarms.length]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionState(granted ? 'granted' : 'denied');
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;
    setIsAdding(true);
    await addAlarm(time, label, selectedDays);
    setLabel('');
    setSelectedDays([]);
    setIsAdding(false);
  };

  return (
    <div className="view-panel">
      <div className="view-content">
        <div className="view-header">
          <h1 className="view-title">Gestión de Alarmas</h1>
          <p className="view-subtitle">Programa tus alertas y notificaciones locales para celular o PC</p>
        </div>

        {/* Notification Permission Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className={`avatar ${permissionState === 'granted' ? 'bg-success' : 'bg-warning'}`} 
                 style={{ 
                   width: '44px', 
                   height: '44px', 
                   borderRadius: '12px',
                   background: permissionState === 'granted' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                   color: permissionState === 'granted' ? '#22c55e' : '#eab308'
                 }}>
              <Bell size={22} style={{ margin: 'auto' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Notificaciones de Navegador</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-secondary)' }}>
                {permissionState === 'granted' 
                  ? 'Las notificaciones están autorizadas en este dispositivo.'
                  : 'Se requiere permiso para recibir avisos de alarmas con el chat cerrado.'}
              </p>
            </div>
            {permissionState !== 'granted' && (
              <button 
                onClick={handleRequestPermission}
                className="btn-primary" 
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Habilitar
              </button>
            )}
          </div>
        </div>

        {/* New Alarm Builder Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlarmClock className="clr-purple" size={18} />
            <span>Crear Nueva Alarma</span>
          </h3>

          <form onSubmit={handleAddAlarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="responsive-grid alarm-grid">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Hora</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{ fontSize: '1.2rem', fontWeight: 'bold', padding: '10px' }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Etiqueta / Nota</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Despertar, Reunión..."
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{ padding: '12px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Repetir Días (vacío = solo una vez)</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {WEEKDAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: isSelected ? 'linear-gradient(135deg, var(--clr-purple), var(--clr-rose))' : 'rgba(0,0,0,0.2)',
                        color: isSelected ? '#fff' : 'var(--clr-secondary)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {DAY_TRANSLATIONS[day]}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ marginTop: '8px' }}
              disabled={isAdding}
            >
              <Plus size={18} />
              <span>Guardar Alarma</span>
            </button>
          </form>
        </div>

        {/* Scheduled Alarms List */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>
            Alarmas Programadas ({alarms.length})
          </h3>

          {alarms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--clr-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={28} />
              <p style={{ fontSize: '0.9rem' }}>No tienes alarmas configuradas todavía.</p>
            </div>
          ) : (
            <div className="alarm-list" ref={alarmsContainerRef}>
              {alarms.map((alarm) => (
                <div key={alarm.id} className="alarm-card">
                  <div>
                    <div className="alarm-time">{alarm.time}</div>
                    <div className="alarm-meta">
                      <span className="alarm-label">{alarm.label}</span>
                      <span className="alarm-days">
                        {alarm.days.length === 0 
                          ? 'Una vez' 
                          : alarm.days.map(d => DAY_TRANSLATIONS[d]).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="alarm-controls">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={alarm.active} 
                        onChange={() => toggleAlarm(alarm.id)}
                      />
                      <span className="slider"></span>
                    </label>

                    <button 
                      onClick={() => removeAlarm(alarm.id)}
                      className="icon-button"
                      style={{ color: 'var(--clr-rose)', background: 'rgba(244, 63, 94, 0.05)' }}
                      title="Eliminar Alarma"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
