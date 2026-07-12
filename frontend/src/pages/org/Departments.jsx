import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchDepts = () => api.get('/org/departments').then((r) => r.data);

export default function Departments() {
  const qc = useQueryClient();
  const { data: depts = [], isLoading } = useQuery({ queryKey: ['departments'], queryFn: fetchDepts });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', parentDepartmentId: '' });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/org/departments', body),
    onSuccess: () => { qc.invalidateQueries(['departments']); setShowForm(false); setForm({ name: '', code: '', description: '', parentDepartmentId: '' }); },
    onError: (err) => setError(err.response?.data?.error || 'Failed to create department'),
  });

  const statusBadge = (s) => s === 'ACTIVE' ? <span className="badge-green">{s}</span> : <span className="badge-gray">{s}</span>;

  // Build Hierarchy Tree
  const buildTree = (departments) => {
    const map = {};
    const roots = [];
    departments.forEach(d => { map[d.id] = { ...d, children: [] }; });
    departments.forEach(d => {
      if (d.parent_department_id && map[d.parent_department_id]) {
        map[d.parent_department_id].children.push(map[d.id]);
      } else {
        roots.push(map[d.id]);
      }
    });
    return roots;
  };

  const renderRow = (dept, level = 0) => (
    <React.Fragment key={dept.id}>
      <tr className="table-row">
        <td className="table-cell font-medium" style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
          {level > 0 && <span className="text-slate-500 mr-2">↳</span>}
          {dept.name}
        </td>
        <td className="table-cell"><code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{dept.code}</code></td>
        <td className="table-cell text-slate-400">{dept.head_name || '—'}</td>
        <td className="table-cell">{statusBadge(dept.status)}</td>
      </tr>
      {dept.children.map(child => renderRow(child, level + 1))}
    </React.Fragment>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Departments</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your organization's department structure</p>
        </div>
        <button id="add-dept-btn" onClick={() => setShowForm(true)} className="btn-primary">+ Add Department</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Department</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input id="dept-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Engineering" />
            </div>
            <div>
              <label className="label">Code *</label>
              <input id="dept-code" className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ENG" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input id="dept-desc" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div>
              <label className="label">Parent Department</label>
              <select id="dept-parent" className="input" value={form.parentDepartmentId} onChange={(e) => setForm({ ...form, parentDepartmentId: e.target.value })}>
                <option value="">None (top-level)</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="dept-save" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading departments...</div>
        ) : depts.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No departments yet. Add your first department above.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Code</th>
                <th className="table-header">Head</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {buildTree(depts).map(root => renderRow(root, 0))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
