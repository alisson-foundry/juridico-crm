import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Eye } from 'lucide-react';
import api from '../services/api';
import { Client, ClientStatus } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ClientForm from '../components/ClientForm';

const statusLabel: Record<ClientStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ARCHIVED: 'Arquivado',
};

const statusColor: Record<ClientStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export default function Clients() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search, statusFilter],
    queryFn: () =>
      api
        .get('/clients', { params: { q: search || undefined, status: statusFilter || undefined } })
        .then((r) => r.data),
  });

  const deleteClient = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente removido.');
    },
    onError: () => toast.error('Erro ao remover cliente.'),
  });

  const handleDelete = (client: Client) => {
    if (confirm(`Excluir cliente "${client.name}"? Esta ação não pode ser desfeita.`)) {
      deleteClient.mutate(client.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} cliente(s) encontrado(s)</p>
        </div>
        <button className="btn-gold flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nome, CPF/CNPJ, tipo de ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="input pl-9 w-full sm:w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum cliente encontrado.</p>
            <button className="btn-gold mt-4" onClick={() => setShowForm(true)}>
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium hidden md:table-cell">Tipo de Ação</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium hidden lg:table-cell">Responsável</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium hidden lg:table-cell">Entrada</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Atividades</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                    <td className="py-3 px-3">
                      <Link to={`/clients/${c.id}`} className="font-medium text-navy-900 hover:underline block">
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-400">{c.cpfCnpj}</p>
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{c.actionType}</td>
                    <td className="py-3 px-3 text-gray-500 hidden lg:table-cell">{c.responsible}</td>
                    <td className="py-3 px-3 text-gray-500 hidden lg:table-cell">
                      {format(new Date(c.entryDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[c.status]}`}>
                        {statusLabel[c.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-sm font-semibold text-navy-900">{c._count?.activities ?? 0}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/clients/${c.id}`}
                          className="p-1.5 rounded hover:bg-navy-50 text-navy-900"
                          title="Ver detalhes"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showForm || editClient) && (
        <ClientForm
          client={editClient}
          onClose={() => { setShowForm(false); setEditClient(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setShowForm(false);
            setEditClient(null);
          }}
        />
      )}
    </div>
  );
}
