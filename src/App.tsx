import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Plus, 
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  DollarSign
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
interface Stage {
  id: string;
  name: string;
  color: string;
}

interface Customer {
  id: string;
  name: string;
  nickname?: string;
  lastMessage: string;
  time: string;
  ltv: number;
  tags: string[];
  stage_id: string;
  whatsapp_id?: string;
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
  <div className="glass-pane" style={{ width: '280px', height: '100%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--wa-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageSquare size={18} color="#0B141A" />
        </div>
        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold', color: 'var(--text-main)' }}>CRM Whats</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <NavItem 
          icon={<LayoutDashboard size={20} />} 
          label="Dashboard" 
          active={activeView === 'dashboard'} 
          onClick={() => setView('dashboard')}
        />
        <NavItem 
          icon={<Users size={20} />} 
          label="Cadastro / Link" 
          active={activeView === 'onboarding'} 
          onClick={() => setView('onboarding')}
        />
        <NavItem 
          icon={<MessageSquare size={20} />} 
          label="Snippets" 
          active={activeView === 'snippets'} 
          onClick={() => setView('snippets')}
        />
        <NavItem 
          icon={<Settings size={20} />} 
          label="Configurações" 
          active={activeView === 'settings'} 
          onClick={() => setView('settings')}
        />
      </nav>
    </div>
  </div>
);

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <div 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      padding: '12px 16px', 
      borderRadius: '12px',
      cursor: 'pointer',
      background: active ? 'rgba(37, 211, 102, 0.1)' : 'transparent',
      color: active ? 'var(--wa-green)' : 'var(--text-muted)',
      transition: 'all 0.2s'
    }}
  >
    {icon}
    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{label}</span>
  </div>
);

const KanbanColumn = ({ stage, customers, onSelect, onDrop }: { stage: Stage, customers: Customer[], onSelect: (c: Customer) => void, onDrop: (custId: string, stageId: string) => void }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    const customerId = e.dataTransfer.getData('customerId');
    onDrop(customerId, stage.id);
  };

  return (
    <div 
      className="kanban-column animate-in" 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></div>
          <h3>{stage.name}</h3>
          <span className="badge">{customers.length}</span>
        </div>
        <MoreHorizontal size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
      </div>
      
      <div className="card-list">
        {customers.map(customer => (
          <motion.div 
            key={customer.id} 
            className="customer-card" 
            layoutId={customer.id}
            draggable
            onDragStartCapture={(e: React.DragEvent) => e.dataTransfer.setData('customerId', customer.id)}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98, cursor: 'grabbing' }}
            onClick={() => onSelect(customer)}
          >
            <div className="card-title">{customer.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer.lastMessage || 'Sem mensagens recentes'}
            </div>
            <div className="card-meta">
              <span>{customer.time || 'Novo'}</span>
              <span style={{ opacity: 0.3 }}>|</span>
              <span className="badge-ltv">R$ {(customer.ltv || 0).toFixed(2)}</span>
            </div>
          </motion.div>
        ))}
        <div style={{ padding: '8px', border: '1px dashed var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <Plus size={18} />
        </div>
      </div>
    </div>
  );
};

const CustomerDetail = ({ customer, onClose }: { customer: Customer | null, onClose: () => void }) => {
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (!customer) return;
    const q = query(
      collection(db, 'interactions'), 
      where('customer_id', '==', customer.id),
      orderBy('created_at', 'desc'),
      limit(5)
    );
    
    return onSnapshot(q, (snapshot) => {
      setTimeline(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [customer]);

  return (
    <AnimatePresence>
      {customer && (
        <motion.div 
          initial={{ x: 400 }} 
          animate={{ x: 0 }} 
          exit={{ x: 400 }}
          className="customer-sidebar glass-pane"
        >
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-large">{customer.name.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>{customer.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{customer.nickname || 'WhatsApp User'}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--wa-green)', color: '#0B141A', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Mandar Mensagem</button>
            <button style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <MoreHorizontal color="var(--text-main)" size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DetailItem icon={<Phone size={16} />} label="WhatsApp" value={customer.whatsapp_id || 'Não informado'} />
            <DetailItem icon={<Mail size={16} />} label="E-mail" value={customer.email || 'Não informado'} />
            <DetailItem icon={<DollarSign size={16} />} label="LTV Total" value={`R$ ${(customer.ltv || 0).toFixed(2)}`} highlight />
          </div>

          <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--wa-green)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              <MessageSquare size={14} /> Histórico Recente
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {timeline.length > 0 ? timeline.map(t => (
                <div key={t.id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '8px' }}>
                   "{t.content}"
                </div>
              )) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem interações registradas.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DetailItem = ({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string, highlight?: boolean }) => (
  <div className="form-group">
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      {icon}
      <label style={{ margin: 0 }}>{label}</label>
    </div>
    <div style={{ 
      padding: '10px 0', 
      borderBottom: '1px solid var(--border)', 
      fontWeight: 500, 
      fontSize: '0.95rem',
      color: highlight ? 'var(--wa-green)' : 'var(--text-main)'
    }}>
      {value}
    </div>
  </div>
);

const OnboardingForm = () => (
  <div className="glass-pane animate-in" style={{ maxWidth: '600px', margin: '40px auto', padding: '32px', borderRadius: '24px' }}>
    <h2 style={{ marginBottom: '24px', color: 'var(--wa-green)' }}>Link de Auto-Cadastro</h2>
    <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
      Envie este link para seu cliente. Quando ele preencher, os dados aparecerão automaticamente no seu CRM.
    </p>
    
    <div className="form-group" style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '32px' }}>
      <label>URL Gerada</label>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input readOnly value="crm-whats.app/cadastrar/8a2f-91b1" className="form-input" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} />
        <button style={{ padding: '0 20px', background: 'var(--wa-green)', border: 'none', borderRadius: '8px', fontWeight: 600 }}>Copiar</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <DetailItem icon={<Users size={16} />} label="Campos Ativos" value="Nome, CPF, Endereço, E-mail" />
      <DetailItem icon={<Calendar size={16} />} label="Expiração" value="Nunca" />
    </div>
  </div>
);

const SnippetsView = () => {
  const snippets = [
    { cmd: '/pix', text: 'Olá {nome}, use nossa chave PIX: cnpj@empresa.com' },
    { cmd: '/catalogo', text: 'Aqui está nosso catálogo atualizado: drive.link/meu-negocio' },
    { cmd: '/rastreio', text: 'Olá {nome}, seu pedido {id} está em transito!' },
  ];

  return (
    <div className="animate-in" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0 }}>Mensagens Rápidas (Snippets)</h2>
        <button style={{ padding: '10px 20px', background: 'var(--wa-green)', border: 'none', borderRadius: '12px', fontWeight: 600, color: '#0B141A' }}>+ Novo Snippet</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {snippets.map(s => (
          <div key={s.cmd} className="glass-pane" style={{ padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--wa-green)', marginBottom: '4px' }}>{s.cmd}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{s.text}</div>
            </div>
            <MoreHorizontal color="var(--text-muted)" />
          </div>
        ))}
      </div>
    </div>
  )
};

// --- Main App ---

function App() {
  const [view, setView] = useState('dashboard');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // --- Real-time Firestore Sync ---
  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const moveCustomer = async (custId: string, newStageId: string) => {
    try {
      const customerDoc = doc(db, 'customers', custId);
      await updateDoc(customerDoc, { 
        stage_id: newStageId,
        updated_at: serverTimestamp() 
      });

      // Record in Timeline
      await addDoc(collection(db, 'interactions'), {
        customer_id: custId,
        interaction_type: 'change_status',
        content: `Lead movido para etapa: ${STAGES.find(s => s.id === newStageId)?.name}`,
        created_at: serverTimestamp()
      });
    } catch (error) {
      console.error("Erro ao mover cliente:", error);
    }
  };

  return (
    <div className="crm-app">
      <SidebarNav activeView={view} setView={setView} />
      
      {view === 'dashboard' && (
        <main className="kanban-board">
          {STAGES.map(stage => (
            <KanbanColumn 
              key={stage.id} 
              stage={stage} 
              customers={customers.filter(c => c.stage_id === stage.id)} 
              onSelect={setSelectedCustomer}
              onDrop={moveCustomer}
            />
          ))}
        </main>
      )}

      {view === 'onboarding' && <OnboardingForm />}
      {view === 'snippets' && <SnippetsView />}

      {view === 'settings' && (
        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚙️</div>
          <div>Configurações do CRM</div>
        </div>
      )}

      <CustomerDetail 
        customer={selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
      />
    </div>
  );
}

export default App;
