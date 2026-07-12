import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchItems = (id) => api.get(`/audit/cycles/${id}/items`).then((r) => r.data);
const verStatus = { PENDING: 'gray', VERIFIED: 'green', MISSING: 'red', DAMAGED: 'yellow' };

export default function AuditCycleDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['audit-items', id], queryFn: () => fetchItems(id) });
  const [selected, setSelected] = useState(null);
  const [verForm, setVerForm] = useState({ verificationStatus: 'VERIFIED', observedCondition: 'GOOD', notes: '' });
  const [discForm, setDiscForm] = useState({ discrepancyType: 'MISSING', description: '' });
  const [showDisc, setShowDisc] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: ({ itemId, body }) => api.put(`/audit/items/${itemId}/verify`, body),
    onSuccess: () => { qc.invalidateQueries(['audit-items', id]); setSelected(null); },
  });

  const discMutation = useMutation({
    mutationFn: ({ itemId, body }) => api.post(`/audit/items/${itemId}/discrepancies`, body),
    onSuccess: () => { setShowDisc(false); setSelected(null); qc.invalidateQueries(['audit-items', id]); },
  });

  const pending = items.filter((i) => i.verification_status === 'PENDING').length;
  const verified = items.filter((i) => i.verification_status === 'VERIFIED').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Audit Cycle Detail</h1>
        <div className="flex gap-6 mt-3">
          <div className="card py-3 px-5 flex items-center gap-3"><span className="text-2xl font-bold text-white">{items.length}</span><span className="text-slate-400 text-sm">Total Assets</span></div>
          <div className="card py-3 px-5 flex items-center gap-3"><span className="text-2xl font-bold text-green-400">{verified}</span><span className="text-slate-400 text-sm">Verified</span></div>
          <div className="card py-3 px-5 flex items-center gap-3"><span className="text-2xl font-bold text-yellow-400">{pending}</span><span className="text-slate-400 text-sm">Pending</span></div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-1">{selected.asset_name}</h3>
            <p className="text-sm text-slate-400 mb-4">Tag: {selected.asset_tag} | Expected: {selected.expected_location || '—'}</p>
            {!showDisc ? (
              <>
                <div className="space-y-3">
                  <div><label className="label">Verification Status</label>
                    <select className="input" value={verForm.verificationStatus} onChange={(e) => setVerForm({ ...verForm, verificationStatus: e.target.value })}>
                      {['VERIFIED','MISSING','DAMAGED'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Observed Condition</label>
                    <select className="input" value={verForm.observedCondition} onChange={(e) => setVerForm({ ...verForm, observedCondition: e.target.value })}>
                      {['NEW','GOOD','FAIR','POOR','DAMAGED'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Notes</label><textarea className="input" rows={2} value={verForm.notes} onChange={(e) => setVerForm({ ...verForm, notes: e.target.value })} /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => verifyMutation.mutate({ itemId: selected.id, body: verForm })} disabled={verifyMutation.isPending} className="btn-primary flex-1">Mark Verified</button>
                  <button onClick={() => setShowDisc(true)} className="btn-danger flex-1">Log Discrepancy</button>
                  <button onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div><label className="label">Discrepancy Type</label>
                    <select className="input" value={discForm.discrepancyType} onChange={(e) => setDiscForm({ ...discForm, discrepancyType: e.target.value })}>
                      {['MISSING','DAMAGED','WRONG_LOCATION','WRONG_HOLDER','STATUS_MISMATCH'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Description *</label><textarea className="input" rows={3} value={discForm.description} onChange={(e) => setDiscForm({ ...discForm, description: e.target.value })} /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => discMutation.mutate({ itemId: selected.id, body: discForm })} disabled={discMutation.isPending} className="btn-danger flex-1">Submit Discrepancy</button>
                  <button onClick={() => setShowDisc(false)} className="btn-secondary">Back</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading items...</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="table-header">Asset</th>
                <th className="table-header">Tag</th>
                <th className="table-header">Expected Location</th>
                <th className="table-header">Actual Location</th>
                <th className="table-header">Status</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-medium">{item.asset_name}</td>
                  <td className="table-cell"><code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{item.asset_tag}</code></td>
                  <td className="table-cell text-slate-400">{item.expected_location || '—'}</td>
                  <td className="table-cell text-slate-400">{item.actual_location || '—'}</td>
                  <td className="table-cell"><span className={`badge-${verStatus[item.verification_status]}`}>{item.verification_status}</span></td>
                  <td className="table-cell">
                    {item.verification_status === 'PENDING' && (
                      <button id={`verify-btn-${item.id}`} onClick={() => setSelected(item)} className="text-xs text-primary-400 hover:text-primary-300">Verify</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
