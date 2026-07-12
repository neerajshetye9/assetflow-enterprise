import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const ROLES = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'];
const fetchEmps = () => api.get('/org/employees').then((r) => r.data);
const fetchDepts = () => api.get('/org/departments').then((r) => r.data);

const roleBadge = (role) => {
  const map = { ADMIN: 'red', ASSET_MANAGER: 'blue', DEPARTMENT_HEAD: 'yellow', EMPLOYEE: 'gray' };
  return <span key={role} className={`badge-${map[role] || 'gray'} mr-1`}>{role}</span>;
};

export default function Employees() {
  const qc = useQueryClient();
  const { data: emps = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: fetchEmps });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepts });
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ fullName: '', email: '', employeeCode: '', jobTitle: '', departmentId: '' });
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoteRole, setPromoteRole] = useState('ASSET_MANAGER');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/org/employees', body),
    onSuccess: (res) => {
      qc.invalidateQueries(['employees']);
      setTab('list');
      alert(`Employee created! Temp password: ${res.data.tempPassword}`);
    },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  const promoteMutation = useMutation({
    mutationFn: ({ id, roleCode }) => api.put(`/org/employees/${id}/promote`, { roleCode }),
    onSuccess: () => { qc.invalidateQueries(['employees']); setPromoteTarget(null); },
    onError: (err) => alert(err.response?.data?.error || 'Failed'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Directory</h1>
          <p className="text-slate-400 text-sm mt-1">{emps.length} employees in your organization</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('list')} className={tab === 'list' ? 'btn-primary' : 'btn-secondary'}>Directory</button>
          <button id="add-emp-btn" onClick={() => setTab('add')} className={tab === 'add' ? 'btn-primary' : 'btn-secondary'}>+ Add Employee</button>
        </div>
      </div>

      {tab === 'add' && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add Employee</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Full Name *</label><input id="emp-name" className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Rahul Patil" /></div>
            <div><label className="label">Email *</label><input id="emp-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahul@company.com" /></div>
            <div><label className="label">Employee Code</label><input id="emp-code" className="input" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} placeholder="TN-102" /></div>
            <div><label className="label">Job Title</label><input id="emp-title" className="input" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Software Engineer" /></div>
            <div>
              <label className="label">Department</label>
              <select id="emp-dept" className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">No department</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">A temporary password will be generated and displayed upon creation.</p>
          <div className="flex gap-3 mt-4">
            <button id="emp-save" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Employee'}
            </button>
            <button onClick={() => setTab('list')} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {promoteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Assign Role to {promoteTarget.full_name}</h3>
            <label className="label">Role</label>
            <select className="input mb-4" value={promoteRole} onChange={(e) => setPromoteRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => promoteMutation.mutate({ id: promoteTarget.membership_id, roleCode: promoteRole })} className="btn-primary flex-1">Assign</button>
              <button onClick={() => setPromoteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading employees...</div>
        ) : emps.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No employees yet.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Code</th>
                <th className="table-header">Department</th>
                <th className="table-header">Job Title</th>
                <th className="table-header">Roles</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emps.map((e) => (
                <tr key={e.membership_id} className="table-row">
                  <td className="table-cell">
                    <div className="font-medium">{e.full_name}</div>
                    <div className="text-xs text-slate-400">{e.email}</div>
                  </td>
                  <td className="table-cell"><code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{e.employee_code || '—'}</code></td>
                  <td className="table-cell text-slate-400">{e.department_name || '—'}</td>
                  <td className="table-cell text-slate-400">{e.job_title || '—'}</td>
                  <td className="table-cell">{(e.roles || []).map(roleBadge)}</td>
                  <td className="table-cell">
                    <button onClick={() => setPromoteTarget(e)} className="text-xs text-primary-400 hover:text-primary-300">Assign Role</button>
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
