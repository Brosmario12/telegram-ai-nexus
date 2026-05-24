import {
  Activity,
  Archive,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  Code2,
  Compass,
  Download,
  FileText,
  Menu,
  MessageSquareText,
  Mic,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Persona = 'nexus' | 'build' | 'creative' | 'research' | 'code';
type Role = 'user' | 'assistant';

type Message = {
  id: string;
  role: Role;
  content: string;
  time: string;
  status?: 'sent' | 'streaming' | 'done' | 'error';
};

type Chat = {
  id: string;
  title: string;
  subtitle: string;
  persona: Persona;
  pinned?: boolean;
  unread?: number;
  messages: Message[];
};

const personaMeta: Record<Persona, { name: string; tone: string; icon: typeof Bot; accent: string }> = {
  nexus: { name: 'Nexus', tone: 'Estratega general', icon: BrainCircuit, accent: '#20b2a6' },
  build: { name: 'Builder', tone: 'Arquitectura y producto', icon: Zap, accent: '#f26d5b' },
  creative: { name: 'Muse', tone: 'Ideas fuera de serie', icon: Sparkles, accent: '#d79b2b' },
  research: { name: 'Scout', tone: 'Investigacion y fuentes', icon: Compass, accent: '#5b8def' },
  code: { name: 'Forge', tone: 'Codigo y debugging', icon: Code2, accent: '#77c66e' },
};

const commandPacks = [
  { label: 'Plan maestro', prompt: 'Diseña un plan maestro para convertir esta idea en una app real, con fases, riesgos y primeras tareas.' },
  { label: 'Codigo util', prompt: 'Dame una solucion tecnica con estructura de archivos, componentes y decisiones clave.' },
  { label: 'Brainstorm premium', prompt: 'Genera 10 ideas fuera de serie, pero aterrizadas, para mejorar este producto.' },
  { label: 'Checklist', prompt: 'Conviertelo en una checklist ejecutable para avanzar hoy mismo sin perder tiempo.' },
  { label: 'Critica dura', prompt: 'Analiza los puntos debiles de esta idea y dime como hacerla mas fuerte.' },
];

const seedChats: Chat[] = [
  {
    id: 'ops',
    title: 'Centro de mando',
    subtitle: 'Tu IA principal para decidir y ejecutar',
    persona: 'nexus',
    pinned: true,
    unread: 2,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'Listo. Soy Nexus: puedo ayudarte a planear, escribir codigo, investigar, convertir ideas en sistemas y mantener el hilo como un chat serio de trabajo.',
        time: '09:24',
        status: 'done',
      },
    ],
  },
  {
    id: 'build',
    title: 'Producto y arquitectura',
    subtitle: 'Decisiones tecnicas con criterio',
    persona: 'build',
    pinned: true,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Traeme una idea y la parto en arquitectura, flujo de usuario, MVP, riesgos y siguientes commits.',
        time: '10:02',
        status: 'done',
      },
    ],
  },
  {
    id: 'creative',
    title: 'Laboratorio creativo',
    subtitle: 'Conceptos, nombres, campañas y magia practica',
    persona: 'creative',
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Aqui empujamos la idea hasta que tenga filo: mas rara, mas clara y mas vendible.',
        time: '11:18',
        status: 'done',
      },
    ],
  },
  {
    id: 'code',
    title: 'Forja de codigo',
    subtitle: 'Debugging, snippets y revisiones',
    persona: 'code',
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Pegame un error, una funcion o una arquitectura y lo trabajamos como si fuera un PR.',
        time: '12:31',
        status: 'done',
      },
    ],
  },
];

const formatTime = () =>
  new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date());

function loadChats() {
  const raw = localStorage.getItem('nexus-chats');
  if (!raw) return seedChats;
  try {
    return JSON.parse(raw) as Chat[];
  } catch {
    return seedChats;
  }
}

function App() {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeId, setActiveId] = useState(chats[0]?.id || 'ops');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiMode, setApiMode] = useState('checking');
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find((chat) => chat.id === activeId) || chats[0];
  const meta = personaMeta[activeChat.persona];
  const PersonaIcon = meta.icon;

  const filteredChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => `${chat.title} ${chat.subtitle}`.toLowerCase().includes(needle));
  }, [chats, query]);

  const insights = useMemo(() => {
    const messages = activeChat.messages;
    const words = messages.reduce((total, message) => total + message.content.split(/\s+/).filter(Boolean).length, 0);
    const lastUser = [...messages].reverse().find((message) => message.role === 'user')?.content || 'Sin objetivo nuevo todavia.';
    return { messages: messages.length, words, lastUser };
  }, [activeChat]);

  useEffect(() => {
    localStorage.setItem('nexus-chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeChat.messages]);

  useEffect(() => {
    composerRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setApiMode(data.mode === 'openai' ? `OpenAI ${data.model}` : 'Demo local'))
      .catch(() => setApiMode('API desconectada'));
  }, []);

  function updateActive(updater: (chat: Chat) => Chat) {
    setChats((current) => current.map((chat) => (chat.id === activeChat.id ? updater(chat) : chat)));
  }

  function createChat() {
    const id = crypto.randomUUID();
    const next: Chat = {
      id,
      title: 'Nuevo canal IA',
      subtitle: 'Conversacion sin ruido',
      persona: 'nexus',
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Nuevo canal listo. Dime que quieres construir, entender o automatizar.',
          time: formatTime(),
          status: 'done',
        },
      ],
    };
    setChats((current) => [next, ...current]);
    setActiveId(id);
    setSidebarOpen(false);
  }

  async function sendMessage(textOverride?: string) {
    const text = (textOverride || draft).trim();
    if (!text || isStreaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      time: formatTime(),
      status: 'sent',
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      time: formatTime(),
      status: 'streaming',
    };

    const outgoing = [...activeChat.messages, userMessage];
    setDraft('');
    setIsStreaming(true);
    updateActive((chat) => ({
      ...chat,
      title: chat.title === 'Nuevo canal IA' ? text.slice(0, 34) : chat.title,
      messages: [...chat.messages, userMessage, assistantMessage],
    }));

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: outgoing, persona: activeChat.persona }),
      });

      if (!response.body) throw new Error('No hubo stream de respuesta.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const event = frame.split('\n').find((line) => line.startsWith('event: '))?.slice(7);
          const data = frame.split('\n').find((line) => line.startsWith('data: '))?.slice(6);
          if (!event || !data) continue;
          const parsed = JSON.parse(data) as { text?: string; message?: string };

          if (event === 'delta') {
            updateActive((chat) => ({
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === assistantId ? { ...message, content: message.content + (parsed.text || '') } : message,
              ),
            }));
          }

          if (event === 'error') {
            throw new Error(parsed.message || 'Fallo la respuesta.');
          }
        }
      }

      updateActive((chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === assistantId ? { ...message, status: 'done' } : message,
        ),
      }));
    } catch (error) {
      updateActive((chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                status: 'error',
                content:
                  message.content ||
                  `No pude conectar con la IA: ${error instanceof Error ? error.message : 'error desconocido'}`,
              }
            : message,
        ),
      }));
    } finally {
      setIsStreaming(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function setPersona(persona: Persona) {
    updateActive((chat) => ({ ...chat, persona }));
  }

  function exportChat() {
    const body = activeChat.messages.map((message) => `[${message.time}] ${message.role}: ${message.content}`).join('\n\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeChat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'nexus-chat'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menu">
            <X size={20} />
          </button>
          <div className="brand-mark">
            <MessageSquareText size={23} />
          </div>
          <div>
            <strong>Nexusgram</strong>
            <span>AI command chat</span>
          </div>
        </div>

        <button className="new-chat" onClick={createChat}>
          <Plus size={18} />
          Nuevo canal
        </button>

        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar chats" />
        </label>

        <div className="chat-list">
          {filteredChats.map((chat) => {
            const chatMeta = personaMeta[chat.persona];
            const ChatIcon = chatMeta.icon;
            return (
              <button
                className={`chat-row ${chat.id === activeId ? 'active' : ''}`}
                key={chat.id}
                onClick={() => {
                  setActiveId(chat.id);
                  setSidebarOpen(false);
                }}
              >
                <span className="avatar" style={{ backgroundColor: chatMeta.accent }}>
                  <ChatIcon size={18} />
                </span>
                <span className="chat-copy">
                  <span>
                    <strong>{chat.title}</strong>
                    <small>{chat.messages.at(-1)?.time}</small>
                  </span>
                  <em>{chat.subtitle}</em>
                </span>
                {chat.unread ? <b>{chat.unread}</b> : null}
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <span>
            <ShieldCheck size={16} />
            Clave protegida por backend
          </span>
          <span>
            <Activity size={16} />
            {apiMode}
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <div className="current-agent">
            <span className="avatar large" style={{ backgroundColor: meta.accent }}>
              <PersonaIcon size={21} />
            </span>
            <div>
              <strong>{activeChat.title}</strong>
              <span>{meta.name} online - {meta.tone}</span>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificaciones">
              <Bell size={19} />
            </button>
            <button className="icon-button" onClick={exportChat} aria-label="Exportar chat">
              <Download size={19} />
            </button>
            <button className="icon-button" aria-label="Mas opciones">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        <div className="chat-surface">
          <section className="messages-panel">
            <div className="backdrop-credit">Nexus workspace</div>
            <div className="messages" ref={scrollRef}>
              <AnimatePresence initial={false}>
                {activeChat.messages.map((message) => (
                  <motion.article
                    className={`bubble-row ${message.role}`}
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {message.role === 'assistant' ? (
                      <span className="avatar mini" style={{ backgroundColor: meta.accent }}>
                        <PersonaIcon size={15} />
                      </span>
                    ) : null}
                    <div className={`bubble ${message.status === 'error' ? 'error' : ''}`}>
                      <p>{message.content || 'Pensando...'}</p>
                      <span className="bubble-meta">
                        {message.time}
                        {message.role === 'user' ? <Check size={13} /> : null}
                        {message.status === 'streaming' ? <span className="typing-dot" /> : null}
                      </span>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>

            <div className="command-strip">
              {commandPacks.map((command) => (
                <button key={command.label} onClick={() => setDraft(command.prompt)}>
                  <Sparkles size={15} />
                  {command.label}
                </button>
              ))}
            </div>

            <form className="composer" onSubmit={onSubmit}>
              <button className="icon-button" type="button" aria-label="Adjuntar">
                <Paperclip size={20} />
              </button>
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onDraftKeyDown}
                aria-label="Mensaje para Nexus"
                placeholder="Escribe a Nexus. Enter envia, Shift+Enter salta linea."
                rows={1}
              />
              <button className="icon-button" type="button" aria-label="Voz">
                <Mic size={20} />
              </button>
              <button className="send-button" type="submit" disabled={!draft.trim() || isStreaming} aria-label="Enviar">
                <Send size={19} />
              </button>
            </form>
          </section>

          <aside className="intel-panel">
            <section className="hero-card">
              <img src="/media/nexus-backdrop.png" alt="" />
              <div>
                <span>AI room</span>
                <strong>Interfaz tipo Telegram, con cerebro de comando.</strong>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-title">
                <strong>Modo de agente</strong>
                <Settings size={16} />
              </div>
              <div className="persona-grid">
                {(Object.keys(personaMeta) as Persona[]).map((persona) => {
                  const item = personaMeta[persona];
                  const Icon = item.icon;
                  return (
                    <button
                      className={persona === activeChat.persona ? 'selected' : ''}
                      key={persona}
                      onClick={() => setPersona(persona)}
                    >
                      <Icon size={17} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="panel-section stats">
              <div className="section-title">
                <strong>Contexto vivo</strong>
                <Archive size={16} />
              </div>
              <div className="stat-grid">
                <span>
                  <strong>{insights.messages}</strong>
                  Mensajes
                </span>
                <span>
                  <strong>{insights.words}</strong>
                  Palabras
                </span>
              </div>
              <p>{insights.lastUser}</p>
            </section>

            <section className="panel-section value-list">
              <div className="section-title">
                <strong>Herramientas listas</strong>
                <FileText size={16} />
              </div>
              <button onClick={() => setDraft('Resume la conversacion y dime las 5 decisiones mas importantes.')}>
                <PenLine size={16} />
                Resumen ejecutivo
              </button>
              <button onClick={() => setDraft('Convierte la conversacion en tareas accionables con prioridad alta, media y baja.')}>
                <Check size={16} />
                Tareas priorizadas
              </button>
              <button onClick={() => setDraft('Actua como equipo senior y revisa esta idea buscando riesgos tecnicos, legales y de negocio.')}>
                <Users size={16} />
                Revision experta
              </button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
