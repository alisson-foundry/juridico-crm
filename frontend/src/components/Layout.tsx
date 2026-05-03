import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LogOut,
  Scale,
  Menu,
  X,
  TrendingUp,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';

// ─── Help content ─────────────────────────────────────────────────────────────
const helpSections = [
  {
    title: 'Clientes',
    icon: '👤',
    items: [
      { action: 'Cadastrar cliente', desc: 'Clique em "Novo Cliente" na página Clientes.' },
      { action: 'Ver detalhes', desc: 'Clique no nome do cliente na lista.' },
      { action: 'Editar', desc: 'Na página do cliente, botão "Editar" no canto superior.' },
      { action: 'Excluir', desc: 'Menu ··· na linha do cliente → "Excluir cliente".' },
      { action: 'Buscar', desc: 'Campo de pesquisa por nome, CPF/CNPJ ou tipo de ação.' },
      { action: 'Filtrar por status', desc: 'Selecione Ativo, Inativo ou Arquivado no filtro.' },
    ],
  },
  {
    title: 'Atividades',
    icon: '📋',
    items: [
      { action: 'Registrar atividade', desc: 'Página do cliente → aba "Atividades" → "Nova Atividade".' },
      { action: 'Editar ou excluir', desc: 'Passe o mouse sobre a atividade e use os ícones que aparecem.' },
      { action: 'Anexar arquivo', desc: 'No formulário de atividade, use o campo de upload.' },
      { action: 'Baixar arquivo', desc: 'Clique no nome do arquivo anexado na linha do tempo.' },
      { action: 'Filtrar por status', desc: 'Use o filtro de status no topo da linha do tempo.' },
    ],
  },
  {
    title: 'Financeiro (por cliente)',
    icon: '💰',
    items: [
      { action: 'Criar contrato', desc: 'Página do cliente → aba "Financeiro" → "Novo Contrato".' },
      { action: 'À vista', desc: 'Gera uma única parcela com vencimento na data informada.' },
      { action: 'Parcelado', desc: 'Gera N parcelas automáticas, mensais, a partir da data inicial.' },
      { action: 'Registrar pagamento', desc: 'Clique em "Pagar" na linha da parcela.' },
      { action: 'Comprovante', desc: 'Faça upload do comprovante ao registrar o pagamento.' },
      { action: 'Baixar comprovante', desc: 'Ícone de download na linha da parcela paga.' },
      { action: 'Atualizar vencidas', desc: 'Botão "Atualizar vencidas" marca parcelas em atraso.' },
    ],
  },
  {
    title: 'Financeiro Geral',
    icon: '📊',
    items: [
      { action: 'Visão consolidada', desc: 'Menu "Financeiro" — mostra todos os contratos do escritório.' },
      { action: 'Indicadores', desc: '5 cards: total contratado, recebido, em aberto, em atraso e previsão 30 dias.' },
      { action: 'Fluxo de caixa', desc: 'Gráfico de barras com os últimos 6 meses separado por status.' },
      { action: 'Alertas', desc: 'Painéis de parcelas vencidas, próximas do vencimento e clientes inadimplentes.' },
      { action: 'Listagem de parcelas', desc: 'Tabela com filtros por status, responsável e período.' },
      { action: 'Navegar', desc: 'Clique em qualquer cliente ou parcela para acessar diretamente.' },
    ],
  },
  {
    title: 'Usuários',
    icon: '🔐',
    items: [
      { action: 'Acesso', desc: 'Apenas Administradores visualizam e gerenciam usuários.' },
      { action: 'Criar usuário', desc: 'Botão "Novo Usuário" na página Usuários.' },
      { action: 'Editar', desc: 'Menu ··· → "Editar dados" — nome, e-mail, papel, senha e status.' },
      { action: 'Ativar / Desativar', desc: 'Menu ··· → "Ativar" ou "Desativar". Usuário inativo não acessa o sistema.' },
      { action: 'Excluir', desc: 'Menu ··· → "Excluir". Bloqueado se o usuário tiver clientes ou contratos vinculados.' },
      { action: 'Papéis', desc: 'Administrador: acesso total. Advogado: acesso operacional. Funcionário: acesso básico.' },
    ],
  },
];

// ─── Help modal ───────────────────────────────────────────────────────────────
function HelpModal({ onClose }: { onClose: () => void }) {
  const [openSection, setOpenSection] = useState<number | null>(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-start p-0 lg:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full lg:w-96 lg:ml-64 rounded-t-2xl lg:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-gold-500" />
            <h2 className="font-semibold text-navy-900">Manual de Uso</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {helpSections.map((section, idx) => (
            <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => setOpenSection(openSection === idx ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                  <span>{section.icon}</span>
                  {section.title}
                </span>
                {openSection === idx
                  ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                  : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />
                }
              </button>

              {/* Section items */}
              {openSection === idx && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {section.items.map((item, i) => (
                    <div key={i} className="px-4 py-2.5">
                      <p className="text-xs font-semibold text-navy-900 mb-0.5">{item.action}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Footer */}
          <p className="text-center text-xs text-gray-300 py-3">
            Jurídico CRM · Gestão Advocatícia
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clients', label: 'Clientes', icon: Briefcase },
    { to: '/finance', label: 'Financeiro', icon: TrendingUp },
    ...(user?.role === 'ADMIN' ? [{ to: '/users', label: 'Usuários', icon: Users }] : []),
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`${
        mobile ? 'flex' : 'hidden lg:flex'
      } flex-col h-full bg-navy-900 text-white`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-700">
        <Scale className="text-gold-500 flex-shrink-0" size={24} />
        <div>
          <p className="font-bold text-sm leading-tight">Jurídico CRM</p>
          <p className="text-xs text-navy-100 opacity-70">Gestão Advocatícia</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-gold-500 text-white font-medium'
                  : 'text-navy-100 hover:bg-navy-700'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-navy-700 space-y-1">
        {/* Help button */}
        <button
          onClick={() => { setHelpOpen(true); setSidebarOpen(false); }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-navy-100 hover:bg-navy-700 transition-colors w-full"
        >
          <HelpCircle size={18} className="text-gold-500" />
          Manual de uso
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-navy-100 opacity-70">{user?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-navy-100 hover:bg-navy-700 transition-colors w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Help modal */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
