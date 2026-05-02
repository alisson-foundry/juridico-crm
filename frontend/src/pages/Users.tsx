import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Shield } from 'lucide-react';
import api from '../services/api';
import { User, Role } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

const roleLabel: Record<Role, string> = {
  ADMIN: 'Administrador',
  LAWYER: 'Advogado',
  STAFF: 'Funcionário',
};

const roleColor: Record<Role, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  LAWYER: 'bg-navy-50 text-navy-900',
  STAFF: 'bg-gray-100 text-gray-600',
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STAFF' as Role });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const createUser = useMutation({
    mutationFn: (data: typeof form) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário criado.');
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'STAFF' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao criar usuário.'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/users/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('Erro ao atualizar usuário.'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createUser.mutate(form);
  };

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <button className="btn-gold flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Email</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Papel</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium hidden lg:table-cell">Cadastro</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-navy-900 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-navy-900">{u.name}</span>
                      {u.id === currentUser?.id && (
                        <span className="text-xs text-gray-400">(você)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{u.email}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${roleColor[u.role]}`}>
                      {u.role === 'ADMIN' && <Shield size={11} />}
                      {roleLabel[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-400 hidden lg:table-cell">
                    {u.createdAt && format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="py-3 px-3">
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                          u.active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-navy-900">Novo Usuário</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input className="input" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input type="password" className="input" value={form.password} onChange={set('password')} minLength={6} required />
              </div>
              <div>
                <label className="label">Papel</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="STAFF">Funcionário</option>
                  <option value="LAWYER">Advogado</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-gold" disabled={createUser.isPending}>
                  {createUser.isPending ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
