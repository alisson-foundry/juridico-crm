import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Percent,
  Receipt,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Kpis {
  totalContracted: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  next30days: number;
}

interface CashflowEntry {
  month: string;
  received: number;
  pending: number;
  overdue: number;
}

interface LawyerRevenue {
  responsible: string;
  total: number;
  received: number;
  pending: number;
  overdue: number;
}

interface AlertInstallment {
  id: string;
  number: number;
  value: number;
  dueDate: string;
  status: string;
  contract: {
    paymentMethod: string;
    client: { id: string; name: string; responsible: string };
  };
}

interface DefaultingClient {
  client: { id: string; name: string; cpfCnpj: string; responsible: string };
  overdueAmount: number;
}

interface Summary {
  kpis: Kpis;
  cashflow: CashflowEntry[];
  revenueByLawyer: LawyerRevenue[];
  alerts: {
    overdueInstallments: AlertInstallment[];
    nearDue: AlertInstallment[];
    defaultingClients: DefaultingClient[];
  };
  metrics: {
    defaultRate: number;
    avgTicket: number;
    totalContracts: number;
    totalClients: number;
  };
}

interface InstallmentRow {
  id: string;
  number: number;
  value: number;
  dueDate: string;
  status: string;
  paidAt?: string;
  paidWith?: string;
  contract: {
    id: string;
    paymentMethod: string;
    client: { id: string; name: string; cpfCnpj: string; responsible: string };
  };
}

interface InstallmentsResponse {
  total: number;
  page: number;
  limit: number;
  data: InstallmentRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelado',
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const methodLabels: Record<string, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CARD: 'Cartão',
  TRANSFER: 'Transferência',
};

// Custom tooltip for recharts
function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-navy-900 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill || p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-navy-900">{formatBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  bg,
  textColor,
  iconColor,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  bg: string;
  textColor: string;
  iconColor: string;
  sub?: string;
}) {
  return (
    <div className={`card flex items-start gap-4 ${bg}`}>
      <div className={`p-3 rounded-xl bg-white/60`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold ${textColor} leading-tight`}>{value}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const queryClient = useQueryClient();

  // Filters for the installments table
  const [statusFilter, setStatusFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Summary data
  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ['finance-summary'],
    queryFn: () => api.get('/finance/summary').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });

  // Installments list
  const { data: instPage, isLoading: instLoading } = useQuery<InstallmentsResponse>({
    queryKey: ['finance-installments', statusFilter, responsibleFilter, startDate, endDate, page],
    queryFn: () =>
      api
        .get('/finance/installments', {
          params: {
            status: statusFilter || undefined,
            responsible: responsibleFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            page,
            limit: LIMIT,
          },
        })
        .then((r) => r.data),
  });

  const markOverdue = useMutation({
    mutationFn: () => api.post('/installments/mark-overdue'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['finance-installments'] });
      const count = (res.data as { updated: number }).updated;
      if (count > 0) toast.success(`${count} parcela(s) marcada(s) como vencida(s).`);
      else toast('Nenhuma nova parcela vencida.', { icon: '✓' });
    },
  });

  // Lawyers list for filter dropdown
  const lawyers = useMemo(() => {
    if (!summary) return [];
    return summary.revenueByLawyer.map((r) => r.responsible);
  }, [summary]);

  // Max for lawyer bar chart
  const maxLawyer = useMemo(() => {
    if (!summary?.revenueByLawyer.length) return 1;
    return Math.max(...summary.revenueByLawyer.map((r) => r.total));
  }, [summary]);

  const totalPages = instPage ? Math.ceil(instPage.total / LIMIT) : 1;

  if (summaryLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = summary!;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Financeiro Geral</h1>
          <p className="text-gray-500 text-sm mt-1">Visão consolidada de contratos e pagamentos</p>
        </div>
        <button
          onClick={() => markOverdue.mutate()}
          disabled={markOverdue.isPending}
          className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={15} className={markOverdue.isPending ? 'animate-spin' : ''} />
          Atualizar vencidas
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Contratado"
          value={formatBRL(s.kpis.totalContracted)}
          icon={DollarSign}
          bg="bg-navy-50"
          textColor="text-navy-900"
          iconColor="text-navy-900"
          sub={`${s.metrics.totalContracts} contrato(s)`}
        />
        <KpiCard
          label="Total Recebido"
          value={formatBRL(s.kpis.totalReceived)}
          icon={CheckCircle}
          bg="bg-green-50"
          textColor="text-green-700"
          iconColor="text-green-600"
        />
        <KpiCard
          label="Em Aberto"
          value={formatBRL(s.kpis.totalPending)}
          icon={Clock}
          bg="bg-yellow-50"
          textColor="text-yellow-700"
          iconColor="text-yellow-600"
        />
        <KpiCard
          label="Em Atraso"
          value={formatBRL(s.kpis.totalOverdue)}
          icon={AlertCircle}
          bg="bg-red-50"
          textColor="text-red-700"
          iconColor="text-red-500"
        />
        <KpiCard
          label="Previsão 30 dias"
          value={formatBRL(s.kpis.next30days)}
          icon={TrendingUp}
          bg="bg-blue-50"
          textColor="text-blue-700"
          iconColor="text-blue-600"
          sub="parcelas pendentes"
        />
      </div>

      {/* ── Cashflow Chart + Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart — 2/3 width */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-navy-900 mb-4">Fluxo de Caixa — Últimos 6 Meses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.cashflow} barSize={14} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                width={42}
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v) =>
                  v === 'received' ? 'Recebido' : v === 'pending' ? 'Previsto' : 'Vencido'
                }
              />
              <Bar dataKey="received" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pending" fill="#eab308" radius={[3, 3, 0, 0]} />
              <Bar dataKey="overdue" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Metrics — 1/3 width */}
        <div className="space-y-3">
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-50">
              <Percent size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{s.metrics.defaultRate}%</p>
              <p className="text-xs text-gray-500">Taxa de Inadimplência</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-navy-900">{formatBRL(s.metrics.avgTicket)}</p>
              <p className="text-xs text-gray-500">Ticket Médio por Contrato</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-navy-50">
              <Users size={20} className="text-navy-900" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{s.metrics.totalClients}</p>
              <p className="text-xs text-gray-500">Clientes Ativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenue by Lawyer ───────────────────────────────────────────────── */}
      {s.revenueByLawyer.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-navy-900 mb-4">Receita por Advogado / Responsável</h2>
          <div className="space-y-3">
            {s.revenueByLawyer.map((r) => (
              <div key={r.responsible}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-navy-900 flex items-center gap-1.5">
                    <User size={13} className="text-gray-400" />
                    {r.responsible}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">{formatBRL(r.received)}</span>
                    <span className="text-yellow-600">{formatBRL(r.pending)}</span>
                    <span className="font-semibold text-navy-900">{formatBRL(r.total)}</span>
                  </div>
                </div>
                {/* Stacked progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-400 transition-all"
                    style={{ width: `${(r.received / maxLawyer) * 100}%` }}
                  />
                  <div
                    className="h-full bg-yellow-300 transition-all"
                    style={{ width: `${(r.pending / maxLawyer) * 100}%` }}
                  />
                  <div
                    className="h-full bg-red-400 transition-all"
                    style={{ width: `${(r.overdue / maxLawyer) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Recebido</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" /> Previsto</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Vencido</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────────────── */}
      {(s.alerts.overdueInstallments.length > 0 ||
        s.alerts.nearDue.length > 0 ||
        s.alerts.defaultingClients.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Overdue */}
          {s.alerts.overdueInstallments.length > 0 && (
            <div className="card border-l-4 border-red-400">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-red-500" />
                <h3 className="font-semibold text-navy-900 text-sm">
                  Parcelas Vencidas ({s.alerts.overdueInstallments.length})
                </h3>
              </div>
              <div className="space-y-2">
                {s.alerts.overdueInstallments.slice(0, 5).map((i) => (
                  <Link
                    key={i.id}
                    to={`/clients/${i.contract.client.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy-900 truncate group-hover:underline">
                        {i.contract.client.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Parcela {i.number} · venc.{' '}
                        {format(new Date(i.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-semibold text-red-600">{formatBRL(i.value)}</span>
                      <ArrowUpRight size={12} className="text-gray-300 group-hover:text-navy-900" />
                    </div>
                  </Link>
                ))}
                {s.alerts.overdueInstallments.length > 5 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{s.alerts.overdueInstallments.length - 5} mais
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Near Due */}
          {s.alerts.nearDue.length > 0 && (
            <div className="card border-l-4 border-yellow-400">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-yellow-500" />
                <h3 className="font-semibold text-navy-900 text-sm">
                  Vencem em 7 dias ({s.alerts.nearDue.length})
                </h3>
              </div>
              <div className="space-y-2">
                {s.alerts.nearDue.slice(0, 5).map((i) => (
                  <Link
                    key={i.id}
                    to={`/clients/${i.contract.client.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy-900 truncate group-hover:underline">
                        {i.contract.client.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Parcela {i.number} · venc.{' '}
                        {format(new Date(i.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-semibold text-yellow-700">{formatBRL(i.value)}</span>
                      <ArrowUpRight size={12} className="text-gray-300 group-hover:text-navy-900" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Defaulting clients */}
          {s.alerts.defaultingClients.length > 0 && (
            <div className="card border-l-4 border-orange-400">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-orange-500" />
                <h3 className="font-semibold text-navy-900 text-sm">
                  Clientes Inadimplentes ({s.alerts.defaultingClients.length})
                </h3>
              </div>
              <div className="space-y-2">
                {s.alerts.defaultingClients.slice(0, 5).map(({ client, overdueAmount }) => (
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy-900 truncate group-hover:underline">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-400">{client.responsible}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-semibold text-orange-600">
                        {formatBRL(overdueAmount)}
                      </span>
                      <ArrowUpRight size={12} className="text-gray-300 group-hover:text-navy-900" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Installments Table ──────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-navy-900">Listagem Geral de Parcelas</h2>
            {instPage && (
              <p className="text-xs text-gray-400 mt-0.5">{instPage.total} parcela(s) encontrada(s)</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="input pl-8 text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Vencida</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="input pl-8 text-sm"
              value={responsibleFilter}
              onChange={(e) => { setResponsibleFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todos os responsáveis</option>
              {lawyers.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="input pl-8 text-sm"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              placeholder="Data início"
            />
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="input pl-8 text-sm"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              placeholder="Data fim"
            />
          </div>
        </div>

        {instLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !instPage?.data.length ? (
          <p className="text-center text-sm text-gray-400 py-10">Nenhuma parcela encontrada.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Cliente</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium hidden md:table-cell">Responsável</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Parcela</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Vencimento</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium hidden lg:table-cell">Forma</th>
                    <th className="text-right py-2 px-3 text-gray-500 font-medium">Valor</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {instPage.data.map((inst) => (
                    <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                      <td className="py-3 px-3">
                        <Link
                          to={`/clients/${inst.contract.client.id}`}
                          className="font-medium text-navy-900 hover:underline block"
                        >
                          {inst.contract.client.name}
                        </Link>
                        <p className="text-xs text-gray-400">{inst.contract.client.cpfCnpj}</p>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs hidden md:table-cell">
                        {inst.contract.client.responsible}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        Parcela {inst.number}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <span className={inst.status === 'OVERDUE' ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(inst.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        {inst.paidAt && (
                          <p className="text-xs text-green-600">
                            Pago: {format(new Date(inst.paidAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs hidden lg:table-cell">
                        {methodLabels[inst.contract.paymentMethod] ?? inst.contract.paymentMethod}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-navy-900">
                        {formatBRL(inst.value)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[inst.status]}`}>
                          {statusLabels[inst.status] ?? inst.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          to={`/clients/${inst.contract.client.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 rounded-lg block"
                          title="Ver cliente"
                        >
                          <ArrowUpRight size={14} className="text-navy-900" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Página {page} de {totalPages} · {instPage.total} parcela(s)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
