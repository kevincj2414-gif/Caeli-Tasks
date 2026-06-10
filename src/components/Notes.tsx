import React, { useState, useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { 
  Plus, 
  Trash2, 
  AlertCircle,
  FileText,
  Save,
  ChevronLeft
} from 'lucide-react';
import type { NoteItem } from '../hooks/useSupabase';

interface NotesProps {
  notes: NoteItem[];
  saveNote: (note: NoteItem) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  onVectorSync: (id: string, type: 'note', title: string, content: string) => void;
  onVectorDelete: (id: string) => void;
}

export const Notes: React.FC<NotesProps> = ({
  notes,
  saveNote,
  deleteNote,
  onVectorSync,
  onVectorDelete
}) => {
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Stagger animate note cards on list mount
  useEffect(() => {
    if (listContainerRef.current && !editingNote) {
      const cards = listContainerRef.current.querySelectorAll('.note-item-card');
      if (cards.length > 0) {
        animate(cards, {
          opacity: [0, 1],
          translateY: [15, 0],
          delay: stagger(50),
          duration: 500,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [notes.length, editingNote]);

  const handleCreateNew = () => {
    setEditingNote({
      id: crypto.randomUUID(),
      title: '',
      content: ''
    });
    setTitle('');
    setContent('');
  };

  const handleSelectNote = (note: NoteItem) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !title.trim() || !content.trim()) return;

    setLoading(true);
    const updatedNote: NoteItem = {
      ...editingNote,
      title: title.trim(),
      content: content.trim()
    };

    await saveNote(updatedNote);

    // Sync note content to Vector database
    const textToEmbed = `Nota: ${updatedNote.title}. Contenido: ${updatedNote.content}`;
    onVectorSync(updatedNote.id, 'note', updatedNote.title, textToEmbed);

    setEditingNote(null);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    onVectorDelete(id);
    if (editingNote?.id === id) {
      setEditingNote(null);
    }
  };

  return (
    <div className="view-panel">
      <div className="view-content" style={{ maxWidth: editingNote ? '800px' : '640px' }}>
        
        {/* Header (Dual Mode: Editor vs List) */}
        <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 className="view-title">Bloc de Notas</h1>
            <p className="view-subtitle">
              {editingNote ? 'Editor de nota' : 'Escribe tus pensamientos y deja que la IA analice tus ideas'}
            </p>
          </div>
          
          {!editingNote && (
            <button 
              onClick={handleCreateNew}
              className="btn-primary"
              style={{ display: 'flex', gap: '8px', padding: '10px 16px', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>Nueva Nota</span>
            </button>
          )}
        </div>

        {/* Editor Screen */}
        {editingNote ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={() => setEditingNote(null)}
              className="btn-secondary" 
              style={{ padding: '8px 12px', fontSize: '0.8rem', alignSelf: 'flex-start', borderRadius: '8px' }}
            >
              <ChevronLeft size={14} />
              <span>Volver a la Lista</span>
            </button>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Título de la Nota</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Reflexión sobre mi día, Ideas de proyecto..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={loading}
                  style={{ fontSize: '1.1rem', fontWeight: 600 }}
                />
              </div>

              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label className="form-label">Contenido</label>
                <textarea 
                  className="form-input" 
                  placeholder="Escribe lo que sientas o lo que necesites recordar aquí..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  disabled={loading}
                  rows={12}
                  style={{ 
                    resize: 'vertical', 
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    background: 'rgba(0,0,0,0.25)' 
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ minWidth: '130px' }}
                  disabled={loading}
                >
                  <Save size={16} />
                  <span>Guardar Nota</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDelete(editingNote.id)}
                  className="btn-secondary"
                  style={{ color: 'var(--clr-rose)' }}
                  disabled={loading}
                >
                  <Trash2 size={16} />
                  <span>Eliminar</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* List Screen */
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>
              Mis Notas Guardadas ({notes.length})
            </h3>

            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--clr-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={28} />
                <p style={{ fontSize: '0.9rem' }}>Aún no tienes notas escritas.</p>
              </div>
            ) : (
              <div 
                ref={listContainerRef} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                  gap: '16px' 
                }}
              >
                {notes.map((note) => (
                  <div 
                    key={note.id}
                    className="note-item-card"
                    onClick={() => handleSelectNote(note)}
                    style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      height: '160px',
                      transition: 'all var(--transition-fast)',
                      opacity: 0 // Used by anime.js stagger
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--clr-purple)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                      <FileText size={16} className="clr-purple" />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {note.title}
                      </span>
                    </div>

                    <p style={{ 
                      fontSize: '0.8rem', 
                      color: 'var(--clr-secondary)', 
                      flex: 1, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4
                    }}>
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
