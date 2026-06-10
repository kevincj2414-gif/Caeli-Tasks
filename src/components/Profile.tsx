import React, { useState, useRef } from 'react';
import { Camera, Save, User as UserIcon, Check } from 'lucide-react';
import type { ProfileData } from '../hooks/useSupabase';

interface ProfileProps {
  profile: ProfileData | null;
  userEmail?: string;
  onSave: (profile: ProfileData) => Promise<void>;
}

export const Profile: React.FC<ProfileProps> = ({ profile, userEmail, onSave }) => {
  const [name, setName] = useState(profile?.display_name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(profile?.avatar_base64);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress/resize to max ~200KB for DB storage
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setAvatarPreview(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ display_name: name.trim() || 'Usuario', avatar_base64: avatarPreview });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="view-panel">
      <div className="view-content">
        <div className="view-header">
          <h1 className="view-title" style={{ fontSize: '1.75rem' }}>Mi Perfil</h1>
          <p className="view-subtitle">Tu nombre se comparte con la IA para personalizarla.</p>
        </div>

        {/* Avatar Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '32px 0' }}>
          <div
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              flexShrink: 0,
            }}
            onClick={() => fileRef.current?.click()}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--clr-purple)',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--clr-purple), var(--clr-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#fff',
                border: '3px solid var(--clr-purple)',
              }}>
                {name ? name[0].toUpperCase() : <UserIcon size={40} />}
              </div>
            )}
            {/* Camera overlay */}
            <div style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--clr-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid var(--clr-bg)',
            }}>
              <Camera size={14} color="#fff" />
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', textAlign: 'center' }}>
            Toca la foto para cambiarla.<br />Tamaño máx. comprimido automáticamente.
          </p>
        </div>

        {/* Name Input */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre para mostrar</label>
            <input
              type="text"
              className="form-input"
              placeholder="¿Cómo te llamas?"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {userEmail && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                className="form-input"
                value={userEmail}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: '8px' }}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            <span>{saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar Perfil'}</span>
          </button>
        </div>

        <div className="glass-card" style={{ background: 'rgba(138,43,226,0.08)', border: '1px solid rgba(138,43,226,0.2)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--clr-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--clr-purple)' }}>ℹ️ Sobre la IA:</strong>{' '}
            Kimi usará tu nombre en las respuestas y podrá crear, editar y eliminar tus tareas, notas, reglas y alarmas cuando se lo pidas en el chat.
          </p>
        </div>
      </div>
    </div>
  );
};
