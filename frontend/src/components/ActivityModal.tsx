import { useState, FormEvent, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, FileText, Trash2, Download } from 'lucide-react';
import api from '../services/api';
import { Activity, ActivityStatus } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Props {
  clientId: string;
  activity?: Activity | null;
  onClose: () => void;
}

const statusOptions: { value: ActivityStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export default function ActivityModal({ clientId, activity, onClose }: Props) {
  const isEdit = !!activity;
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: activity?.title || '',
    description: activity?.description || '',
    date: activity?.date
      ? format(new Date(activity.date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    responsible: activity?.responsible || '',
    status: activity?.status || ('PENDING' as ActivityStatus),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? api.put(`/activities/${activity!.id}`, data)
        : api.post(`/clients/${clientId}/activities`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success(isEdit ? 'Atividade atualizada.' : 'Atividade criada.');
      onClose();
    },
    onError: () => toast.error('Erro ao salvar atividade.'),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ actId, file }: { actId: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/files/activities/${actId}/files`, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Arquivo anexado.');
    },
    onError: () => toast.error('Erro ao anexar arquivo.'),
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => api.delete(`/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Arquivo removido.');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activity) {
      uploadMutation.mutate({ actId: activity.id, file });
    }
    e.target.value = '';
  };

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-navy-900">{isEdit ? 'Editar Atividade' : 'Nova Atividade'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Título *</label>
            <input className="input" value={form.title} onChange={set('title')} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={form.date} onChange={set('date')} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Responsável *</label>
            <input className="input" value={form.responsible} onChange={set('responsible')} required />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Detalhes da movimentação..."
            />
          </div>

          {isEdit && (
            <div>
              <label className="label">Documentos Anexados</label>
              <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
                {activity.files.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Nenhum arquivo anexado</p>
                ) : (
                  activity.files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs"
                    >
                      <FileText size={14} className="text-navy-900 flex-shrink-0" />
                      <span className="flex-1 truncate text-gray-700">{f.originalName}</span>
                      <span className="text-gray-400 flex-shrink-0">{formatSize(f.size)}</span>
                      <a
                        href={`/api/files/${f.id}/download`}
                        className="p-1 hover:bg-navy-50 rounded text-navy-900"
                        title="Download"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteFile.mutate(f.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}

                <input type="file" ref={fileRef} className="hidden" onChange={handleFileChange} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-navy-900 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={uploadMutation.isPending}
                >
                  <Upload size={13} />
                  {uploadMutation.isPending ? 'Enviando...' : 'Anexar arquivo'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-gold" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar atividade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
