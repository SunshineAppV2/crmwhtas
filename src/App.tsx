import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
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
  nickname?: string;
  lastMessage: string;
  time: string;
  ltv: number;
  tags: string[];
  stage_id: string;
  whatsapp_id: string;
  email?: string;
}

// --- Constants ---
const STAGES: Stage[] = [
  { id: '1', name: 'Primeiro Contato', color: '#3B82F6' },
  { id: '2', name: 'Interesse', color: '#F59E0B' },
  { id: '3', name: 'Orçamento', color: '#8B5CF6' },
  { id: '4', name: 'Pedido Realizado', color: '#10B981' },
];

// --- Components ---

const SidebarNav = ({ activeView, setView }: { activeView: string, setView: (v: string) => void }) => (
  <div className="glass-pane sidebar" style={{ width: '280px', height: '100%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--wa-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageSquare size={18} color="#0B141A" />
        </div>
        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>CRM Whats</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setView('dashboard')} />
        <NavItem icon={<Users size={20} />} label="Clientes / Link" active={activeView === 'onboarding'} onClick={() => setView('onboarding')} />
        <NavItem icon={<MessageSquare size={20} />} label="Mensagens Rápidas" active={activeView === 'snippets'} onClick={() => setView('snippets')} />
        <NavItem icon={<Settings size={20} />} label="Configuração" active={activeView === 'settings'} onClick={() => setView('settings')} />
      </nav>
    </div>
  </div>
);

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`}>{icon}<span style={{ fontWeight: 500 }}>{label}</span></div>
);

const CustomerDetail = ({ customer, onClose }: { customer: Customer | null, onClose: () => void }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customer) return;
    const q = query(collection(db, 'interactions'), where('customer_id', '==', customer.id), orderBy('created_at', 'asc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [customer]);

  const handleSend = async () => {
    if (!inputText.trim() || !customer || sending) return;
    setSending(true);
    try {
      const resp = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: customer.whatsapp_id, text: inputText, customerId: customer.id })
      });
      if (resp.ok) setInputText('');
    } catch (e) {
      console.error('Error sending message:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {customer && (
        <motion.div initial={{ x: '100vw' }} animate={{ x: 0 }} exit={{ x: '100vw' }} transition={{ type: 'spring', damping: 30, stiffness: 250 }} className="chat-sidebar shadow-2xl">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-chat">{customer.name.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{customer.name}</div>
                <div style={{ color: 'var(--wa-green)', fontSize: '0.75rem', fontWeight: 600 }}>online</div>
              </div>
            </div>
            <button onClick={onClose} className="close-btn">×</button>
          </div>

          <div className="chat-body" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/650/HD-wallpaper-whatsapp-dark-mode-pattern-whatsapp-graphic-design-pattern-design.jpg")', backgroundSize: '400px', backgroundRepeat: 'repeat', opacity: 0.9 }}>
            {messages.map((m) => {
              const iso = m.interaction_type === 'agent_message';
              return (
                <div key={m.id} className={`msg-bubble-container ${iso ? 'sent' : 'received'}`}>
                  <div className={`msg-bubble ${iso ? 'sent' : 'received'}`}>
                    {m.content}
                    <div className="msg-time">{m.created_at?.toDate() ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(m.created_at.toDate()) : '--:--'}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-footer">
            <input 
              className="chat-input" 
              placeholder="Digite uma mensagem..." 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const KanbanColumn = ({ stage, customers, onSelect, onDrop }: { stage: Stage, customers: Customer[], onSelect: (c: Customer) => void, onDrop: (custId: string, stageId: string) => void }) => (
  <div className="kanban-column" onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e.dataTransfer.getData('customerId'), stage.id)}>
    <div className="column-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></div>
        <h3>{stage.name}</h3>
        <span className="badge">{customers.length}</span>
      </div>
    </div>
    <div className="card-list">
      {customers.map(c => (
        <motion.div 
          key={c.id} 
          className="customer-card" 
          layoutId={c.id} 
          draggable 
          onDragStartCapture={(e: React.DragEvent) => e.dataTransfer.setData('customerId', c.id)} 
          onClick={() => onSelect(c)}
        >
          <div className="card-title">{c.name}</div>
          <div className="card-text">{c.lastMessage || 'Sem mensagens recentes'}</div>
          <div className="card-meta">
            <span>R$ {c.ltv.toFixed(2)}</span>
            <span style={{ fontSize: '0.7rem' }}>{c.whatsapp_id}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

function App() {
  const [view, setView] = useState('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (sn) => setCustomers(sn.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));
  }, []);

  const moveCustomer = async (custId: string, newStageId: string) => {
    await updateDoc(doc(db, 'customers', custId), { stage_id: newStageId, updated_at: serverTimestamp() });
    await addDoc(collection(db, 'interactions'), {
      customer_id: custId,
      interaction_type: 'log',
      content: `Etapa alterada para: ${STAGES.find(s => s.id === newStageId)?.name}`,
      created_at: serverTimestamp()
    });
  };

  return (
    <div className="crm-app">
      <SidebarNav activeView={view} setView={setView} />
      {view === 'dashboard' && (
        <main className="kanban-board">
          {STAGES.map(s => <KanbanColumn key={s.id} stage={s} customers={customers.filter(c => c.stage_id === s.id)} onSelect={setSelectedCustomer} onDrop={moveCustomer} />)}
        </main>
      )}
      {view === 'onboarding' && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Gestão de Leads</h2>
          <p style={{ color: 'var(--text-muted)' }}>Mande o link abaixo para seus novos clientes:</p>
          <div className="glass-pane p-4 mt-4 inline-block">
             <code>crm-web-whtas.vercel.app/cadastrar/PROXIMO-ID</code>
          </div>
        </div>
      )}
      <CustomerDetail customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    </div>
  );
}

export default App;
