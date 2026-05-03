import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, DollarSign, Calendar, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { Contract, PaymentMethod, PaymentType } from '../types';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Props {
  clientId: string;
  onClose: () => void;
  onSuccess: (contract: Contract) => void;
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

export default function ContractForm({ clientId, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [paymentType, setPaymentType] = useState<PaymentType>('INSTALLMENT');
  const [totalValue, setTotalValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [installmentCount, setInstallmentCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const parsedValue = parseFloat(totalValue.replace(',', '.')) || 0;
  const parsedCount = Math.max(1, parseInt(installmentCount) || 1);

  // Preview parcelas
  const previewInstallments = useMemo(() => {
    if (!parsedValue || !startDate) return [];
    const n = paymentType === 'LUMP_SUM' ? 1 : parsedCount;
    const instValue = Math.round((parsedValue / n) * 100) / 100;
    const start = new Date(startDate + 'T12:00:00');
    return Array.from({ length: n }, (_, i) => ({
      number: i + 1,
      value: instValue,
      dueDate: addMonths(start, i),
    }));
  }, [parsedValue, parsedCount, paymentType, startDate]);

  const mutation = useMutation({
    mutationFn: () =>
      api
        .post(`/clients/${clientId}/contracts`, {
          totalValue: parsedValue,
          paymentType,
          paymentMethod,
          startDate,
          installmentCount: parsedCount,
          notes: notes || undefined,
        })
        .then((r) => r.data as Contract),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', clientId] });
      toast.success('Contrato criado com sucesso!');
      onSuccess(contract);
    },
    onError: () => toast.error('Erro ao criar contrato.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedValue || parsedValue <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-navy-900">Novo Contrato</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Valor Total */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Valor Total <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
              <input
                className="input pl-9"
                placeholder="0,00"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Tipo de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['LUMP_SUM', 'INSTALLMENT'] as PaymentType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPaymentType(t)}
                  className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                    paymentType === t
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'LUMP_SUM' ? 'À Vista' : 'Parcelado'}
                </button>
              ))}
            </div>
          </div>

          {/* Nº Parcelas (only if INSTALLMENT) */}
          {paymentType === 'INSTALLMENT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de Parcelas</label>
              <input
                type="number"
                min={2}
                max={120}
                className="input"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
              />
            </div>
          )}

          {/* Método de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Forma de Pagamento</label>
            <div className="relative">
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="input appearance-none pr-9"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{paymentMethodLabels[m]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data de Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {paymentType === 'LUMP_SUM' ? 'Data de Vencimento' : 'Data da 1ª Parcela'}
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="input pl-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Informações adicionais sobre o contrato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Preview */}
          {parsedValue > 0 && previewInstallments.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-navy-900 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <DollarSign size={14} />
                  {paymentType === 'LUMP_SUM'
                    ? `À vista: ${formatBRL(parsedValue)}`
                    : `${parsedCount}x de ${formatBRL(Math.round((parsedValue / parsedCount) * 100) / 100)}`}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform ${showPreview ? 'rotate-180' : ''}`}
                />
              </button>
              {showPreview && (
                <div className="divide-y divide-gray-50">
                  {previewInstallments.map((inst) => (
                    <div key={inst.number} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className="text-gray-500">
                        {paymentType === 'LUMP_SUM' ? 'Vencimento' : `Parcela ${inst.number}`}
                      </span>
                      <span className="text-gray-600">
                        {format(inst.dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span className="font-semibold text-navy-900">{formatBRL(inst.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-gold flex-1"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Salvando...' : 'Criar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
