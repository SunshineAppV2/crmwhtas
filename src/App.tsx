import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Smile,
  Paperclip,
  Mic,
  MoreVertical,
  CheckCheck,
  Users,
  Send,
  Loader2
} from 'lucide-react';
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  where,
  limit
} from 'firebase/firestore';

// --- Types ---
interface Stage { id: string; name: string; color: string; }
interface Customer {
  id: string;
  name: string;
  whatsapp_id: string;
  lastMessage?: string;
  stage_id: string;
  ltv: number;
  unread_count?: number;
}

const STAGES: Stage[] = [
  { id: '1', name: 'Primeiro Contato', color: '#3B82F6' },
  { id: '2', name: 'Interesse', color: '#F59E0B' },
  { id: '3', name: 'Orçamento', color: '#8B5CF6' },
  { id: '4', name: 'Pedido Realizado', color: '#10B981' },
];

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeChat, setActiveChat] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Customers
  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('updated_at', 'desc'));
    return onSnapshot(q, (sn) => {
      setCustomers(sn.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    });
  }, []);

  // Load Messages for active chat
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

  const selectChat = async (cust: Customer) => {
    setActiveChat(cust);
    if (cust.unread_count && cust.unread_count > 0) {
      await updateDoc(doc(db, 'customers', cust.id), { unread_count: 0 });
    }
  };

  const moveCustomer = async (custId: string, newStageId: string) => {
    const customerRef = doc(db, 'customers', custId);
    await updateDoc(customerRef, { stage_id: newStageId, updated_at: serverTimestamp() });
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat || sending) return;
    setSending(true);
    try {
      await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeChat.whatsapp_id, text: inputText, customerId: activeChat.id })
      });
      setInputText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="crm-app">
      {/* 1. Icon Sidebar */}
      <nav className="icon-sidebar">
        <div className="sidebar-icon active"><MessageSquare size={24} /></div>
        <div className="sidebar-icon"><LayoutDashboard size={24} /></div>
        <div className="sidebar-icon"><Users size={24} /></div>
        <div className="sidebar-icon" style={{ marginTop: 'auto' }}><Settings size={24} /></div>
      </nav>

      {/* 2. Chat-Kanban Area */}
      <main style={{ flex: 1, display: 'flex', overflowX: 'auto', background: '#F0F2F5', padding: '16px', gap: '8px' }}>
        {STAGES.map(stage => (
          <div 
            key={stage.id} 
            className="kanban-chat-column"
            onDragOver={e => e.preventDefault()}
            onDrop={e => moveCustomer(e.dataTransfer.getData('customerId'), stage.id)}
          >
            <div className="column-header-wa">
              <span style={{ color: stage.color, fontWeight: 'bold' }}>{stage.name.toUpperCase()}</span>
              <span className="badge-wa">{customers.filter(c => c.stage_id === stage.id).length}</span>
            </div>

            <div className="chat-item-list">
              {customers.filter(c => c.stage_id === stage.id).map(c => (
                <div 
                  key={c.id} 
                  className={`chat-item-card ${activeChat?.id === c.id ? 'active' : ''}`}
                  draggable
                  onDragStartCapture={e => e.dataTransfer.setData('customerId', c.id)}
                  onClick={() => selectChat(c)}
                >
                  <div className="avatar-wa">{c.name.charAt(0)}</div>
                  <div className="chat-content-wa">
                    <div className="chat-row-wa">
                      <span className="chat-name-wa">{c.name}</span>
                      <span className="chat-time-wa">11:34</span>
                    </div>
                    <div className="chat-msg-row">
                      <div className="chat-msg-wa">{c.lastMessage || 'Ola, como posso ajudar?'}</div>
                      {c.unread_count && c.unread_count > 0 ? (
                        <div className="wa-unread-badge">{c.unread_count}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* 3. Floating Chat Window */}
      {activeChat && (
        <aside className="floating-chat-window shadow-left">
          <header className="window-header-wa">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div className="avatar-wa" style={{ width: '40px', height: '40px' }}>{activeChat.name.charAt(0)}</div>
               <div>
                  <div style={{ fontWeight: 600 }}>{activeChat.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--wa-green-dark)' }}>Sincronizado via Whats</div>
               </div>
            </div>
            <button onClick={() => setActiveChat(null)} className="close-chat-btn">×</button>
          </header>

          <div className="chat-messages-wa">
             {messages.map((m, idx) => {
               const isMe = m.interaction_type === 'agent_message';
               const showDate = idx === 0;
               return (
                 <div key={m.id}>
                   {showDate && <div className="chat-date"><span>HOJE</span></div>}
                   <div className={`msg-wrap-wa ${isMe ? 'sent' : 'received'}`}>
                    <div className={`msg-bubble-wa ${isMe ? 'sent' : 'received'}`}>
                       {m.content}
                       <span className="msg-time-wa">
                         {m.created_at?.toDate() ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(m.created_at.toDate()) : '--:--'}
                         {isMe && <CheckCheck size={14} color="#53BDEB" style={{ marginLeft: '4px' }} />}
                       </span>
                    </div>
                   </div>
                 </div>
               );
             })}
             <div ref={chatEndRef} />
          </div>

          <footer className="chat-footer-wa">
             <Smile className="wa-icon" />
             <Paperclip className="wa-icon" />
             <input 
               className="wa-input" 
               placeholder="Digite uma mensagem" 
               value={inputText}
               onChange={e => setInputText(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSend()}
             />
             <button className="send-wa-btn" onClick={handleSend}>
                {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
             </button>
          </footer>
        </aside>
      )}
    </div>
  );
}

export default App;
