import { useState, useEffect, useRef, useCallback } from 'react';
import { animate, random } from 'animejs';
import { BellRing, VolumeX, Menu } from 'lucide-react';

// Hooks
import { useSupabase } from './hooks/useSupabase';
import type { ChatMessage, NoteItem, TaskItem, RuleItem, RuleLogItem, ProfileData } from './hooks/useSupabase';
import { useNvidiaChat } from './hooks/useNvidiaChat';
import { useAlarms } from './hooks/useAlarms';
import { useNvidiaEmbeddings } from './hooks/useNvidiaEmbeddings';

// Components
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Alarms } from './components/Alarms';
import { Rules } from './components/Rules';
import { Tasks } from './components/Tasks';
import { Notes } from './components/Notes';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';

type ViewName = 'chat' | 'alarms' | 'rules' | 'tasks' | 'notes' | 'settings' | 'auth' | 'profile';

// ---------------------------------------------------------------------------
// AI Action Parser
// The AI appends <APP_ACTION>{...}</APP_ACTION> to trigger CRUD operations.
// ---------------------------------------------------------------------------
interface AIAction {
  action:
    | 'create_task' | 'update_task' | 'complete_task' | 'delete_task'
    | 'create_note' | 'update_note' | 'delete_note'
    | 'create_rule' | 'delete_rule'
    | 'create_alarm' | 'delete_alarm';
  data: Record<string, any>;
}

function parseAIActions(text: string): { cleanText: string; actions: AIAction[] } {
  const actions: AIAction[] = [];
  const regex = /<APP_ACTION>([\s\S]*?)<\/APP_ACTION>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const action = JSON.parse(match[1].trim()) as AIAction;
      actions.push(action);
    } catch {
      // ignore invalid JSON inside tags
    }
  }
  const cleanText = text.replace(/<APP_ACTION>[\s\S]*?<\/APP_ACTION>/g, '').trim();
  return { cleanText, actions };
}

export default function App() {
  const [currentView, setView] = useState<ViewName>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState('default');
  const [sessions, setSessions] = useState<string[]>(['default']);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // User data states
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [ruleLogs, setRuleLogs] = useState<RuleLogItem[]>([]);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);

  // Refs for always-fresh values in closures
  const messagesRef = useRef<ChatMessage[]>([]);
  const notesRef = useRef<NoteItem[]>([]);
  const tasksRef = useRef<TaskItem[]>([]);
  const rulesRef = useRef<RuleItem[]>([]);
  const userProfileRef = useRef<ProfileData | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { rulesRef.current = rules; }, [rules]);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  // Hooks
  const {
    user,
    signUp,
    signIn,
    signOut,
    saveMessage,
    getMessages,
    getSessions,
    config: sbConfig,
    getNotes,
    saveNote,
    deleteNote,
    getTasks,
    saveTask,
    deleteTask,
    getRules,
    saveRule,
    deleteRule,
    getRuleLogs,
    saveRuleLog,
    saveDocumentVector,
    deleteDocumentVector,
    searchSimilarDocuments,
    getProfile,
    saveProfile
  } = useSupabase();

  const { loading: chatLoading, error: chatError, getChatResponseStream, config: nvConfig } = useNvidiaChat();
  const { alarms, firingAlarm, addAlarm, toggleAlarm, removeAlarm, stopFiringAlarm, requestNotificationPermission, notificationPermission } = useAlarms();
  const { getEmbedding } = useNvidiaEmbeddings();

  // Background glow animations
  useEffect(() => {
    animate('.glow-1', { translateX: () => random(-100, 100) + 'px', translateY: () => random(-100, 100) + 'px', scale: [1, 1.2, 1], duration: 12000, loop: true, direction: 'alternate', easing: 'easeInOutQuad' });
    animate('.glow-2', { translateX: () => random(-120, 120) + 'px', translateY: () => random(-120, 120) + 'px', scale: [1, 1.15, 1], duration: 15000, loop: true, direction: 'alternate', easing: 'easeInOutQuad' });
    animate('.glow-3', { translateX: () => random(-80, 80) + 'px', translateY: () => random(-80, 80) + 'px', scale: [1, 1.3, 1], duration: 10000, loop: true, direction: 'alternate', easing: 'easeInOutQuad' });
  }, []);

  // PWA Install Prompt
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  // Session loading
  const loadSessions = async () => {
    const list = await getSessions();
    setSessions(list.length ? list : ['default']);
  };

  // Full user data reload
  const loadUserData = useCallback(async () => {
    try {
      const [nList, tList, rList, lList, prof] = await Promise.all([
        getNotes(), getTasks(), getRules(), getRuleLogs(), getProfile()
      ]);
      setNotes(nList);
      setTasks(tList);
      setRules(rList);
      setRuleLogs(lList);
      if (prof) setUserProfile(prof);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadSessions(); loadUserData(); }, [user]);  // eslint-disable-line

  // Load messages on session change
  useEffect(() => {
    getMessages(currentSession).then(setMessages);
  }, [currentSession, user]); // eslint-disable-line

  const handleNewSession = () => {
    const newId = crypto.randomUUID();
    setSessions(prev => [newId, ...prev]);
    setCurrentSession(newId);
    setMessages([]);
    setView('chat');
  };

  // CRUD wrappers
  const handleSaveNote = async (note: NoteItem) => { await saveNote(note); setNotes(await getNotes()); };
  const handleDeleteNote = async (id: string) => { await deleteNote(id); setNotes(await getNotes()); };
  const handleSaveTask = async (task: TaskItem) => { await saveTask(task); setTasks(await getTasks()); };
  const handleDeleteTask = async (id: string) => { await deleteTask(id); setTasks(await getTasks()); };
  const handleSaveRule = async (rule: RuleItem) => { await saveRule(rule); setRules(await getRules()); };
  const handleDeleteRule = async (id: string) => { await deleteRule(id); setRules(await getRules()); };
  const handleSaveRuleLog = async (log: RuleLogItem) => { await saveRuleLog(log); setRuleLogs(await getRuleLogs()); };
  const handleSaveProfile = async (profile: ProfileData) => { await saveProfile(profile); setUserProfile(profile); };

  const handleVectorSync = async (id: string, type: 'note' | 'task' | 'rule', title: string, content: string) => {
    if (!nvConfig.isConfigured) return;
    try { const emb = await getEmbedding(content); await saveDocumentVector(id, content, emb, { ref_id: id, type, title }); }
    catch (err) { console.error('Vector sync failed:', err); }
  };
  const handleVectorDelete = async (id: string) => {
    try { await deleteDocumentVector(id); } catch (err) { console.error('Vector delete failed:', err); }
  };

  // ---------------------------------------------------------------------------
  // Show toast for 3 seconds
  // ---------------------------------------------------------------------------
  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // Execute AI CRUD action — called after the stream completes
  // ---------------------------------------------------------------------------
  const executeAIActions = async (actions: AIAction[]) => {
    let successCount = 0;
    
    for (const action of actions) {
      const d = action.data;
      switch (action.action) {
        case 'create_task': {
          const task: TaskItem = { id: crypto.randomUUID(), label: d.label || 'Nueva Tarea', description: d.description || '', completed: false, due_date: d.due_date, created_at: new Date().toISOString() };
          await handleSaveTask(task);
          successCount++;
          break;
        }
        case 'complete_task':
        case 'update_task': {
          const existing = tasksRef.current.find(t => t.id === d.id || t.label.toLowerCase().includes((d.label || '').toLowerCase()));
          if (existing) {
            const updated: TaskItem = { ...existing, completed: action.action === 'complete_task' ? true : (d.completed ?? existing.completed), label: d.label || existing.label, description: d.description || existing.description };
            await handleSaveTask(updated);
            successCount++;
          }
          break;
        }
        case 'delete_task': {
          const t = tasksRef.current.find(x => x.id === d.id || x.label.toLowerCase().includes((d.label || '').toLowerCase()));
          if (t) { await handleDeleteTask(t.id); successCount++; }
          break;
        }
        case 'create_note': {
          const note: NoteItem = { id: crypto.randomUUID(), title: d.title || 'Nueva Nota', content: d.content || '', created_at: new Date().toISOString() };
          await handleSaveNote(note);
          successCount++;
          break;
        }
        case 'update_note': {
          const existing = notesRef.current.find(n => n.id === d.id || n.title.toLowerCase().includes((d.title || '').toLowerCase()));
          if (existing) { await handleSaveNote({ ...existing, title: d.title || existing.title, content: d.content || existing.content }); successCount++; }
          break;
        }
        case 'delete_note': {
          const n = notesRef.current.find(x => x.id === d.id || x.title.toLowerCase().includes((d.title || '').toLowerCase()));
          if (n) { await handleDeleteNote(n.id); successCount++; }
          break;
        }
        case 'create_rule': {
          const rule: RuleItem = { id: crypto.randomUUID(), label: d.label || 'Nuevo Hábito', description: d.description || '', days: d.days || [], active: true, created_at: new Date().toISOString() };
          await handleSaveRule(rule);
          successCount++;
          break;
        }
        case 'delete_rule': {
          const r = rulesRef.current.find(x => x.id === d.id || x.label.toLowerCase().includes((d.label || '').toLowerCase()));
          if (r) { await handleDeleteRule(r.id); successCount++; }
          break;
        }
        case 'create_alarm': {
          await addAlarm(d.time || '08:00', d.label || 'Alarma', d.days || []);
          successCount++;
          break;
        }
        case 'delete_alarm': {
          const a = alarms.find(x => x.id === d.id || x.label.toLowerCase().includes((d.label || '').toLowerCase()) || x.time === d.time);
          if (a) { await removeAlarm(a.id); successCount++; }
          break;
        }
      }
    }
    
    if (successCount > 0) {
      if (actions.length === 1 && successCount === 1) {
        // Individual toasts for single actions are nice, but a generic one is safer if we bulk edit.
        showToast(`Acción completada con éxito`);
      } else {
        showToast(`${successCount} acciones ejecutadas con éxito`);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Build rich system prompt — injected fresh on every message
  // ---------------------------------------------------------------------------
  const buildSystemPrompt = (): string => {
    const currentNotes = notesRef.current;
    const currentTasks = tasksRef.current;
    const currentRules = rulesRef.current;
    const profile = userProfileRef.current;
    const userName = profile?.display_name || user?.name || 'usuario';

    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let prompt = `Eres Caeli, la asistente personal de IA de ${userName}. Hoy es ${today}.
Hablas español de forma concisa, natural y amigable. Llamas al usuario por su nombre: ${userName}.

## CAPACIDADES: Puedes CREAR, EDITAR y ELIMINAR tareas, notas, hábitos y alarmas.
Cuando el usuario lo pida, responde con normalidad Y al final añade exactamente un bloque así:
<APP_ACTION>{"action":"NOMBRE_ACCION","data":{...}}</APP_ACTION>

### Acciones disponibles:
- create_task: data: {label, description?, due_date?}
- complete_task: data: {id? o label}
- update_task: data: {id? o label, label?, description?, completed?}
- delete_task: data: {id? o label}
- create_note: data: {title, content}
- update_note: data: {id? o title, title?, content?}
- delete_note: data: {id? o title}
- create_rule: data: {label, description?, days?: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]}
- delete_rule: data: {id? o label}
- create_alarm: data: {time: "HH:MM", label, days?: ["Mon",...]}
- delete_alarm: data: {id? o label o time}

### Reglas de las acciones:
1. NUNCA incluyas el bloque <APP_ACTION> si el usuario solo está preguntando o conversando.
2. Si el usuario pide crear, eliminar o modificar algo, SÍ incluye los bloques necesarios.
3. PUEDES incluir MÚLTIPLES bloques <APP_ACTION> al final si necesitas hacer varias operaciones a la vez (ej. eliminar 2 tareas = 2 bloques separados).
4. Para update/delete usa el label o title cuando no tengas el id exacto.

## DATOS ACTUALES DE ${userName.toUpperCase()}:`;

    if (currentTasks.length > 0) {
      prompt += `\n\n📋 TAREAS (${currentTasks.length}):`;
      currentTasks.forEach(t => {
        prompt += `\n- [${t.id}] "${t.label}" [${t.completed ? '✅' : '⏳'}]${t.description ? `: ${t.description}` : ''}`;
      });
    } else {
      prompt += '\n\n📋 TAREAS: ninguna.';
    }

    if (currentNotes.length > 0) {
      prompt += `\n\n📝 NOTAS (${currentNotes.length}):`;
      currentNotes.slice(0, 8).forEach(n => {
        prompt += `\n- [${n.id}] "${n.title}": ${n.content.substring(0, 120)}${n.content.length > 120 ? '...' : ''}`;
      });
    } else {
      prompt += '\n\n📝 NOTAS: ninguna.';
    }

    if (currentRules.length > 0) {
      prompt += `\n\n🔥 HÁBITOS (${currentRules.length}):`;
      currentRules.forEach(r => {
        prompt += `\n- [${r.id}] "${r.label}" [${r.active ? 'activo' : 'inactivo'}] días: ${r.days.length ? r.days.join(',') : 'todos'}`;
      });
    } else {
      prompt += '\n\n🔥 HÁBITOS: ninguno.';
    }

    return prompt;
  };

  // ---------------------------------------------------------------------------
  // handleSendMessage — fixed stale state + AI action parsing
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (text: string) => {
    const currentMessages = messagesRef.current;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsgId = crypto.randomUUID();
    let currentResponseContent = '';

    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', created_at: new Date().toISOString() }]);

    // Save user message (non-blocking)
    saveMessage(currentSession, { role: 'user', content: text, created_at: userMsg.created_at });

    // RAG context
    let ragContext = '';
    if (nvConfig.isConfigured && user) {
      try {
        const queryEmbedding = await getEmbedding(text);
        const similarDocs = await searchSimilarDocuments(queryEmbedding, 0.4, 3);
        if (similarDocs.length > 0) {
          ragContext = '\n\n[Búsqueda semántica relevante]:\n' + similarDocs.map(doc => `[${doc.metadata.type}] "${doc.metadata.title}": ${doc.content}`).join('\n');
        }
      } catch { /* RAG is optional */ }
    }

    const validHistory = currentMessages.filter(m => m.content.trim() !== '');

    const historyContext = [
      { role: 'system' as const, content: buildSystemPrompt() + ragContext },
      ...validHistory.slice(-20).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text }
    ];

    try {
      await getChatResponseStream(
        historyContext,
        (chunk) => {
          currentResponseContent += chunk;
          // Strip action tag from live display
          const displayContent = currentResponseContent.replace(/<APP_ACTION>[\s\S]*?<\/APP_ACTION>/, '').replace(/<APP_ACTION>[\s\S]*$/, '');
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: displayContent } : m));
        },
        async (fullContent) => {
          // Parse and strip action tag
          const { cleanText, actions } = parseAIActions(fullContent);

          // Update message with clean text
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: cleanText } : m));

          // Save clean text to DB
          await saveMessage(currentSession, { role: 'assistant', content: cleanText, created_at: new Date().toISOString() });

          // Execute CRUD actions sequentially if present
          if (actions && actions.length > 0) {
            setTimeout(() => executeAIActions(actions), 300);
          }

          loadSessions();
        }
      );
    } catch {
      setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
    }
  };

  const handleAuthSuccess = () => { setView('chat'); loadSessions(); loadUserData(); };

  return (
    <div className="app-container">
      <div className="ambient-glows">
        <div className="glow-blob glow-1"></div>
        <div className="glow-blob glow-2"></div>
        <div className="glow-blob glow-3"></div>
      </div>

      <Sidebar
        currentView={currentView}
        setView={setView}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
        signOut={signOut}
        sessions={sessions}
        currentSession={currentSession}
        setCurrentSession={setCurrentSession}
        onNewSession={handleNewSession}
        userProfile={userProfile}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {currentView !== 'chat' && (
          <div className="mobile-global-header">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <span className="view-title-small" style={{ textTransform: 'capitalize' }}>
              {currentView === 'auth' ? 'Iniciar Sesión' : currentView}
            </span>
          </div>
        )}
        
        {currentView === 'chat' && (
          <Chat
            messages={messages}
            sendMessage={handleSendMessage}
            loading={chatLoading}
            error={chatError}
            isNvidiaConfigured={nvConfig.isConfigured}
            setSidebarOpen={setSidebarOpen}
            activeModelName={nvConfig.model}
            actionToast={actionToast}
          />
        )}
        {currentView === 'alarms' && (
          <Alarms alarms={alarms} addAlarm={addAlarm} toggleAlarm={toggleAlarm} removeAlarm={removeAlarm} requestNotificationPermission={requestNotificationPermission} notificationPermission={notificationPermission} />
        )}
        {currentView === 'rules' && (
          <Rules rules={rules} logs={ruleLogs} saveRule={handleSaveRule} deleteRule={handleDeleteRule} saveRuleLog={handleSaveRuleLog} onVectorSync={handleVectorSync} onVectorDelete={handleVectorDelete} />
        )}
        {currentView === 'tasks' && (
          <Tasks tasks={tasks} saveTask={handleSaveTask} deleteTask={handleDeleteTask} onVectorSync={handleVectorSync} onVectorDelete={handleVectorDelete} />
        )}
        {currentView === 'notes' && (
          <Notes notes={notes} saveNote={handleSaveNote} deleteNote={handleDeleteNote} onVectorSync={handleVectorSync} onVectorDelete={handleVectorDelete} />
        )}
        {currentView === 'settings' && (
          <Settings supabaseConfig={sbConfig} nvidiaConfig={nvConfig} deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />
        )}
        {currentView === 'auth' && (
          <Auth signUp={signUp} signIn={signIn} onAuthSuccess={handleAuthSuccess} isSupabaseConfigured={sbConfig.isConfigured} />
        )}
        {currentView === 'profile' && (
          <Profile profile={userProfile} userEmail={user?.email} onSave={handleSaveProfile} />
        )}
      </main>

      {/* PWA Install Floating Button */}
      {deferredPrompt && (
        <button 
          onClick={async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
              setDeferredPrompt(null);
            }
          }}
          className="btn-primary"
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            boxShadow: '0 4px 15px rgba(138, 43, 226, 0.6)'
          }}
        >
          Instalar App
        </button>
      )}

      {firingAlarm && (
        <div className="alarm-overlay">
          <div className="alarm-popup">
            <div className="alarm-ring">
              <BellRing size={40} style={{ margin: 'auto', color: '#fff' }} />
            </div>
            <div>
              <div className="alarm-popup-time">{firingAlarm.time}</div>
              <h2 style={{ fontWeight: 700, margin: '8px 0' }}>{firingAlarm.label}</h2>
              <p style={{ color: 'var(--clr-secondary)', fontSize: '0.9rem' }}>¡Tu alarma está sonando!</p>
            </div>
            <button onClick={stopFiringAlarm} className="btn-primary" style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--clr-rose), var(--clr-purple))', fontSize: '1.1rem' }}>
              <VolumeX size={20} />
              <span>Desactivar Alarma</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
