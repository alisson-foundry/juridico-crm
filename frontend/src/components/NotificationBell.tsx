import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.activity) {
      navigate(`/clients/${n.activity.clientId}`);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} className="text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-20">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-sm text-navy-900">Notificações</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    className="text-xs text-navy-900 hover:underline"
                    onClick={() => markAll.mutate()}
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">Nenhuma notificação</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !n.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="text-xs text-gray-800 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
