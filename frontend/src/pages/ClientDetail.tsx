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
} from 'lucide-react';
import api from '../services/api';
import { Client, Activity, ActivityStatus } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ActivityModal from '../components/ActivityModal';
import ClientForm from '../components/ClientForm';

const statusLabel: Record<ActivityStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const statusColor: Record<ActivityStatus, string> = {
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activityModal, setActivityModal] = useState<Activity | null | 'new'>(null);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | ''>('');

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then((r) => r.data),
  });

  const deleteActivity = useMutation({
    mutationFn: (actId: string) => api.delete(`/activities/${actId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast.success('Atividade removida.');
    },
    onError: () => toast.error('Erro ao remover atividade.'),
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

      {/* Timeline */}
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
            {/* Vertical line */}
            <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" />

            <div className="space-y-6">
              {activities.map((activity) => (
                <div key={activity.id} className="relative">
                  {/* Dot */}
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
                            statusColor[activity.status]
                          }`}
                        >
                          {statusLabel[activity.status]}
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
                        <span className="text-gray-300">
                          criado por {activity.createdBy.name}
                        </span>
                      )}
                    </div>

                    {/* Files */}
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

      {/* Modals */}
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
    </div>
  );
}
