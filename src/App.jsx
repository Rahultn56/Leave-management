import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbStatus, setDbStatus] = useState({ connected: false, type: 'Checking...' });
  const [stats, setStats] = useState({ totalLeaves: 0, pending: 0, approved: 0, rejected: 0, totalEmployees: 0 });
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    employeeName: '',
    employeeEmail: '',
    department: 'Engineering',
    leaveType: 'Casual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    department: 'Engineering',
    role: 'Software Engineer',
    casual: 12,
    medical: 10,
    annual: 15
  });

  useEffect(() => {
    checkHealth();
    fetchStats();
    fetchLeaves();
    fetchEmployees();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      setDbStatus({ connected: data.connected, type: data.databaseType || 'MongoDB' });
    } catch {
      setDbStatus({ connected: false, type: 'Offline (Start backend server)' });
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaves`);
      if (res.ok) setLeaves(await res.json());
    } catch {}
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (res.ok) setEmployees(await res.json());
    } catch {}
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: 'Leave application submitted successfully!' });
        setForm({ employeeName: '', employeeEmail: '', department: 'Engineering', leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
        fetchLeaves();
        fetchStats();
        setActiveTab('all-leaves');
      } else {
        setMsg({ type: 'error', text: data.error || 'Failed to submit leave' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Cannot connect to server. Is backend running?' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    const reviewer = prompt('Reviewer Name:', 'HR Admin') || 'HR Admin';
    const comment = prompt('Reviewer Comment:', `Leave marked as ${status}`) || '';
    try {
      const res = await fetch(`${API_BASE}/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewedBy: reviewer, reviewComment: comment })
      });
      if (res.ok) {
        fetchLeaves();
        fetchStats();
      }
    } catch {}
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empForm.name,
          email: empForm.email,
          department: empForm.department,
          role: empForm.role,
          leaveBalance: {
            casual: Number(empForm.casual),
            medical: Number(empForm.medical),
            annual: Number(empForm.annual)
          }
        })
      });
      if (res.ok) {
        fetchEmployees();
        fetchStats();
        setEmpForm({ name: '', email: '', department: 'Engineering', role: 'Software Engineer', casual: 12, medical: 10, annual: 15 });
        setMsg({ type: 'success', text: 'Employee added successfully!' });
      }
    } catch {}
  };

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1>🏖️ Leave Management System</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>MERN Stack with Express & MongoDB</p>
        </div>
        <div className={`badge ${dbStatus.connected ? 'badge-connected' : 'badge-disconnected'}`}>
          {dbStatus.connected ? `🟢 MongoDB Connected (${dbStatus.type})` : '🔴 Disconnected'}
        </div>
      </header>

      {msg.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: msg.type === 'success' ? '#15803d' : '#b91c1c'
        }}>
          {msg.text}
        </div>
      )}

      <nav className="nav-tabs">
        {['dashboard', 'apply', 'all-leaves', 'employees'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'dashboard' && '📊 Dashboard'}
            {tab === 'apply' && '📝 Apply Leave'}
            {tab === 'all-leaves' && `📑 All Leaves (${leaves.length})`}
            {tab === 'employees' && `👥 Employees (${employees.length})`}
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
              <div>Total Leaves</div>
              <div className="stat-num">{stats.totalLeaves}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
              <div>Pending Approval</div>
              <div className="stat-num">{stats.pending}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
              <div>Approved</div>
              <div className="stat-num">{stats.approved}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
              <div>Rejected</div>
              <div className="stat-num">{stats.rejected}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
              <div>Total Employees</div>
              <div className="stat-num">{stats.totalEmployees}</div>
            </div>
          </div>

          <div className="card">
            <h3>Recent Applications</h3>
            <div className="table-wrap" style={{ marginTop: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.slice(0, 5).map(l => (
                    <tr key={l._id}>
                      <td><strong>{l.employeeName}</strong><br/><small style={{ color: '#64748b' }}>{l.department}</small></td>
                      <td>{l.leaveType}</td>
                      <td>{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</td>
                      <td>{l.totalDays} day(s)</td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                          background: l.status === 'Approved' ? '#dcfce7' : l.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                          color: l.status === 'Approved' ? '#15803d' : l.status === 'Rejected' ? '#b91c1c' : '#b45309'
                        }}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b' }}>No leave requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'apply' && (
        <div className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h2>Apply for Leave</h2>
          <form onSubmit={handleApply} style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Employee Name</label>
              <input required value={form.employeeName} onChange={e => setForm({...form, employeeName: e.target.value})} placeholder="e.g. Rahul Sharma" />
            </div>
            <div className="form-group">
              <label>Employee Email</label>
              <input type="email" required value={form.employeeEmail} onChange={e => setForm({...form, employeeEmail: e.target.value})} placeholder="rahul@example.com" />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                <option>Engineering</option>
                <option>HR</option>
                <option>Design</option>
                <option>Marketing</option>
                <option>Sales</option>
                <option>Operations</option>
              </select>
            </div>
            <div className="form-group">
              <label>Leave Type</label>
              <select value={form.leaveType} onChange={e => setForm({...form, leaveType: e.target.value})}>
                <option>Casual</option>
                <option>Medical</option>
                <option>Annual</option>
                <option>Maternity</option>
                <option>Paternity</option>
                <option>Unpaid</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" required value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" required value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Reason for Leave</label>
              <textarea rows="3" required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Describe your reason..." />
            </div>
            <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'all-leaves' && (
        <div className="card">
          <h2>All Leave Applications</h2>
          <div className="table-wrap" style={{ marginTop: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l._id}>
                    <td><strong>{l.employeeName}</strong><br/><small>{l.employeeEmail}</small></td>
                    <td>{l.leaveType}</td>
                    <td>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                    <td>{l.totalDays}</td>
                    <td>{l.reason}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                        background: l.status === 'Approved' ? '#dcfce7' : l.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                        color: l.status === 'Approved' ? '#15803d' : l.status === 'Rejected' ? '#b91c1c' : '#b45309'
                      }}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleStatusUpdate(l._id, 'Approved')} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Approve</button>
                          <button onClick={() => handleStatusUpdate(l._id, 'Rejected')} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'employees' && (
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3>Add New Employee</h3>
            <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <input required placeholder="Name" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
              <input type="email" required placeholder="Email" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} />
              <input placeholder="Department" value={empForm.department} onChange={e => setEmpForm({...empForm, department: e.target.value})} />
              <input placeholder="Role" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} />
              <button className="btn" type="submit">Add Employee</button>
            </form>
          </div>

          <div className="card">
            <h3>Employee Directory</h3>
            <div className="table-wrap" style={{ marginTop: '16px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Balances (C / M / A)</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp._id}>
                      <td><strong>{emp.name}</strong></td>
                      <td>{emp.email}</td>
                      <td>{emp.department}</td>
                      <td>{emp.role}</td>
                      <td>
                        {emp.leaveBalance?.casual || 12} Casual / {emp.leaveBalance?.medical || 10} Medical / {emp.leaveBalance?.annual || 15} Annual
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
