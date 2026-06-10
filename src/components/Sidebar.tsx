import React from 'react';
import {
  MessageSquare,
  AlarmClock,
  Settings as SettingsIcon,
  LogOut,
  LogIn,
  X,
  Plus,
  BookOpen,
  CheckSquare,
  FileText,
  User as UserIcon
} from 'lucide-react';
import type { ProfileData } from '../hooks/useSupabase';

type ViewName = 'chat' | 'alarms' | 'settings' | 'auth' | 'rules' | 'tasks' | 'notes' | 'profile';

interface SidebarProps {
  currentView: ViewName;
  setView: (view: ViewName) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: any;
  signOut: () => Promise<void>;
  sessions: string[];
  currentSession: string;
  setCurrentSession: (id: string) => void;
  onNewSession: () => void;
  userProfile: ProfileData | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  isOpen,
  setIsOpen,
  user,
  signOut,
  sessions,
  currentSession,
  setCurrentSession,
  onNewSession,
  userProfile,
}) => {
  const handleNavClick = (view: ViewName) => {
    setView(view);
    if (window.innerWidth <= 768) setIsOpen(false);
  };

  const selectSession = (sessionId: string) => {
    setCurrentSession(sessionId);
    setView('chat');
    if (window.innerWidth <= 768) setIsOpen(false);
  };

  const displayName = userProfile?.display_name || user?.name || 'Usuario';
  const avatarSrc = userProfile?.avatar_base64;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand">
          <img src="/logo.png" alt="Caeli Logo" className="brand-icon" style={{ padding: 0, overflow: 'hidden' }} />
          <span className="brand-name lightning-text">Caeli Tasks</span>
        </div>
        <button className="icon-button menu-toggle" onClick={() => setIsOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-scrollable">
        {/* Navigation Section */}
        <div className="sidebar-section">
          <span className="section-title">Menu</span>
          <button
            className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
            onClick={() => handleNavClick('chat')}
          >
            <MessageSquare />
            <span>Chat</span>
          </button>
          <button
            className={`nav-item ${currentView === 'alarms' ? 'active' : ''}`}
            onClick={() => handleNavClick('alarms')}
          >
            <AlarmClock />
            <span>Alarmas</span>
          </button>
          <button
            className={`nav-item ${currentView === 'rules' ? 'active' : ''}`}
            onClick={() => handleNavClick('rules')}
          >
            <BookOpen />
            <span>Reglas</span>
          </button>
          <button
            className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => handleNavClick('tasks')}
          >
            <CheckSquare />
            <span>Tareas</span>
          </button>
          <button
            className={`nav-item ${currentView === 'notes' ? 'active' : ''}`}
            onClick={() => handleNavClick('notes')}
          >
            <FileText />
            <span>Notas</span>
          </button>
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavClick('settings')}
          >
            <SettingsIcon />
            <span>Ajustes</span>
          </button>
        </div>

        {/* Chat History Section */}
        {currentView === 'chat' && (
          <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="section-title">Historial</span>
              <button
                onClick={onNewSession}
                className="icon-button"
                style={{ width: '28px', height: '28px', borderRadius: '8px' }}
                title="Nuevo Chat"
              >
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sessions.map((sessId) => {
                const isSelected = currentSession === sessId;
                const formattedId = sessId.substring(0, 8);
                return (
                  <button
                    key={sessId}
                    className={`nav-item ${isSelected ? 'active' : ''}`}
                    onClick={() => selectSession(sessId)}
                    style={{ padding: '8px 12px', borderRadius: '8px' }}
                  >
                    <MessageSquare size={14} style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sessId === 'default' ? 'Chat Principal' : `Chat #${formattedId}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {user ? (
          <>
            {/* Clickable profile card → goes to profile view */}
            <button
              className={`user-profile-card ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => handleNavClick('profile')}
              style={{
                width: '100%',
                background: 'none',
                border: currentView === 'profile'
                  ? '1px solid var(--clr-purple)'
                  : '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 0.2s',
                textAlign: 'left',
                color: 'var(--clr-primary)'
              }}
              title="Ver mi perfil"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '2px solid var(--clr-purple)'
                  }}
                />
              ) : (
                <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '0.9rem', flexShrink: 0 }}>
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="user-name">{displayName}</div>
                <div className="user-email">{user.email}</div>
              </div>
              <UserIcon size={14} style={{ color: 'var(--clr-muted)', flexShrink: 0 }} />
            </button>
            <button
              onClick={signOut}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem', borderRadius: '10px' }}
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => handleNavClick('auth')}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
          >
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>
    </aside>
  );
};
