'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';

interface ResourcePersonItem {
  id: string;
  workshopId?: string;
  serialNumber?: number;
  nic?: string;
  name: string;
  position?: string;
  service?: string;
  grade?: string;
  workplace?: string;
  personalAddress?: string;
  educationalQualifications?: string;
  subjectQualifications?: string;
  phone?: string;
  email?: string;
  specialNotes?: string;
  roleInWorkshop?: string;
  workshopTitle?: string | null;
  workshopNumber?: string | null;
  createdAt: string;
}

export default function ResourcePersonsPage() {
  const [resourcePersons, setResourcePersons] = useState<ResourcePersonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'assigned'>('all');

  // Edit Modal State
  const [editingRp, setEditingRp] = useState<ResourcePersonItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [workshops, setWorkshops] = useState<any[]>([]);

  // Feedback notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchResourcePersons = async () => {
    try {
      const res = await fetch('/api/resource-persons');
      if (res.ok) {
        const data = await res.json();
        setResourcePersons(data.resourcePersons || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkshops = async () => {
    try {
      const res = await fetch('/api/workshops');
      if (res.ok) {
        const data = await res.json();
        setWorkshops(data.workshops || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchResourcePersons();
    fetchWorkshops();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenEdit = (rp: ResourcePersonItem) => {
    setEditingRp(rp);
    setEditForm({
      workshopId: rp.workshopId || '',
      nic: rp.nic || '',
      name: rp.name || '',
      position: rp.position || '',
      service: rp.service || '',
      grade: rp.grade || '',
      workplace: rp.workplace || '',
      personalAddress: rp.personalAddress || '',
      phone: rp.phone || '',
      email: rp.email || '',
      educationalQualifications: rp.educationalQualifications || '',
      subjectQualifications: rp.subjectQualifications || '',
      specialNotes: rp.specialNotes || '',
      roleInWorkshop: rp.roleInWorkshop || 'Lead Facilitator',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRp) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/resource-persons/${editingRp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      showNotification('success', `Resource person "${editForm.name}" updated successfully.`);
      setShowEditModal(false);
      fetchResourcePersons();
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating resource person');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (rp: ResourcePersonItem) => {
    if (!confirm(`Are you sure you want to remove "${rp.name}" from the resource persons registry?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/resource-persons/${rp.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showNotification('success', `Resource person "${rp.name}" removed.`);
        setResourcePersons((prev) => prev.filter((item) => item.id !== rp.id));
      } else {
        showNotification('error', 'Failed to delete resource person.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Network error.');
    }
  };

  // Filtered List
  const filteredList = resourcePersons.filter((rp) => {
    // Type filter
    if (filterType === 'unassigned' && rp.workshopId) return false;
    if (filterType === 'assigned' && !rp.workshopId) return false;

    // Search query
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (rp.name && rp.name.toLowerCase().includes(q)) ||
      (rp.nic && rp.nic.toLowerCase().includes(q)) ||
      (rp.position && rp.position.toLowerCase().includes(q)) ||
      (rp.workplace && rp.workplace.toLowerCase().includes(q)) ||
      (rp.subjectQualifications && rp.subjectQualifications.toLowerCase().includes(q)) ||
      (rp.workshopTitle && rp.workshopTitle.toLowerCase().includes(q)) ||
      (rp.workshopNumber && rp.workshopNumber.toLowerCase().includes(q))
    );
  });

  const totalCount = resourcePersons.length;
  const unassignedCount = resourcePersons.filter((r) => !r.workshopId).length;
  const assignedCount = resourcePersons.filter((r) => !!r.workshopId).length;

  return (
    <AppShell>
      <div className="page-container" style={{ paddingBottom: '3rem' }}>

        {/* ── Toast Notification ── */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            background: toast.type === 'success' ? '#00534E' : '#B71C1C',
            color: '#fff',
            padding: '0.85rem 1.4rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Top Header ── */}
        <div className="page-header" style={{
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}>
                National Facilitators Registry
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Ministry of Education Sri Lanka</span>
            </div>
            <h1 className="page-title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
              Resource Persons & Facilitators
            </h1>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Manage expert trainers, lecturers, and facilitators registered across the education sector.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              href="/resource-persons/new"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: 'var(--shadow-primary)'
              }}
            >
              <span>➕</span> Register Resource Person
            </Link>
          </div>
        </div>

        {/* ── Stats Summary Cards ── */}
        <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="stat-icon" style={{
              background: 'rgba(141, 21, 58, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              borderRadius: 'var(--radius-md)'
            }}>
              👥
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Total Resource Persons
              </div>
              <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {totalCount}
              </div>
            </div>
          </div>

          <div className="stat-card teal" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="stat-icon" style={{
              background: 'rgba(0, 83, 78, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              borderRadius: 'var(--radius-md)'
            }}>
              ⭐
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Master Pool (Without Workshop)
              </div>
              <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--teal)', lineHeight: 1.2 }}>
                {unassignedCount}
              </div>
            </div>
          </div>

          <div className="stat-card accent" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="stat-icon" style={{
              background: 'rgba(235, 116, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              borderRadius: 'var(--radius-md)'
            }}>
              📋
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Assigned to Workshops
              </div>
              <div className="stat-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
                {assignedCount}
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters & Search Bar ── */}
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                All Facilitators ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unassigned')}
                className={`btn btn-sm ${filterType === 'unassigned' ? 'btn-primary' : 'btn-secondary'}`}
              >
                ⭐ Master Pool Only ({unassignedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('assigned')}
                className={`btn btn-sm ${filterType === 'assigned' ? 'btn-primary' : 'btn-secondary'}`}
              >
                📋 Assigned to Workshops ({assignedCount})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '400px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, NIC, workplace, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.2rem' }}
              />
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                🔍
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Resource Persons Table ── */}
        <div className="card" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Loading resource persons...
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧑‍🏫</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Resource Persons Found</h3>
              <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                {search ? 'Try adjusting your search criteria.' : 'Register resource persons to maintain an official facilitator roster.'}
              </p>
              <Link href="/resource-persons/new" className="btn btn-primary btn-sm">
                ➕ Register First Resource Person
              </Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Resource Person / Details</th>
                    <th>Designation & Workplace</th>
                    <th>Qualifications & Expertise</th>
                    <th>Workshop Assignment</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((rp, index) => (
                    <tr key={rp.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        {rp.serialNumber ? `#${rp.serialNumber}` : index + 1}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {rp.name}
                        </div>
                        {rp.nic && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            NIC: <span style={{ fontFamily: 'monospace' }}>{rp.nic}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {rp.phone && <span>📞 {rp.phone}</span>}
                          {rp.email && <span>✉️ {rp.email}</span>}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {rp.position || 'Resource Person'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {rp.workplace || 'Ministry of Education'}
                        </div>
                        {(rp.service || rp.grade) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            {[rp.service, rp.grade].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </td>

                      <td style={{ maxWidth: '280px' }}>
                        {rp.subjectQualifications && (
                          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--teal-dark)' }}>
                            🎯 {rp.subjectQualifications}
                          </div>
                        )}
                        {rp.educationalQualifications && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🎓 {rp.educationalQualifications}
                          </div>
                        )}
                        {rp.specialNotes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', fontStyle: 'italic' }}>
                            "{rp.specialNotes}"
                          </div>
                        )}
                      </td>

                      <td>
                        {rp.workshopId && rp.workshopTitle ? (
                          <div>
                            <Link
                              href={`/workshops/${rp.workshopId}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--primary)',
                                textDecoration: 'none'
                              }}
                            >
                              <span>📋</span> {rp.workshopNumber || 'Workshop'}
                            </Link>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {rp.workshopTitle}
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}>
                            ⭐ Master Pool (Available)
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rp)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Resource Person"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rp)}
                            className="btn btn-danger btn-sm"
                            title="Remove Resource Person"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Edit Modal ── */}
        {showEditModal && editingRp && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '680px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Edit Resource Person</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Update details, qualifications, or workshop link
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowEditModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>

                  {/* Workshop Assignment */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Workshop Assignment</label>
                    <select
                      className="form-input"
                      value={editForm.workshopId}
                      onChange={(e) => setEditForm({ ...editForm, workshopId: e.target.value })}
                    >
                      <option value="">⭐ Master Pool (No Workshop / General Facilitator)</option>
                      {workshops.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          📌 {ws.workshopNumber} — {ws.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* NIC & Name */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                      <label className="form-label">Full Name <span className="required">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="form-label">NIC Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.nic}
                        onChange={(e) => setEditForm({ ...editForm, nic: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Position & Workplace */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Position / Designation</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.position}
                        onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Workplace</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.workplace}
                        onChange={(e) => setEditForm({ ...editForm, workplace: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Service & Grade */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Service</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.service}
                        onChange={(e) => setEditForm({ ...editForm, service: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Grade</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.grade}
                        onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Phone & Address */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Telephone</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Personal Address</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.personalAddress}
                        onChange={(e) => setEditForm({ ...editForm, personalAddress: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Subject Qualifications */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Subject Specific Qualifications & Expertise</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={editForm.subjectQualifications}
                      onChange={(e) => setEditForm({ ...editForm, subjectQualifications: e.target.value })}
                    />
                  </div>

                  {/* Educational Qualifications */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Educational & Professional Qualifications</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={editForm.educationalQualifications}
                      onChange={(e) => setEditForm({ ...editForm, educationalQualifications: e.target.value })}
                    />
                  </div>

                  {/* Special Notes */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Special Notes</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      value={editForm.specialNotes}
                      onChange={(e) => setEditForm({ ...editForm, specialNotes: e.target.value })}
                    />
                  </div>

                </div>

                <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingEdit}
                  >
                    {savingEdit ? 'Updating...' : 'Update Resource Person'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
