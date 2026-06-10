import React, { useState, useEffect, useRef } from 'react';
import { animate } from 'animejs';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Menu,
  AlertCircle,
  Bot,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import type { ChatMessage } from '../hooks/useSupabase';

interface ChatProps {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  isNvidiaConfigured: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeModelName: string;
  actionToast?: string | null;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  sendMessage,
  loading,
  error,
  isNvidiaConfigured,
  setSidebarOpen,
  activeModelName,
  actionToast
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Micro-animation for new messages
  useEffect(() => {
    if (listRef.current) {
      const bubbles = listRef.current.querySelectorAll('.message-wrapper:not(.animated)');
      if (bubbles.length > 0) {
        bubbles.forEach((bubble) => {
          bubble.classList.add('animated');
          animate(bubble, {
            opacity: [0, 1],
            scale: [0.95, 1],
            translateY: [10, 0],
            duration: 400,
            easing: 'easeOutQuad'
          });
        });
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={18} className="clr-purple" />
              <span>Kimi 2.6 AI</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>
              Modelo: {activeModelName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} className="clr-cyan" />
          <span style={{ fontSize: '0.85rem', color: 'var(--clr-secondary)' }}>NVIDIA NIM API</span>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="messages-list" ref={listRef}>
        {!isNvidiaConfigured && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <div className="glass-card" style={{ maxWidth: '400px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-rose)' }}>
                <AlertCircle size={28} style={{ margin: 'auto' }} />
              </div>
              <h3 style={{ fontWeight: 700 }}>NVIDIA API No Configurada</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--clr-secondary)', lineHeight: 1.5 }}>
                Para comenzar a chatear con Kimi 2.6, ingresa tu clave API de NVIDIA en la sección de <strong>Ajustes</strong>.
              </p>
            </div>
          </div>
        )}

        {isNvidiaConfigured && messages.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '12px' }}>
            <div className="brand-icon" style={{ width: '64px', height: '64px', fontSize: '1.75rem', borderRadius: '20px' }}>K</div>
            <h2 style={{ fontWeight: 700, marginTop: '8px' }}>¿En qué puedo ayudarte hoy?</h2>
            <p style={{ color: 'var(--clr-secondary)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '320px', lineHeight: 1.4 }}>
              Chatea con Kimi a través del backend seguro de NVIDIA. Crea recordatorios y alarmas usando la barra lateral.
            </p>
          </div>
        )}

        {isNvidiaConfigured && messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
            <div style={{
              display: 'flex',
              gap: '12px',
              maxWidth: msg.role === 'user' ? '92%' : '82%',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}>
              <div className="avatar" style={{
                width: '32px',
                height: '32px',
                flexShrink: 0,
                fontSize: '0.8rem',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, var(--clr-cyan), var(--clr-purple))'
                  : 'var(--clr-card)',
                border: msg.role === 'assistant' ? '1px solid var(--glass-border)' : 'none'
              }}>
                {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} className="clr-purple" />}
              </div>
              <div className={`message-bubble ${msg.role === 'user' ? '' : 'markdown-body'}`} style={msg.role === 'user' ? { flex: 1, maxWidth: '100%' } : {}}>
                {/* Show typing dots inside the streaming bubble while it's still empty */}
                {msg.role === 'assistant' && msg.content === '' ? (
                  <span className="typing-indicator">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </span>
                ) : msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Loading dots: only show when loading but no assistant bubble exists yet */}
        {loading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
          <div className="message-wrapper ai">
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="avatar" style={{ width: '32px', height: '32px', flexShrink: 0, fontSize: '0.8rem', background: 'var(--clr-card)', border: '1px solid var(--glass-border)' }}>
                <Bot size={14} className="clr-purple" />
              </div>
              <div className="message-bubble" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderBottomLeftRadius: '4px' }}>
                <span className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--clr-error)', color: 'var(--clr-primary)', padding: '10px 16px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Action Toast Notification */}
      {actionToast && (
        <div style={{
          position: 'absolute',
          bottom: '88px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, rgba(138,43,226,0.95), rgba(0,200,220,0.95))',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '99px',
          fontSize: '0.85rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(138,43,226,0.5)',
          zIndex: 10,
          pointerEvents: 'none',
          animation: 'fadeInUp 0.3s ease'
        }}>
          ✅ {actionToast}
        </div>
      )}

      {/* Input Box */}
      {isNvidiaConfigured && (
        <div className="chat-input-area">
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Pregúntale algo a Kimi..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="icon-button submit"
              disabled={!inputText.trim() || loading}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
