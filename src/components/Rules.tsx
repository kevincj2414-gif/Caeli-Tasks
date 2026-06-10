import React, { useState, useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { 
  Plus, 
  Trash2, 
  Flame, 
  Check, 
  BookOpen, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import type { RuleItem, RuleLogItem } from '../hooks/useSupabase';

interface RulesProps {
  rules: RuleItem[];
  logs: RuleLogItem[];
  saveRule: (rule: RuleItem) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  saveRuleLog: (log: RuleLogItem) => Promise<void>;
  onVectorSync: (id: string, type: 'rule', title: string, content: string) => void;
  onVectorDelete: (id: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_TRANSLATIONS: { [key: string]: string } = {
  'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié', 'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sáb', 'Sun': 'Dom'
};

export const Rules: React.FC<RulesProps> = ({
  rules,
  logs,
  saveRule,
  deleteRule,
  saveRuleLog,
  onVectorSync,
  onVectorDelete
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Stagger animate habits list load
  useEffect(() => {
    if (containerRef.current) {
      const items = containerRef.current.querySelectorAll('.rule-card');
      if (items.length > 0) {
        animate(items, {
          opacity: [0, 1],
          translateY: [15, 0],
          delay: stagger(50),
          duration: 600,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [rules.length]);

  const handleDayToggle = (day: string) => {
    setDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setLoading(true);
    const ruleId = crypto.randomUUID();
    const newRule: RuleItem = {
      id: ruleId,
      label: label.trim(),
      description: description.trim(),
      days,
      active: true
    };

    await saveRule(newRule);
    
    // Trigger vector embeddings sync
    const contentToEmbed = `Regla/Hábito: ${newRule.label}. Descripción: ${newRule.description || 'Sin descripción'}. Repetir: ${newRule.days.length === 0 ? 'Todos los días' : newRule.days.join(', ')}`;
    onVectorSync(ruleId, 'rule', newRule.label, contentToEmbed);

    setLabel('');
    setDescription('');
    setDays([]);
    setLoading(false);
  };

  const handleDeleteRule = async (id: string) => {
    await deleteRule(id);
    onVectorDelete(id);
  };

  // Get date strings for the last 7 days (YYYY-MM-DD)
  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      dates.push({
        dateStr: `${year}-${month}-${day}`,
        dayName,
        label: d.getDate(),
        isToday: i === 0
      });
    }
    return dates;
  };

  const last7Days = getLast7Days();

  // Check if a rule was completed on a specific date
  const isCompleted = (ruleId: string, dateStr: string) => {
    const log = logs.find(l => l.rule_id === ruleId && l.date === dateStr);
    return log ? log.completed : false;
  };

  const handleToggleLog = async (ruleId: string, dateStr: string) => {
    const log = logs.find(l => l.rule_id === ruleId && l.date === dateStr);
    const updatedLog: RuleLogItem = {
      id: log?.id || crypto.randomUUID(),
      rule_id: ruleId,
      date: dateStr,
      completed: log ? !log.completed : true
    };
    await saveRuleLog(updatedLog);
  };

  // Calculate Streak count
  const getStreak = (ruleId: string) => {
    let streak = 0;
    const today = new Date();
    
    // Check backwards from today
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get rule and check if scheduled for this day
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) break;
      
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      const isScheduled = rule.days.length === 0 || rule.days.includes(dayName);
      
      if (isScheduled) {
        const completed = isCompleted(ruleId, dateStr);
        if (completed) {
          streak++;
        } else {
          // If we haven't completed it today yet, we don't break the streak immediately
          if (i === 0) continue; 
          break; // Streak broken
        }
      }
    }
    return streak;
  };

  return (
    <div className="view-panel" ref={containerRef}>
      <div className="view-content" style={{ maxWidth: '720px' }}>
        <div className="view-header">
          <h1 className="view-title">Libro de Reglas</h1>
          <p className="view-subtitle">Define tus hábitos diarios y realiza el seguimiento de tus rachas de cumplimiento</p>
        </div>

        {/* New Habit Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className="clr-purple" size={18} />
            <span>Añadir Hábito / Regla</span>
          </h3>

          <form onSubmit={handleAddRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nombre de la Regla</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Leer 20 minutos, Hacer ejercicio, Tender la cama..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Descripción o Motivo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Para mejorar mi concentración y adquirir conocimientos."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Días de repetición (vacío = todos los días)</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {WEEKDAYS.map((day) => {
                  const isSelected = days.includes(day);
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
              style={{ alignSelf: 'flex-start' }}
              disabled={loading}
            >
              <Plus size={18} />
              <span>Añadir Regla</span>
            </button>
          </form>
        </div>

        {/* Habits Checklist list */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>
            Mis Hábitos Activos ({rules.length})
          </h3>

          {rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--clr-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={28} />
              <p style={{ fontSize: '0.9rem' }}>Aún no has creado hábitos en tu libro de reglas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {rules.map((rule) => {
                const streak = getStreak(rule.id);
                return (
                  <div 
                    key={rule.id} 
                    className="rule-card" 
                    style={{ 
                      background: 'rgba(255,255,255,0.01)', 
                      border: '1px solid var(--glass-border)', 
                      borderRadius: '16px', 
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      opacity: 0 // Used by anime.js stagger
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{rule.label}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)', marginTop: '4px' }}>{rule.description}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {streak > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '8px', color: 'var(--clr-rose)' }}>
                            <Flame size={14} fill="currentColor" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{streak} Racha</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="icon-button"
                          style={{ color: 'var(--clr-rose)', background: 'rgba(244, 63, 94, 0.05)', width: '32px', height: '32px' }}
                          title="Eliminar regla"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* 7 Day completion history grid */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>Historial 7 días:</span>
                      </span>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {last7Days.map((day) => {
                          const isSched = rule.days.length === 0 || rule.days.includes(day.dayName);
                          const active = isCompleted(rule.id, day.dateStr);
                          
                          return (
                            <div 
                              key={day.dateStr}
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                gap: '4px',
                                opacity: isSched ? 1 : 0.25 
                              }}
                            >
                              <span style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>
                                {DAY_TRANSLATIONS[day.dayName]}
                              </span>
                              <button
                                type="button"
                                disabled={!isSched}
                                onClick={() => handleToggleLog(rule.id, day.dateStr)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: active ? 'none' : '1px solid var(--glass-border)',
                                  background: active 
                                    ? 'linear-gradient(135deg, #22c55e, #15803d)' 
                                    : day.isToday ? 'rgba(255,255,255,0.05)' : 'transparent',
                                  color: '#fff',
                                  cursor: isSched ? 'pointer' : 'default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  boxShadow: active ? '0 0 10px rgba(34, 197, 94, 0.4)' : 'none',
                                  outline: day.isToday ? '2px solid var(--clr-purple)' : 'none'
                                }}
                              >
                                {active ? <Check size={12} /> : day.label}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
