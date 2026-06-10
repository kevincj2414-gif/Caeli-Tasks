import React, { useState, useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { LogIn, UserPlus, AlertCircle, Check } from 'lucide-react';

interface AuthProps {
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  onAuthSuccess: () => void;
  isSupabaseConfigured: boolean;
}

export const Auth: React.FC<AuthProps> = ({
  signUp,
  signIn,
  onAuthSuccess,
  isSupabaseConfigured
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Trigger anime.js animations when tab changes
  useEffect(() => {
    if (formRef.current) {
      // Fade out and translate down inputs slightly, then bounce them back up
      const items = formRef.current.querySelectorAll('.form-animate-item');
      if (items.length > 0) {
        animate(items, {
          translateY: [15, 0],
          opacity: [0, 1],
          delay: stagger(60),
          duration: 800,
          easing: 'easeOutElastic(1, .8)'
        });
      }
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (activeTab === 'register' && !name) {
      setError('Por favor, ingresa tu nombre.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        await signIn(email, password);
        setSuccess('¡Inicio de sesión exitoso!');
        setTimeout(() => {
          onAuthSuccess();
        }, 800);
      } else {
        await signUp(email, password, name);
        setSuccess('¡Registro exitoso! Por favor inicia sesión o revisa tu correo si se requiere confirmación.');
        setActiveTab('login');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-panel" ref={containerRef}>
      <div className="view-content" style={{ maxWidth: '440px' }}>
        <div className="view-header" style={{ textAlign: 'center' }}>
          <h1 className="view-title">Bienvenido</h1>
          <p className="view-subtitle">
            {isSupabaseConfigured 
              ? 'Conéctate a tu base de datos de Supabase' 
              : 'Sincroniza tus chats y alarmas en la nube'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="glass-card" style={{ borderColor: 'var(--clr-rose)', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px' }}>
            <AlertCircle className="clr-rose" size={24} style={{ flexShrink: 0 }} />
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Supabase no está configurado</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)' }}>
                Configura primero la URL y Anon Key de Supabase en la sección de <strong>Ajustes</strong> para habilitar el control de usuarios.
              </p>
            </div>
          </div>
        )}

        {isSupabaseConfigured && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <div className="auth-tabs">
              <div 
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => !loading && setActiveTab('login')}
              >
                Ingresar
              </div>
              <div 
                className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => !loading && setActiveTab('register')}
              >
                Registrarse
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--clr-error)', color: 'var(--clr-primary)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--clr-success)', color: 'var(--clr-primary)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Check size={16} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeTab === 'register' && (
                <div className="form-group form-animate-item">
                  <label className="form-label">Nombre Completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              )}

              <div className="form-group form-animate-item">
                <label className="form-label">Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group form-animate-item">
                <label className="form-label">Contraseña</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary form-animate-item" 
                style={{ width: '100%', marginTop: '8px' }}
                disabled={loading}
              >
                {loading ? (
                  <span className="typing-indicator" style={{ padding: 0 }}>
                    <span className="typing-dot" style={{ background: '#fff' }}></span>
                    <span className="typing-dot" style={{ background: '#fff' }}></span>
                    <span className="typing-dot" style={{ background: '#fff' }}></span>
                  </span>
                ) : (
                  <>
                    {activeTab === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                    <span>{activeTab === 'login' ? 'Iniciar Sesión' : 'Registrar Cuenta'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
