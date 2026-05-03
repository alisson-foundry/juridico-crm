import { useState, useRef, useEffect, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Shield, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';
import { User, Role } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

// ─── helpers ─────────────────────────────────────────────────────────────────
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

const emptyForm = { name: '', email: '', password: '', role: 'STAFF' as Role };

// ─── Action dropdown ──────────────────────────────────────────────────────────
function ActionMenu({
  user,
  isSelf,
  onEdit,
  onToggle,
  onDelete,
}: {
  user: User;
  isSelf: boolean;
  onEdit: (u: User) => void;
  onToggle: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        title="Ações"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1 text-sm">
          {/* Edit */}
          <button
            onClick={() => { setOpen(false); onEdit(user); }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} className="text-navy-900" />
            Editar dados
          </button>

          {/* Toggle active — disabled for self */}
          {!isSelf && (
            <button
              onClick={() => { setOpen(false); onToggle(user); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {user.active
                ? <ToggleLeft size={14} className="text-yellow-500" />
                : <ToggleRight size={14} className="text-green-500" />}
              {user.active ? 'Desativar' : 'Ativar'}
            </button>
          )}

          {/* Delete — disabled for self */}
          {!isSelf && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => { setOpen(false); onDelete(user); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Excluir usuário
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User modal (create + edit) ───────────────────────────────────────────────
function UserModal({
  editUser,
  onClose,
  onSuccess,
}: {
  editUser: User | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!editUser;
  const [form, setForm] = useState({
    name: editUser?.name ?? '',
    email: editUser?.email ?? '',
    password: '',
    role: (editUser?.role ?? 'STAFF') as Role,
    active: editUser?.active ?? true,
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
      };
      if (form.password) payload.password = form.password;
      if (isEdit) return api.put(`/users/${editUser!.id}`, payload);
      if (!form.password) throw new Error('Senha obrigatória.');
      return api.post('/users', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Usuário atualizado.' : 'Usuário criado.');
      onSuccess();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao salvar usuário.'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-navy-900">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <label className="label">
              {isEdit ? 'Nova senha' : 'Senha *'}
              {isEdit && (
                <span className="text-gray-400 font-normal ml-1">(deixe em branco para manter)</span>
              )}
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={set('password')}
              minLength={6}
              required={!isEdit}
              placeholder={isEdit ? '••••••' : ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Papel</label>
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="STAFF">Funcionário</option>
                <option value="LAWYER">Advogado</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={String(form.active)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.value === 'true' }))
                  }
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-gold" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<'new' | User | null>(null); // null = closed, 'new' = create, User = edit

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/users/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar usuário.'),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário excluído.');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Erro ao excluir usuário.'),
  });

  const handleDelete = (u: User) => {
    if (
      confirm(
        `Excluir o usuário "${u.name}"?\n\nEsta ação é permanente e não pode ser desfeita.`,
      )
    ) {
      deleteUser.mutate(u.id);
    }
  };

  const closeModal = () => setModal(null);
  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    closeModal();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <button className="btn-gold flex items-center gap-2" onClick={() => setModal('new')}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Email</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Papel</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium hidden lg:table-cell">
                  Cadastro
                </th>
                <th className="py-2 px-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 group">
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
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${roleColor[u.role]}`}
                    >
                      {u.role === 'ADMIN' && <Shield size={11} />}
                      {roleLabel[u.role]}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-400 hidden lg:table-cell">
                    {u.createdAt && format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="py-3 px-3">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionMenu
                        user={u}
                        isSelf={u.id === currentUser?.id}
                        onEdit={(u) => setModal(u)}
                        onToggle={(u) => toggleActive.mutate({ id: u.id, active: !u.active })}
                        onDelete={handleDelete}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal !== null && (
        <UserModal
          editUser={modal === 'new' ? null : modal}
          onClose={closeModal}
          onSuccess={afterSave}
        />
      )}
    </div>
  );
}
