import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Cpu, 
  Download, 
  Check, 
  Shield,
  AlertCircle,
  Info
} from 'lucide-react';

interface SettingsProps {
  supabaseConfig: {
    url: string;
    anonKey: string;
    isConfigured: boolean;
  };
  nvidiaConfig: {
    apiKey: string;
    model: string;
    isConfigured: boolean;
  };
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  supabaseConfig,
  nvidiaConfig,
  deferredPrompt,
  setDeferredPrompt
}) => {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    setCanInstall(!!deferredPrompt);
  }, [deferredPrompt]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <div className="view-panel">
      <div className="view-content">
        <div className="view-header">
          <h1 className="view-title">Configuración</h1>
          <p className="view-subtitle">Estado de la conexión cargada desde el archivo .env de tu proyecto</p>
        </div>

        {/* Security Warning */}
        <div className="glass-card" style={{ display: 'flex', gap: '12px', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <Shield className="clr-cyan" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Seguridad del Entorno</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)', lineHeight: 1.4 }}>
              Tus claves API y credenciales de Supabase se cargan desde el archivo <code>.env</code> en el servidor local. 
              Ninguna de tus claves se expone en la interfaz ni se guarda de forma permanente en la memoria insegura del navegador.
            </p>
          </div>
        </div>

        {/* PWA App Install Panel */}
        {canInstall && (
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(6, 182, 212, 0.1))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download className="clr-purple" size={18} />
                <span>Instalar Aplicación en Celular o PC</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-secondary)', marginTop: '4px' }}>
                Instala esta app para habilitar recordatorios persistentes y notificaciones instantáneas directo en tu celular.
              </p>
            </div>
            <button 
              onClick={handleInstallApp}
              className="btn-primary"
              style={{ display: 'flex', gap: '8px', padding: '10px 16px', fontSize: '0.85rem' }}
            >
              <Download size={16} />
              <span>Instalar</span>
            </button>
          </div>
        )}

        {/* NVIDIA API Config Status */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu className="clr-purple" size={18} />
            <span>NVIDIA NIM API (Kimi 2.6)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {nvidiaConfig.isConfigured ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '16px', borderRadius: '12px' }}>
                <Check size={20} className="clr-success" style={{ color: '#22c55e' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#22c55e' }}>Clave API Activa</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)', marginTop: '2px' }}>
                    Cargada correctamente desde <code>VITE_NVIDIA_API_KEY</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '12px' }}>
                <AlertCircle size={20} style={{ color: '#ef4444' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444' }}>API Key Faltante</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)', marginTop: '2px' }}>
                    Añade <code>VITE_NVIDIA_API_KEY</code> en tu archivo <code>.env</code> para poder chatear con Kimi.
                  </p>
                </div>
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Modelo Activo</label>
              <div className="form-input" style={{ background: 'rgba(0,0,0,0.15)', cursor: 'default' }}>
                {nvidiaConfig.model}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', marginTop: '4px' }}>
                Puedes cambiar el modelo modificando la variable <code>VITE_NVIDIA_MODEL</code> en tu archivo <code>.env</code>.
              </span>
            </div>
          </div>
        </div>

        {/* Supabase Config Status */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database className="clr-cyan" size={18} />
            <span>Base de Datos Supabase</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {supabaseConfig.isConfigured ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '16px', borderRadius: '12px' }}>
                <Check size={20} className="clr-success" style={{ color: '#22c55e' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#22c55e' }}>Sincronización Activa (Modo Nube)</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)', marginTop: '2px' }}>
                    Conectado con Supabase. Tus chats y alarmas están sincronizados en la nube.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)', padding: '16px', borderRadius: '12px' }}>
                <Info size={20} style={{ color: '#eab308' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#eab308' }}>Modo Local Activo</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-secondary)', marginTop: '2px' }}>
                    Tus datos se guardan en el navegador. Agrega <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> a tu <code>.env</code> para habilitar la nube.
                  </p>
                </div>
              </div>
            )}

            {supabaseConfig.isConfigured && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Servidor Supabase URL</label>
                <div className="form-input" style={{ background: 'rgba(0,0,0,0.15)', cursor: 'default', fontSize: '0.85rem' }}>
                  {supabaseConfig.url}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
