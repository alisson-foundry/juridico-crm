import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { Installment, PaymentMethod } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Props {
  installment: Installment;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  BOLETO: 'Boleto',
  CARD: 'Cartão',
  TRANSFER: 'Transferência',
};

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PaymentModal({ installment, clientId, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [paidWith, setPaidWith] = useState<PaymentMethod>('PIX');
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('paidWith', paidWith);
      fd.append('paidAt', paidAt);
      if (notes) fd.append('notes', notes);
      if (receipt) fd.append('receipt', receipt);
      return api.patch(`/installments/${installment.id}/pay`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', clientId] });
      toast.success('Pagamento registrado!');
      onSuccess();
    },
    onError: () => toast.error('Erro ao registrar pagamento.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Registrar Pagamento</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Parcela {installment.number} — venc.{' '}
              {format(new Date(installment.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Valor */}
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">Valor a pagar</span>
            <span className="text-lg font-bold text-green-700">{formatBRL(installment.value)}</span>
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Data do Pagamento</label>
            <input
              type="date"
              className="input"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Forma de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaidWith(m)}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                    paidWith === m
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {paymentMethodLabels[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Comprovante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Comprovante <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
            />
            {receipt ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-green-700 truncate flex-1">{receipt.name}</span>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                <Upload size={16} />
                Anexar comprovante
              </button>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Informações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-gold flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
