import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email?: string;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AlarmItem {
  id: string;
  time: string; // "08:30"
  label: string;
  days: string[]; // ["Mon", "Tue"...]
  active: boolean;
  user_id?: string;
}

export interface RuleItem {
  id: string;
  label: string;
  description: string;
  days: string[]; // e.g. ["Mon", "Wed", "Fri"]
  active: boolean;
  user_id?: string;
  created_at?: string;
}

export interface RuleLogItem {
  id: string;
  rule_id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  created_at?: string;
}

export interface TaskItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  due_date?: string;
  user_id?: string;
  created_at?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  user_id?: string;
  created_at?: string;
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    type: 'note' | 'task' | 'rule';
    ref_id: string;
    title?: string;
  };
  similarity?: number;
}

export interface ProfileData {
  id?: string;
  user_id?: string;
  display_name: string;
  avatar_base64?: string;
}

// ---------------------------------------------------------------------------
// Singleton Supabase client — only ONE instance per browser tab.
// Never call resetSupabaseClient() unless the user explicitly changes the URL.
// ---------------------------------------------------------------------------
export const getSupabaseConfig = () => {
  let envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  envUrl = envUrl.trim();
  if (envUrl.endsWith('/')) envUrl = envUrl.slice(0, -1);
  if (envUrl.endsWith('/rest/v1')) envUrl = envUrl.slice(0, -8);

  return {
    url: envUrl,
    anonKey: envKey,
    isConfigured: !!(envUrl && envKey)
  };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  // Only create a new client if one doesn't exist yet
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseInstance;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useSupabase = () => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the singleton on first call — this is synchronous and never returns null
  // if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.
  const client = getSupabaseClient();
  const config = getSupabaseConfig();

  useEffect(() => {
    if (!client) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Read existing session
    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0]
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen to future changes
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0]
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // Stub — kept for API compatibility with Settings component
  const saveCredentials = (_url: string, _key: string) => {
    // env-based config; page reload required for changes to take effect
  };

  // --- Authentication ---
  const signUp = async (email: string, pass: string, name: string) => {
    const c = getSupabaseClient(); // Always use the singleton, not stale state
    if (!c) throw new Error('Supabase is not configured. Check your .env file.');
    const { data, error } = await c.auth.signUp({
      email,
      password: pass,
      options: { data: { name } }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, pass: string) => {
    const c = getSupabaseClient(); // Always use the singleton, not stale state
    if (!c) throw new Error('Supabase is not configured. Check your .env file.');
    const { data, error } = await c.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const c = getSupabaseClient();
    if (c) await c.auth.signOut();
    setUser(null);
  };

  // ---------------------------------------------------------------------------
  // Helper: get current user id from state or live session
  // ---------------------------------------------------------------------------
  const getUserId = (): string | null => user?.id ?? null;

  // --- Chat Messages Sync ---
  const saveMessage = async (sessionId: string, message: Omit<ChatMessage, 'id'>) => {
    const messageId = crypto.randomUUID();
    const fullMessage: ChatMessage = { ...message, id: messageId };
    const c = getSupabaseClient();
    const uid = getUserId();

    if (c && uid) {
      try {
        const { error } = await c.from('messages').insert({
          id: messageId,
          session_id: sessionId,
          user_id: uid,
          role: message.role,
          content: message.content,
          created_at: message.created_at
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Error syncing message to Supabase, saving locally:', err);
        saveLocalMessage(sessionId, fullMessage);
      }
    } else {
      saveLocalMessage(sessionId, fullMessage);
    }
    return fullMessage;
  };

  const saveLocalMessage = (sessionId: string, message: ChatMessage) => {
    const key = `kimi_chat_messages_${sessionId}`;
    const localMsgs = JSON.parse(localStorage.getItem(key) || '[]');
    localMsgs.push(message);
    localStorage.setItem(key, JSON.stringify(localMsgs));
  };

  const getMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c
          .from('messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data as ChatMessage[];
      } catch (err) {
        console.warn('Failed to fetch from Supabase, loading from localStorage:', err);
        return getLocalMessages(sessionId);
      }
    }
    return getLocalMessages(sessionId);
  };

  const getLocalMessages = (sessionId: string): ChatMessage[] => {
    const key = `kimi_chat_messages_${sessionId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  };

  const getSessions = async (): Promise<string[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c
          .from('messages')
          .select('session_id')
          .eq('user_id', uid);
        if (error) throw error;
        const uniq = Array.from(new Set((data || []).map(d => d.session_id)));
        return uniq;
      } catch (err) {
        console.warn('Failed to fetch sessions, using localStorage:', err);
        return getLocalSessions();
      }
    }
    return getLocalSessions();
  };

  const getLocalSessions = (): string[] => {
    const sessions: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('kimi_chat_messages_')) {
        sessions.push(key.replace('kimi_chat_messages_', ''));
      }
    }
    return sessions.length ? sessions : ['default'];
  };

  // --- Alarms Sync ---
  const syncAlarms = async (localAlarms: AlarmItem[]): Promise<AlarmItem[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c
          .from('alarms')
          .select('*')
          .eq('user_id', uid);
        if (error) throw error;

        if (!data || data.length === 0) {
          if (localAlarms.length > 0) {
            const upload = localAlarms.map(a => ({ ...a, user_id: uid }));
            await c.from('alarms').insert(upload);
          }
          return localAlarms;
        }

        const sbAlarms: AlarmItem[] = data.map(d => ({
          id: d.id,
          time: d.time,
          label: d.label,
          days: d.days,
          active: d.active,
          user_id: d.user_id
        }));

        const missingLocals = localAlarms.filter(la => !sbAlarms.some(sa => sa.id === la.id));
        if (missingLocals.length > 0) {
          const upload = missingLocals.map(a => ({ ...a, user_id: uid }));
          await c.from('alarms').insert(upload);
          return [...sbAlarms, ...missingLocals];
        }
        return sbAlarms;
      } catch (err) {
        console.warn('Alarms sync failed, local active:', err);
      }
    }
    return localAlarms;
  };

  const saveAlarm = async (alarm: AlarmItem) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        await c.from('alarms').upsert({ ...alarm, user_id: uid });
      } catch (err) {
        console.warn('Failed to sync alarm:', err);
      }
    }
  };

  const deleteAlarm = async (alarmId: string) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        await c.from('alarms').delete().eq('id', alarmId).eq('user_id', uid);
      } catch (err) {
        console.warn('Failed to delete alarm:', err);
      }
    }
  };

  // --- 📝 Notes CRUD ---
  const getNotes = async (): Promise<NoteItem[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c.from('notes').select('*').eq('user_id', uid).order('created_at', { ascending: false });
        if (error) throw error;
        return data as NoteItem[];
      } catch (err) {
        console.warn('Notes loading local:', err);
      }
    }
    return JSON.parse(localStorage.getItem('kimi_chat_notes') || '[]');
  };

  const saveNote = async (note: NoteItem) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    const updatedNote = { ...note, user_id: uid ?? undefined };

    const local: NoteItem[] = JSON.parse(localStorage.getItem('kimi_chat_notes') || '[]');
    const index = local.findIndex(n => n.id === note.id);
    if (index >= 0) local[index] = updatedNote;
    else local.unshift(updatedNote);
    localStorage.setItem('kimi_chat_notes', JSON.stringify(local));

    if (c && uid) {
      try {
        const { error } = await c.from('notes').upsert({
          id: note.id,
          user_id: uid,
          title: note.title,
          content: note.content
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to sync note online:', err);
      }
    }
  };

  const deleteNote = async (id: string) => {
    const local: NoteItem[] = JSON.parse(localStorage.getItem('kimi_chat_notes') || '[]');
    localStorage.setItem('kimi_chat_notes', JSON.stringify(local.filter(n => n.id !== id)));

    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        await c.from('notes').delete().eq('id', id).eq('user_id', uid);
      } catch (err) {
        console.warn('Failed to delete note online:', err);
      }
    }
  };

  // --- 📋 Tasks CRUD ---
  const getTasks = async (): Promise<TaskItem[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c.from('tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false });
        if (error) throw error;
        return data as TaskItem[];
      } catch (err) {
        console.warn('Tasks loading local:', err);
      }
    }
    return JSON.parse(localStorage.getItem('kimi_chat_tasks') || '[]');
  };

  const saveTask = async (task: TaskItem) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    const updatedTask = { ...task, user_id: uid ?? undefined };

    const local: TaskItem[] = JSON.parse(localStorage.getItem('kimi_chat_tasks') || '[]');
    const index = local.findIndex(t => t.id === task.id);
    if (index >= 0) local[index] = updatedTask;
    else local.unshift(updatedTask);
    localStorage.setItem('kimi_chat_tasks', JSON.stringify(local));

    if (c && uid) {
      try {
        const { error } = await c.from('tasks').upsert({
          id: task.id,
          user_id: uid,
          label: task.label,
          description: task.description,
          completed: task.completed,
          due_date: task.due_date ?? null
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to sync task online:', err);
      }
    }
  };

  const deleteTask = async (id: string) => {
    const local: TaskItem[] = JSON.parse(localStorage.getItem('kimi_chat_tasks') || '[]');
    localStorage.setItem('kimi_chat_tasks', JSON.stringify(local.filter(t => t.id !== id)));

    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        await c.from('tasks').delete().eq('id', id).eq('user_id', uid);
      } catch (err) {
        console.warn('Failed to delete task online:', err);
      }
    }
  };

  // --- 📕 Rules (Habits) CRUD ---
  const getRules = async (): Promise<RuleItem[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c.from('rules').select('*').eq('user_id', uid).order('created_at', { ascending: true });
        if (error) throw error;
        return data as RuleItem[];
      } catch (err) {
        console.warn('Rules loading local:', err);
      }
    }
    return JSON.parse(localStorage.getItem('kimi_chat_rules') || '[]');
  };

  const saveRule = async (rule: RuleItem) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    const updatedRule = { ...rule, user_id: uid ?? undefined };

    const local: RuleItem[] = JSON.parse(localStorage.getItem('kimi_chat_rules') || '[]');
    const index = local.findIndex(r => r.id === rule.id);
    if (index >= 0) local[index] = updatedRule;
    else local.push(updatedRule);
    localStorage.setItem('kimi_chat_rules', JSON.stringify(local));

    if (c && uid) {
      try {
        const { error } = await c.from('rules').upsert({
          id: rule.id,
          user_id: uid,
          label: rule.label,
          description: rule.description,
          days: rule.days,
          active: rule.active
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to sync rule online:', err);
      }
    }
  };

  const deleteRule = async (id: string) => {
    const local: RuleItem[] = JSON.parse(localStorage.getItem('kimi_chat_rules') || '[]');
    localStorage.setItem('kimi_chat_rules', JSON.stringify(local.filter(r => r.id !== id)));

    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        await c.from('rules').delete().eq('id', id).eq('user_id', uid);
      } catch (err) {
        console.warn('Failed to delete rule online:', err);
      }
    }
  };

  // --- 📅 Rule Completion Logs ---
  const getRuleLogs = async (): Promise<RuleLogItem[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c.from('rule_logs').select('*').eq('user_id', uid);
        if (error) throw error;
        return data as RuleLogItem[];
      } catch (err) {
        console.warn('Rule logs loading local:', err);
      }
    }
    return JSON.parse(localStorage.getItem('kimi_chat_rule_logs') || '[]');
  };

  const saveRuleLog = async (log: RuleLogItem) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    const updatedLog = { ...log, user_id: uid ?? undefined };

    const local: RuleLogItem[] = JSON.parse(localStorage.getItem('kimi_chat_rule_logs') || '[]');
    const index = local.findIndex(l => l.rule_id === log.rule_id && l.date === log.date);
    if (index >= 0) local[index] = updatedLog;
    else local.push(updatedLog);
    localStorage.setItem('kimi_chat_rule_logs', JSON.stringify(local));

    if (c && uid) {
      try {
        const { error } = await c.from('rule_logs').upsert({
          id: log.id,
          rule_id: log.rule_id,
          user_id: uid,
          date: log.date,
          completed: log.completed
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to sync rule log online:', err);
      }
    }
  };

  // --- 🧠 Vector Search Database RPC calls ---
  const saveDocumentVector = async (id: string, content: string, embedding: number[], metadata: Record<string, unknown>) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { error } = await c.from('user_documents').upsert({
          id,
          user_id: uid,
          content,
          embedding,
          metadata
        });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to sync vector embedding to Supabase:', err);
      }
    }
  };

  const deleteDocumentVector = async (refId: string) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        await c.from('user_documents').delete().eq('user_id', uid).filter('metadata->>ref_id', 'eq', refId);
      } catch (err) {
        console.error('Failed to delete vector embedding:', err);
      }
    }
  };

  // --- 👤 User Profile ---
  const getProfile = async (): Promise<ProfileData | null> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c
          .from('profiles')
          .select('*')
          .eq('user_id', uid)
          .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data as ProfileData | null;
      } catch (err) {
        console.warn('Failed to load profile:', err);
      }
    }
    const local = localStorage.getItem('kimi_user_profile');
    return local ? JSON.parse(local) : null;
  };

  const saveProfile = async (profile: ProfileData) => {
    const c = getSupabaseClient();
    const uid = getUserId();
    // Always save locally
    localStorage.setItem('kimi_user_profile', JSON.stringify(profile));
    if (c && uid) {
      try {
        const { error } = await c.from('profiles').upsert({
          user_id: uid,
          display_name: profile.display_name,
          avatar_base64: profile.avatar_base64 ?? null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to save profile online:', err);
      }
    }
  };

  const searchSimilarDocuments = async (queryEmbedding: number[], threshold = 0.5, count = 5): Promise<VectorDocument[]> => {
    const c = getSupabaseClient();
    const uid = getUserId();
    if (c && uid) {
      try {
        const { data, error } = await c.rpc('match_user_documents', {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: count,
          filter_user_id: uid
        });
        if (error) throw error;
        return data as VectorDocument[];
      } catch (err) {
        console.warn('Failed to search pgvector in Supabase RPC:', err);
      }
    }
    return [];
  };

  return {
    client,
    user,
    loading,
    config,
    signUp,
    signIn,
    signOut,
    saveCredentials,
    saveMessage,
    getMessages,
    getSessions,
    syncAlarms,
    saveAlarm,
    deleteAlarm,
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
  };
};
