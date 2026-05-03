import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  User,
  Calendar,
  Briefcase,
  Pencil,
  Trash2,
  FileText,
  Download,
  Filter,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import {
  Client,
  Activity,
  ActivityStatus,
  Contract,
  Installment,
  ContractStatus,
  InstallmentStatus,
  PaymentMethod,
} from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ActivityModal from '../components/ActivityModal';
import ClientForm from '../components/ClientForm';
import ContractForm from '../components/ContractForm';
import PaymentModal from '../components/PaymentModal';

// ─── Activity helpers ────────────────────────────────────────────────────────
const activityStatusLabel: Record<ActivityStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const activityStatusColor: Record<ActivityStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const timelineDot: Record<ActivityStatus, string> = {
  PENDING: 'bg-yellow-400',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-300',
};

// ─── Financial helpers ───────────────────────────────────────────────────────
const contractStatusLabel: Record<ContractStatus, string> = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Quitado',
  CANCELLED: 'Cancelado',
};

const contractStatusColor: Record<ContractStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const installmentStatusColor: Record<InstallmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const installmentStatusLabel: Record<InstallmentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelado',
};

const paymentMethodLabel: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CARD: 'Cartão',
  TRANSFER: 'Transferência',
};

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Financial Summary ───────────────────────────────────────────────────────
function FinancialSummary({ contracts }: { contracts: Contract[] }) {
  const allInstallments = contracts.flatMap((c) => c.installments);
  const total = contracts.reduce((s, c) => s + c.totalValue, 0);
  const received = allInstallments
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + i.value, 0);
  const pending = allInstallments
    .filter((i) => i.status === 'PENDING')
    .reduce((s, i) => s + i.value, 0);
  const overdue = allInstallments
    .filter((i) => i.status === 'OVERDUE')
    .reduce((s, i) => s + i.value, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-navy-900 rounded-xl p-4">
        <p className="text-xs text-blue-200 mb-1">Total Contratado</p>
        <p className="text-lg font-bold text-white">{formatBRL(total)}</p>
      </div>
      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
        <p className="text-xs text-green-600 mb-1">Recebido</p>
        <p className="text-lg font-bold text-green-700">{formatBRL(received)}</p>
      </div>
      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
        <p className="text-xs text-yellow-600 mb-1">A Receber</p>
        <p className="text-lg font-bold text-yellow-700">{formatBRL(pending)}</p>
      </div>
      <div className="bg-red-50 border border-red-100 rounded-xl p-4">
        <p className="text-xs text-red-600 mb-1">Vencido</p>
        <p className="text-lg font-bold text-red-700">{formatBRL(overdue)}</p>
      </div>
    </div>
  );
}

// ─── Contract Card ───────────────────────────────────────────────────────────
function ContractCard({
  contract,
  clientId,
  onDeleted,
}: {
  contract: Contract;
  clientId: string;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null);
  const queryClient = useQueryClient();

  const deleteContract = useMutation({
    mutationFn: () => api.delete(`/contracts/${contract.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', clientId] });
      toast.success('Contrato removido.');
      onDeleted();
    },
    onError: () => toast.error('Erro ao remover contrato.'),
  });

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Contract header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <DollarSign size={16} className="text-gold-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-900">{formatBRL(contract.totalValue)}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${contractStatusColor[contract.status]}`}
              >
                {contractStatusLabel[contract.status]}
              </span>
              <span className="text-xs text-gray-400">
                {contract.paymentType === 'LUMP_SUM'
                  ? 'À vista'
                  : `${contract.installments.length}x`}{' '}
                · {paymentMethodLabel[contract.paymentMethod]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Criado em {format(new Date(contract.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
              {contract.createdBy && ` por ${contract.createdBy.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              if (confirm('Excluir este contrato e todas as parcelas?'))
                deleteContract.mutate();
            }}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-gray-400"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Installments table */}
      {expanded && (
        <div className="divide-y divide-gray-50">
          {contract.installments.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 text-center">Nenhuma parcela encontrada.</p>
          ) : (
            contract.installments.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {inst.status === 'PAID' && <CheckCircle size={16} className="text-green-500" />}
                  {inst.status === 'OVERDUE' && <AlertCircle size={16} className="text-red-500" />}
                  {inst.status === 'PENDING' && <Clock size={16} className="text-yellow-500" />}
                  {inst.status === 'CANCELLED' && <XCircle size={16} className="text-gray-400" />}
                </div>

                {/* Installment info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-navy-900">
                      {contract.paymentType === 'LUMP_SUM' ? 'À Vista' : `Parcela ${inst.number}`}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${installmentStatusColor[inst.status]}`}
                    >
                      {installmentStatusLabel[inst.status]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                    <span>
                      Venc: {format(new Date(inst.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                    {inst.paidAt && (
                      <span className="text-green-600">
                        Pago: {format(new Date(inst.paidAt), 'dd/MM/yyyy', { locale: ptBR })}
                        {inst.paidWith && ` via ${paymentMethodLabel[inst.paidWith]}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Value */}
                <span className="text-sm font-semibold text-navy-900 flex-shrink-0">
                  {formatBRL(inst.value)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {inst.receiptName && (
                    <a
                      href={`/api/installments/${inst.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-gray-400 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Baixar comprovante"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={14} />
                    </a>
                  )}
                  {(inst.status === 'PENDING' || inst.status === 'OVERDUE') && (
                    <button
                      onClick={() => setPayingInstallment(inst)}
                      className="px-2.5 py-1 bg-gold-500 text-white rounded-lg text-xs font-medium hover:bg-gold-600 transition-colors"
                    >
                      Pagar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Payment modal */}
      {payingInstallment && (
        <PaymentModal
          installment={payingInstallment}
          clientId={clientId}
          onClose={() => setPayingInstallment(null)}
          onSuccess={() => setPayingInstallment(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'activities' | 'financial'>('activities');
  const [activityModal, setActivityModal] = useState<Activity | null | 'new'>(null);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | ''>('');
  const [showContractForm, setShowContractForm] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then((r) => r.data),
  });

  const { data: contracts = [], refetch: refetchContracts } = useQuery<Contract[]>({
    queryKey: ['contracts', id],
    queryFn: () => api.get(`/clients/${id}/contracts`).then((r) => r.data),
    enabled: !!id,
  });

  const deleteActivity = useMutation({
    mutationFn: (actId: string) => api.delete(`/activities/${actId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast.success('Atividade removida.');
    },
    onError: () => toast.error('Erro ao remover atividade.'),
  });

  const markOverdue = useMutation({
    mutationFn: () => api.post('/installments/mark-overdue'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
      const count = (res.data as { updated: number }).updated;
      if (count > 0) toast.success(`${count} parcela(s) marcada(s) como vencida(s).`);
      else toast('Nenhuma parcela vencida encontrada.', { icon: '✓' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) return <div className="text-center py-12 text-gray-400">Cliente não encontrado.</div>;

  const activities = (client.activities || []).filter(
    (a) => !statusFilter || a.status === statusFilter,
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/clients" className="p-2 hover:bg-gray-100 rounded-lg mt-1">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-900">{client.name}</h1>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                client.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : client.status === 'INACTIVE'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {client.status === 'ACTIVE' ? 'Ativo' : client.status === 'INACTIVE' ? 'Inativo' : 'Arquivado'}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{client.cpfCnpj}</p>
        </div>
        <button
          className="btn-secondary flex items-center gap-2"
          onClick={() => setEditClientOpen(true)}
        >
          <Pencil size={14} /> Editar
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {client.phone && (
          <div className="card flex items-center gap-3 py-4">
            <Phone size={18} className="text-gold-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Telefone</p>
              <p className="text-sm font-medium text-navy-900">{client.phone}</p>
            </div>
          </div>
        )}
        {client.email && (
          <div className="card flex items-center gap-3 py-4">
            <Mail size={18} className="text-gold-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm font-medium text-navy-900 truncate">{client.email}</p>
            </div>
          </div>
        )}
        <div className="card flex items-center gap-3 py-4">
          <Briefcase size={18} className="text-gold-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Tipo de Ação</p>
            <p className="text-sm font-medium text-navy-900">{client.actionType}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4">
          <User size={18} className="text-gold-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Responsável</p>
            <p className="text-sm font-medium text-navy-900">{client.responsible}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-4">
          <Calendar size={18} className="text-gold-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Data de Entrada</p>
            <p className="text-sm font-medium text-navy-900">
              {format(new Date(client.entryDate), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {client.notes && (
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Observações</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'activities'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Atividades
          {client.activities && client.activities.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
              {client.activities.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'financial'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Financeiro
          {contracts.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
              {contracts.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Activities Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'activities' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-semibold text-navy-900">Linha do Tempo</h2>
              <p className="text-xs text-gray-400 mt-0.5">{client.activities?.length ?? 0} atividade(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  className="input pl-8 text-xs py-1.5 w-40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ActivityStatus | '')}
                >
                  <option value="">Todos os status</option>
                  <option value="PENDING">Pendente</option>
                  <option value="IN_PROGRESS">Em Andamento</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <button
                className="btn-gold flex items-center gap-1.5 text-xs"
                onClick={() => setActivityModal('new')}
              >
                <Plus size={14} /> Nova Atividade
              </button>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">Nenhuma atividade registrada.</p>
              <button className="btn-gold mt-4 text-sm" onClick={() => setActivityModal('new')}>
                Registrar primeira atividade
              </button>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-6">
                {activities.map((activity) => (
                  <div key={activity.id} className="relative">
                    <div
                      className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                        timelineDot[activity.status]
                      }`}
                    />
                    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors group">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-navy-900 text-sm">{activity.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              activityStatusColor[activity.status]
                            }`}
                          >
                            {activityStatusLabel[activity.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setActivityModal(activity)}
                            className="p-1.5 hover:bg-white rounded-lg text-navy-900"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Excluir esta atividade?')) deleteActivity.mutate(activity.id);
                            }}
                            className="p-1.5 hover:bg-white rounded-lg text-red-500"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-gray-600 mb-2 whitespace-pre-line">{activity.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(new Date(activity.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {activity.responsible}
                        </span>
                        {activity.createdBy && (
                          <span className="text-gray-300">criado por {activity.createdBy.name}</span>
                        )}
                      </div>

                      {activity.files.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activity.files.map((f) => (
                            <a
                              key={f.id}
                              href={`/api/files/${f.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-navy-900 hover:border-navy-900 transition-colors"
                            >
                              <FileText size={12} />
                              <span className="max-w-[120px] truncate">{f.originalName}</span>
                              <Download size={11} className="text-gray-400" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Financial Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          {/* Summary */}
          {contracts.length > 0 && <FinancialSummary contracts={contracts} />}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-navy-900">Contratos</h2>
              <p className="text-xs text-gray-400 mt-0.5">{contracts.length} contrato(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => markOverdue.mutate()}
                disabled={markOverdue.isPending}
                className="btn-secondary flex items-center gap-1.5 text-xs"
                title="Verificar parcelas vencidas"
              >
                <RefreshCw size={13} className={markOverdue.isPending ? 'animate-spin' : ''} />
                Atualizar vencidas
              </button>
              <button
                className="btn-gold flex items-center gap-1.5 text-xs"
                onClick={() => setShowContractForm(true)}
              >
                <Plus size={14} /> Novo Contrato
              </button>
            </div>
          </div>

          {/* Contracts list */}
          {contracts.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <DollarSign size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">Nenhum contrato cadastrado.</p>
              <button
                className="btn-gold mt-4 text-sm"
                onClick={() => setShowContractForm(true)}
              >
                Criar primeiro contrato
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  clientId={id!}
                  onDeleted={() => refetchContracts()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {activityModal !== null && (
        <ActivityModal
          clientId={id!}
          activity={activityModal === 'new' ? null : activityModal}
          onClose={() => setActivityModal(null)}
        />
      )}

      {editClientOpen && (
        <ClientForm
          client={client}
          onClose={() => setEditClientOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['client', id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setEditClientOpen(false);
          }}
        />
      )}

      {showContractForm && (
        <ContractForm
          clientId={id!}
          onClose={() => setShowContractForm(false)}
          onSuccess={() => {
            setShowContractForm(false);
            refetchContracts();
          }}
        />
      )}
    </div>
  );
}
