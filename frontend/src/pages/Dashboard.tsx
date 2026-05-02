import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Client, Activity } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function Dashboard() {
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const totalActive = clients.filter((c) => c.status === 'ACTIVE').length;
  const totalInactive = clients.filter((c) => c.status === 'INACTIVE').length;

  const allActivities = clients.flatMap((c) => c.activities ?? []);

  const pending = allActivities.filter((a) => a.status === 'PENDING').length;
  const inProgress = allActivities.filter((a) => a.status === 'IN_PROGRESS').length;
  const completed = allActivities.filter((a) => a.status === 'COMPLETED').length;

  const recentClients = [...clients].slice(0, 5);

  const stats = [
    { label: 'Clientes Ativos', value: totalActive, icon: Briefcase, color: 'text-navy-900', bg: 'bg-navy-50' },
    { label: 'Clientes Inativos', value: totalInactive, icon: Users, color: 'text-gray-600', bg: 'bg-gray-100' },
    { label: 'Atividades Pendentes', value: pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Em Andamento', value: inProgress, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Concluídas', value: completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do escritório</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy-900">Clientes Recentes</h2>
          <Link to="/clients" className="text-sm text-navy-900 hover:underline font-medium">
            Ver todos →
          </Link>
        </div>

        {recentClients.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium hidden md:table-cell">Tipo de Ação</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium hidden lg:table-cell">Entrada</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentClients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <Link to={`/clients/${c.id}`} className="font-medium text-navy-900 hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-400">{c.cpfCnpj}</p>
                    </td>
                    <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{c.actionType}</td>
                    <td className="py-3 px-3 text-gray-500 hidden lg:table-cell">
                      {format(new Date(c.entryDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        c.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Ativo' : c.status === 'INACTIVE' ? 'Inativo' : 'Arquivado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
