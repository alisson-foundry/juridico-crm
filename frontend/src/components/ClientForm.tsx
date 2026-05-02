import { useState, FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../services/api';
import { Client } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Props {
  client?: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClientForm({ client, onClose, onSuccess }: Props) {
  const isEdit = !!client;

  const [form, setForm] = useState({
    name: client?.name || '',
    cpfCnpj: client?.cpfCnpj || '',
    email: client?.email || '',
    phone: client?.phone || '',
    actionType: client?.actionType || '',
    entryDate: client?.entryDate
      ? format(new Date(client.entryDate), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    responsible: client?.responsible || '',
    notes: client?.notes || '',
    status: client?.status || 'ACTIVE',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? api.put(`/clients/${client!.id}`, data)
        : api.post('/clients', data),
    onSuccess: () => {
      toast.success(isEdit ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erro ao salvar cliente.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-navy-900">{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome completo *</label>
              <input className="input" value={form.name} onChange={set('name')} required />
            </div>

            <div>
              <label className="label">CPF / CNPJ *</label>
              <input className="input" value={form.cpfCnpj} onChange={set('cpfCnpj')} placeholder="000.000.000-00" required />
            </div>

            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="(11) 99999-0000" />
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} />
            </div>

            <div>
              <label className="label">Tipo de Ação *</label>
              <input className="input" value={form.actionType} onChange={set('actionType')} placeholder="Ex: Ação Trabalhista" required />
            </div>

            <div>
              <label className="label">Data de Entrada *</label>
              <input type="date" className="input" value={form.entryDate} onChange={set('entryDate')} required />
            </div>

            <div>
              <label className="label">Responsável *</label>
              <input className="input" value={form.responsible} onChange={set('responsible')} required />
            </div>

            {isEdit && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="ARCHIVED">Arquivado</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="label">Observações</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Informações adicionais sobre o cliente..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-gold" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
