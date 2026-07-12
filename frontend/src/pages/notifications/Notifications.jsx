import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchNotifs = () => api.get('/notifications').then((r) => r.data);
const typeIcon = { INFO:'ℹ️', WARNING:'⚠️', ALERT:'🚨', SUCCESS:'✅' };

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifs = [], isLoading } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifs });

  const markReadMut = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });
  const markAllMut = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 text-sm mt-1">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <button id="mark-all-read" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending} className="btn-secondary text-sm">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? <div className="card text-center text-slate-400">Loading…</div> :
         notifs.length === 0 ? <div className="card text-center text-slate-400">No notifications yet.</div> :
         notifs.map((n) => (
          <div key={n.id} className={`card flex items-start gap-4 py-4 ${!n.is_read ? 'border-primary-600' : ''}`}>
            <span className="text-xl mt-0.5">{typeIcon[n.type] || 'ℹ️'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
              <p className="text-sm text-slate-400 mt-0.5">{n.message}</p>
              <p className="text-xs text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && (
              <button id={`read-notif-${n.id}`} onClick={() => markReadMut.mutate(n.id)} className="text-xs text-primary-400 hover:text-primary-300 flex-shrink-0">Mark read</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
