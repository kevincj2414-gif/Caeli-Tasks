import React, { useState, useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  Calendar,
  AlertCircle,
  CheckSquare
} from 'lucide-react';
import type { TaskItem } from '../hooks/useSupabase';

interface TasksProps {
  tasks: TaskItem[];
  saveTask: (task: TaskItem) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  onVectorSync: (id: string, type: 'task', title: string, content: string) => void;
  onVectorDelete: (id: string) => void;
}

export const Tasks: React.FC<TasksProps> = ({
  tasks,
  saveTask,
  deleteTask,
  onVectorSync,
  onVectorDelete
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Stagger animate task cards
  useEffect(() => {
    if (containerRef.current) {
      const items = containerRef.current.querySelectorAll('.task-item-card');
      if (items.length > 0) {
        animate(items, {
          opacity: [0, 1],
          translateX: [-15, 0],
          delay: stagger(40),
          duration: 500,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [tasks.length]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setLoading(true);
    const taskId = crypto.randomUUID();
    const newTask: TaskItem = {
      id: taskId,
      label: label.trim(),
      description: description.trim(),
      completed: false,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined
    };

    await saveTask(newTask);

    // Trigger vector embeddings sync
    const contentToEmbed = `Tarea: ${newTask.label}. Descripción: ${newTask.description || 'Sin descripción'}. Estado: Pendiente. Vence: ${newTask.due_date ? new Date(newTask.due_date).toLocaleDateString() : 'Sin fecha de vencimiento'}`;
    onVectorSync(taskId, 'task', newTask.label, contentToEmbed);

    setLabel('');
    setDescription('');
    setDueDate('');
    setLoading(false);
  };

  const handleToggleTask = async (task: TaskItem) => {
    const updated = { ...task, completed: !task.completed };
    await saveTask(updated);

    // Sync updated task status to vector DB
    const contentToEmbed = `Tarea: ${updated.label}. Descripción: ${updated.description || 'Sin descripción'}. Estado: ${updated.completed ? 'Completada' : 'Pendiente'}. Vence: ${updated.due_date ? new Date(updated.due_date).toLocaleDateString() : 'Sin fecha de vencimiento'}`;
    onVectorSync(updated.id, 'task', updated.label, contentToEmbed);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    onVectorDelete(id);
  };

  return (
    <div className="view-panel" ref={containerRef}>
      <div className="view-content">
        <div className="view-header">
          <h1 className="view-title">Lista de Tareas</h1>
          <p className="view-subtitle">Organiza tus pendientes del día y mantén al día tus responsabilidades</p>
        </div>

        {/* Task Creator Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare className="clr-purple" size={18} />
            <span>Crear Nueva Tarea</span>
          </h3>

          <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tarea</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Comprar comestibles, Enviar reporte semestral..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="responsive-grid task-grid">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Detalles / Nota</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej. Traer leche de almendras y pan integral..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Fecha Límite</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ alignSelf: 'flex-start' }}
              disabled={loading}
            >
              <Plus size={18} />
              <span>Añadir Tarea</span>
            </button>
          </form>
        </div>

        {/* Tasks List */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>
            Pendientes y Completados ({tasks.length})
          </h3>

          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--clr-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={28} />
              <p style={{ fontSize: '0.9rem' }}>No tienes tareas programadas en tu lista.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="task-item-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    background: task.completed ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                    transition: 'border-color var(--transition-fast)',
                    opacity: 0 // Used by anime.js stagger
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <button
                      onClick={() => handleToggleTask(task)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: task.completed ? '#22c55e' : 'var(--clr-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      {task.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ 
                        fontSize: '0.95rem', 
                        fontWeight: 600,
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? 'var(--clr-muted)' : 'var(--clr-primary)',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {task.label}
                      </span>
                      {task.description && (
                        <p style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--clr-muted)', 
                          marginTop: '2px',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '12px' }}>
                    {task.due_date && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--clr-muted)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px' 
                      }}>
                        <Calendar size={12} />
                        <span>{new Date(task.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="icon-button"
                      style={{ color: 'var(--clr-rose)', background: 'rgba(244, 63, 94, 0.05)', width: '32px', height: '32px' }}
                      title="Eliminar tarea"
                    >
                      <Trash2 size={14} />
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
