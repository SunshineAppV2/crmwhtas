import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Search,
  Plus,
  Smile,
  Paperclip,
  Mic,
  MoreVertical,
  CheckCheck
} from 'lucide-react';
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  limit
} from 'firebase/firestore';

// --- Types ---
interface Customer {
  id: string;
  name: string;
  whatsapp_id: string;
  lastMessage?: string;
  stage_id: string;
  ltv: number;
}

// --- Main App ---
function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeChat, setActiveChat] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Customers (Chats)
  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (sn) => {
      const list = sn.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(list);
    });
  }, []);

  // Load Active Chat Messages
  useEffect(() => {
    if (!activeChat) return;
    const q = query(
      collection(db, 'interactions'), 
      where('customer_id', '==', activeChat.id), 
      orderBy('created_at', 'asc'), 
      limit(50)
    );
    return onSnapshot(q, (sn) => {
      setMessages(sn.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [activeChat]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;
    const text = inputText;
    setInputText('');
    try {
      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: activeChat.whatsapp_id, 
          text: text, 
          customerId: activeChat.id 
        })
      });
    } catch (e) {
      console.error('Error sending:', e);
    }
  };

  return (
    <div className="crm-app">
      {/* 1. Left Icon Nav - Narrow Sidebar */}
      <nav className="icon-sidebar">
        <div className="sidebar-icon active"><MessageSquare size={24} /></div>
        <div className="sidebar-icon"><LayoutDashboard size={24} /></div>
        <div className="sidebar-icon"><UsersIcon size={24} /></div>
        <div className="sidebar-icon"><Settings size={24} style={{ marginTop: 'auto' }} /></div>
      </nav>

      {/* 2. Middle Chat List - Sidebar */}
      <aside className="chat-list-container">
        <header className="list-header">
          <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>WhatsApp</h2>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--wa-icon-gray)' }}>
             <Plus size={20} style={{ cursor: 'pointer' }} />
             <MoreVertical size={20} style={{ cursor: 'pointer' }} />
          </div>
        </header>

        <div className="search-container">
           <div className="search-box">
              <Search size={16} color="var(--wa-text-secondary)" />
              <input className="search-input" placeholder="Pesquisar ou começar uma nova conversa" />
           </div>
        </div>

        {/* Filters Like In The Screenshot */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
           <span className="badge" style={{ background: 'rgba(0,168,132,0.1)', color: 'var(--wa-green)' }}>Tudo</span>
           <span className="badge" style={{ background: '#F0F2F5', color: 'var(--wa-text-secondary)' }}>Não lidas</span>
           <span className="badge" style={{ background: '#F0F2F5', color: 'var(--wa-text-secondary)' }}>Favoritas</span>
        </div>

        <div className="chat-list">
          {customers.map(c => (
            <div 
              key={c.id} 
              className={`chat-item ${activeChat?.id === c.id ? 'active' : ''}`}
              onClick={() => setActiveChat(c)}
            >
              <div className="avatar-large">{c.name.charAt(0)}</div>
              <div className="chat-info">
                <div className="chat-meta">
                  <span className="chat-name">{c.name}</span>
                  <span className="chat-time">11:34</span>
                </div>
                <div className="chat-last-msg">{c.lastMessage || 'Ola, como posso ajudar?'}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 3. Main Chat Window - Area */}
      <main className="chat-window">
        {activeChat ? (
          <>
            <header className="window-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div className="avatar-large" style={{ width: '40px', height: '40px' }}>{activeChat.name.charAt(0)}</div>
                 <div>
                    <div style={{ fontWeight: 500 }}>{activeChat.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)' }}>clique aqui para dados do contato</div>
                 </div>
              </div>
              <MoreVertical size={20} color="var(--wa-icon-gray)" />
            </header>

            <div className="chat-messages">
               {messages.map(m => {
                 const isMe = m.interaction_type === 'agent_message';
                 return (
                   <div key={m.id} className={`msg-bubble-wrap ${isMe ? 'sent' : 'received'}`}>
                      <div className={`msg-bubble ${isMe ? 'sent' : 'received'}`}>
                         {m.content}
                         <span className="bubble-time">
                           {m.created_at?.toDate() ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(m.created_at.toDate()) : '--:--'}
                           {isMe && <CheckCheck size={14} color="#53BDEB" style={{ marginLeft: '4px', position: 'relative', top: '2px' }} />}
                         </span>
                      </div>
                   </div>
                 );
               })}
               <div ref={chatEndRef} />
            </div>

            <footer className="chat-input-bar">
               <Smile className="action-btn" />
               <Paperclip className="action-btn" />
               <input 
                 className="input-field" 
                 placeholder="Digite uma mensagem" 
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               />
               <Mic className="action-btn" />
            </footer>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--wa-text-secondary)', zIndex: 10 }}>
             <MessageSquare size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
             <div style={{ fontSize: '2rem', fontWeight: 300 }}>WhatsApp para Empresas</div>
             <p>Selecione um contato para começar a conversar.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const UsersIcon = ({ size, style }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default App;
