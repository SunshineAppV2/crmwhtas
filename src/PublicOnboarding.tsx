import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  IdCard, 
  Mail, 
  ArrowRight,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PublicOnboarding = () => {
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    whatsapp: '',
    cep: '',
    address: '',
    city: '',
    state: ''
  });

  const nextStep = () => setStep(prev => prev + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Enviando dados para o cliente ID:", id, formData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="onboarding-public" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#0b141a' }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="glass-pane" 
          style={{ maxWidth: '450px', width: '100%', padding: '40px', borderRadius: '32px', textAlign: 'center' }}
        >
          <div style={{ width: '80px', height: '80px', background: 'rgba(37, 211, 102, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle color="#25D366" size={48} />
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '12px' }}>Tudo Pronto!</h1>
          <p style={{ color: '#8696a0', lineHeight: '1.6', marginBottom: '32px' }}>
            Seus dados foram atualizados com sucesso. Já avisamos nossa equipe e em breve entraremos em contato.
          </p>
          <button style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#25D366', color: '#0b141a', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <MessageCircle size={20} /> Voltar para o WhatsApp
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="onboarding-public" style={{ minHeight: '100vh', background: '#0b141a', color: '#e9edef', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Visual */}
      <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
        {/* Placeholder Logo */}
        <div style={{ width: '64px', height: '64px', background: '#25D366', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <User color="#0B141A" size={32} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Cadastro de Cliente</h1>
        <p style={{ color: '#8696a0', fontSize: '0.9rem', marginTop: '8px' }}>Preencha seus dados para agilizar seu atendimento.</p>
      </div>

      <div style={{ padding: '0 24px 60px', maxWidth: '500px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} className="glass-pane" style={{ padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 style={{ fontSize: '1.1rem', marginBottom: '24px' }}>Dados Pessoais</h2>
                
                <PublicInput icon={<User size={18} />} label="Nome Completo" placeholder="Como você quer ser chamado?" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <PublicInput icon={<IdCard size={18} />} label="CPF / CNPJ" placeholder="000.000.000-00" value={formData.cpf} onChange={v => setFormData({...formData, cpf: v})} />
                <PublicInput icon={<Mail size={18} />} label="E-mail" placeholder="seuemail@exemplo.com" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
                
                <button type="button" onClick={nextStep} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#25D366', color: '#0b141a', border: 'none', fontWeight: 700, fontSize: '1rem', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Avançar <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 style={{ fontSize: '1.1rem', marginBottom: '24px' }}>Logística e Entrega</h2>
                
                <PublicInput icon={<MapPin size={18} />} label="CEP" placeholder="00000-000" value={formData.cep} onChange={v => setFormData({...formData, cep: v})} />
                <PublicInput icon={<MapPin size={18} />} label="Endereço Completo" placeholder="Rua, Número, Complemento" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <PublicInput icon={null} label="Cidade" placeholder="Cidade" value={formData.city} onChange={v => setFormData({...formData, city: v})} />
                  <PublicInput icon={null} label="UF" placeholder="Estado" value={formData.state} onChange={v => setFormData({...formData, state: v})} />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}>Voltar</button>
                  <button type="submit" style={{ flex: 2, padding: '16px', borderRadius: '12px', background: '#25D366', color: '#0b141a', border: 'none', fontWeight: 700, fontSize: '1rem' }}>Finalizar Cadastro</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </form>
      </div>
    </div>
  );
};

const PublicInput = ({ icon, label, placeholder, value, onChange, type = "text" }: { icon: any, label: string, placeholder: string, value: string, onChange: (v: string) => void, type?: string }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', fontSize: '0.75rem', color: '#8696a0', marginBottom: '8px', fontWeight: 600 }}>{label}</label>
    <div style={{ position: 'relative' }}>
      {icon && <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8696a0' }}>{icon}</div>}
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ 
          width: '100%', 
          padding: `14px 16px ${icon ? '14px 48px' : '14px 16px'}`, 
          paddingLeft: icon ? '48px' : '16px',
          background: '#202c33', 
          border: '1px solid rgba(255,255,255,0.05)', 
          borderRadius: '12px', 
          color: '#e9edef', 
          fontSize: '0.95rem',
          outline: 'none',
          boxSizing: 'border-box'
        }} 
      />
    </div>
  </div>
);

export default PublicOnboarding;
