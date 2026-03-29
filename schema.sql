-- Database Schema for WhatsApp CRM

-- 1. Funnel Stages (Fases do Funil)
CREATE TABLE funnel_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    color_code VARCHAR(7) NOT NULL, -- Hex code for UI
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers (Ficha Completa do Cliente)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_id VARCHAR(50) UNIQUE NOT NULL, -- Primary contact key
    full_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    cpf_cnpj VARCHAR(20),
    email VARCHAR(255),
    cep VARCHAR(10),
    address_street TEXT,
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    origin VARCHAR(100), -- Instagram, Google, Organic
    customer_type VARCHAR(50), -- B2B, B2C, VIP
    current_stage_id UUID REFERENCES funnel_stages(id),
    ltv DECIMAL(15, 2) DEFAULT 0.00,
    first_purchase_at TIMESTAMP WITH TIME ZONE,
    last_purchase_at TIMESTAMP WITH TIME ZONE,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Interactions Timeline (Histórico Cronológico)
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- message, status_change, automated_link, note
    content TEXT NOT NULL,
    agent_id UUID, -- For multi-attendant systems
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Initial Seed Data (Standard Sales Funnel)
INSERT INTO funnel_stages (name, color_code, sort_order) VALUES
('Primeiro Contato', '#3B82F6', 1), -- Blue 500
('Interesse em [X]', '#F59E0B', 2), -- Amber 500
('Orçamento/Proposta', '#8B5CF6', 3), -- Violet 500
('Pedido Realizado', '#10B981', 4), -- Emerald 500
('Em Entrega', '#6366F1', 5), -- Indigo 500
('Concluído', '#064E3B', 6), -- Dark Emerald 900
('Retenção/Suporte', '#EC4899', 7); -- Pink 500
