import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const TYPES = ['ROOM','EQUIPMENT','VEHICLE','LAB','AUDITORIUM','OTHER'];
const fetchResources = () => api.get('/resources').then((r) => r.data);
const fetchLocs = () => api.get('/org/locations').then((r) => r.data);
const fetchBookings = () => api.get('/bookings').then((r) => r.data);

const typeIcon = { ROOM:'🏠', EQUIPMENT:'⚙️', VEHICLE:'🚗', LAB:'🔬', AUDITORIUM:'🎭', OTHER:'📦' };

export default function Resources() {
  const qc = useQueryClient();
  const { data: resources = [], isLoading } = useQuery({ queryKey: ['resources'], queryFn: fetchResources });
  const { data: locs = [] } = useQuery({ queryKey: ['locations'], queryFn: fetchLocs });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: fetchBookings });
  const [tab, setTab] = useState('resources');
  const [showResForm, setShowResForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [resForm, setResForm] = useState({ name: '', resourceType: 'ROOM', capacity: '', locationId: '', isBookable: true, bookingAdvanceDays: 7 });
  const [bookForm, setBookForm] = useState({ resourceId: '', startTime: '', endTime: '', title: '', purpose: '', attendeeCount: '' });
  const [error, setError] = useState('');

  const createResMut = useMutation({
    mutationFn: (body) => api.post('/resources', body),
    onSuccess: () => { qc.invalidateQueries(['resources']); setShowResForm(false); setError(''); },
    onError: (err) => setError(err.response?.data?.error || 'Failed to create resource'),
  });

  const createBookMut = useMutation({
    mutationFn: (body) => api.post('/bookings', body),
    onSuccess: () => { qc.invalidateQueries(['bookings']); setShowBookForm(false); setError(''); },
    onError: (err) => setError(err.response?.data?.error || 'Failed to create booking'),
  });

  const cancelBookMut = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/bookings/${id}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries(['bookings']),
  });

  const statusColor = { CONFIRMED:'green', PENDING:'yellow', CANCELLED:'gray', COMPLETED:'blue' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Resources & Bookings</h1>
          <p className="text-slate-400 text-sm mt-1">Meeting rooms, equipment, and shared facilities</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowBookForm(true); setTab('bookings'); }} className="btn-primary">+ New Booking</button>
          <button onClick={() => setShowResForm(true)} className="btn-secondary">+ Add Resource</button>
        </div>
      </div>

      {showResForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add Resource</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Name *</label><input id="res-name" className="input" value={resForm.name} onChange={(e) => setResForm({ ...resForm, name: e.target.value })} placeholder="Board Room A" /></div>
            <div><label className="label">Type</label>
              <select id="res-type" className="input" value={resForm.resourceType} onChange={(e) => setResForm({ ...resForm, resourceType: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Capacity</label><input id="res-capacity" type="number" className="input" value={resForm.capacity} onChange={(e) => setResForm({ ...resForm, capacity: e.target.value })} placeholder="12" /></div>
            <div><label className="label">Location</label>
              <select id="res-loc" className="input" value={resForm.locationId} onChange={(e) => setResForm({ ...resForm, locationId: e.target.value })}>
                <option value="">No location</option>
                {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label className="label">Advance Booking (days)</label><input id="res-advance" type="number" className="input" value={resForm.bookingAdvanceDays} onChange={(e) => setResForm({ ...resForm, bookingAdvanceDays: parseInt(e.target.value) })} /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="res-save" onClick={() => createResMut.mutate(resForm)} disabled={createResMut.isPending || !resForm.name} className="btn-primary">{createResMut.isPending ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setShowResForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {showBookForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Booking</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Resource *</label>
              <select id="book-resource" className="input" value={bookForm.resourceId} onChange={(e) => setBookForm({ ...bookForm, resourceId: e.target.value })}>
                <option value="">Select resource…</option>
                {resources.filter(r => r.status === 'AVAILABLE').map((r) => <option key={r.id} value={r.id}>{typeIcon[r.resource_type]} {r.name} (cap: {r.capacity || '—'})</option>)}
              </select>
            </div>
            <div><label className="label">Start Date & Time *</label><input id="book-start" type="datetime-local" className="input" value={bookForm.startTime} onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })} /></div>
            <div><label className="label">End Date & Time *</label><input id="book-end" type="datetime-local" className="input" value={bookForm.endTime} onChange={(e) => setBookForm({ ...bookForm, endTime: e.target.value })} /></div>
            <div><label className="label">Meeting Title</label><input id="book-title" className="input" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} placeholder="Weekly Standup" /></div>
            <div><label className="label">Attendees</label><input id="book-attendees" type="number" className="input" value={bookForm.attendeeCount} onChange={(e) => setBookForm({ ...bookForm, attendeeCount: e.target.value })} placeholder="5" /></div>
            <div className="col-span-2"><label className="label">Purpose</label><textarea id="book-purpose" className="input" rows={2} value={bookForm.purpose} onChange={(e) => setBookForm({ ...bookForm, purpose: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="book-save" onClick={() => createBookMut.mutate({ ...bookForm, startTime: new Date(bookForm.startTime).toISOString(), endTime: new Date(bookForm.endTime).toISOString() })} disabled={createBookMut.isPending || !bookForm.resourceId || !bookForm.startTime || !bookForm.endTime} className="btn-primary">{createBookMut.isPending ? 'Booking…' : 'Book Resource'}</button>
            <button onClick={() => setShowBookForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['resources','bookings'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-secondary'}>
            {t === 'resources' ? `Resources (${resources.length})` : `All Bookings (${bookings.length})`}
          </button>
        ))}
      </div>

      {tab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? <div className="col-span-3 p-8 text-center text-slate-400">Loading…</div> :
           resources.length === 0 ? <div className="col-span-3 card text-center text-slate-400">No resources yet.</div> :
           resources.map((r) => (
            <div key={r.id} className="card hover:border-primary-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xl mr-2">{typeIcon[r.resource_type] || '📦'}</span>
                  <span className="font-medium text-white">{r.name}</span>
                </div>
                <span className={`badge-${r.status === 'AVAILABLE' ? 'green' : 'gray'}`}>{r.status}</span>
              </div>
              <p className="text-slate-400 text-sm">{r.resource_type} · Cap: {r.capacity || '—'} · {r.location_name || 'No location'}</p>
              {r.active_bookings > 0 && <p className="text-xs text-yellow-400 mt-1">{r.active_bookings} upcoming booking(s)</p>}
              <button onClick={() => { setBookForm(f => ({...f, resourceId: r.id})); setShowBookForm(true); }} className="mt-3 text-xs text-primary-400 hover:text-primary-300">Book this →</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card p-0 overflow-hidden">
          {bookings.length === 0 ? <div className="p-8 text-center text-slate-400">No bookings yet.</div> : (
            <table className="w-full">
              <thead className="border-b border-surface-border">
                <tr>
                  <th className="table-header">Resource</th>
                  <th className="table-header">Start</th>
                  <th className="table-header">End</th>
                  <th className="table-header">Booked By</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="table-row">
                    <td className="table-cell font-medium">{b.resource_name}<div className="text-xs text-slate-400">{b.title}</div></td>
                    <td className="table-cell text-slate-400 text-xs">{new Date(b.start_time).toLocaleString()}</td>
                    <td className="table-cell text-slate-400 text-xs">{new Date(b.end_time).toLocaleString()}</td>
                    <td className="table-cell text-slate-400">{b.booked_by_name}</td>
                    <td className="table-cell"><span className={`badge-${statusColor[b.status] || 'gray'}`}>{b.status}</span></td>
                    <td className="table-cell">
                      {['CONFIRMED','PENDING'].includes(b.status) && (
                        <button id={`cancel-book-${b.id}`} onClick={() => { const r = prompt('Cancellation reason?'); if (r) cancelBookMut.mutate({ id: b.id, reason: r }); }} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
