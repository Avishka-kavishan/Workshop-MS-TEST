'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';

interface WorkshopOption {
  id: string;
  workshopNumber: string;
  title: string;
  subject: string;
  year: string;
  placeName: string;
}

export default function RegisterResourcePersonPage() {
  const router = useRouter();

  // Workshops for optional assignment
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    workshopId: '', // Default unassigned / no workshop needed!
    serialNumber: '',
    nic: '',
    name: '',
    position: '',
    service: '',
    grade: '',
    workplace: '',
    personalAddress: '',
    phone: '',
    email: '',
    educationalQualifications: '',
    subjectQualifications: '',
    specialNotes: '',
    roleInWorkshop: 'Lead Facilitator',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ id: string; name: string; workshopTitle?: string } | null>(null);

  // Load workshops list so user can optionally link if they want
  useEffect(() => {
    async function loadData() {
      setLoadingWorkshops(true);
      try {
        const res = await fetch('/api/workshops');
        if (res.ok) {
          const data = await res.json();
          setWorkshops(data.workshops || []);
        }

        // Fetch existing resource persons count to compute next serial preview
        const rpRes = await fetch('/api/resource-persons');
        if (rpRes.ok) {
          const rpData = await rpRes.json();
          const list = rpData.resourcePersons || [];
          const maxSerial = list.reduce((m: number, r: any) => Math.max(m, r.serialNumber || 0), 0);
          setFormData((prev) => ({
            ...prev,
            serialNumber: (maxSerial + 1).toString(),
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWorkshops(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Full name of the resource person is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/resource-persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register resource person');
      }

      const assignedWs = workshops.find((w) => w.id === formData.workshopId);
      setSuccessInfo({
        id: data.resourcePerson.id,
        name: data.resourcePerson.name,
        workshopTitle: assignedWs ? `${assignedWs.workshopNumber} - ${assignedWs.title}` : undefined,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetForm = () => {
    setSuccessInfo(null);
    setFormData((prev) => ({
      workshopId: '',
      serialNumber: (Number(prev.serialNumber || '1') + 1).toString(),
      nic: '',
      name: '',
      position: '',
      service: '',
      grade: '',
      workplace: '',
      personalAddress: '',
      phone: '',
      email: '',
      educationalQualifications: '',
      subjectQualifications: '',
      specialNotes: '',
      roleInWorkshop: 'Lead Facilitator',
    }));
  };

  return (
    <AppShell>
      <div className="page-container" style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '3rem' }}>

        {/* ── Page Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-primary" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}>
                Official Facilitator Registry
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Ministry of Education
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Register Resource Person
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Register qualified resource persons directly into the national directory without needing to create a workshop first.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link href="/resource-persons" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>👥</span> View All Resource Persons
            </Link>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* ── Success Banner ── */}
        {successInfo && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 83, 78, 0.08), rgba(0, 83, 78, 0.15))',
            border: '1.5px solid var(--teal)',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 12px rgba(0, 83, 78, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--teal)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.35rem 0', color: 'var(--teal-dark)', fontSize: '1.15rem', fontWeight: 700 }}>
                  Resource Person Registered Successfully!
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  <strong>{successInfo.name}</strong> has been saved to the database.
                  {successInfo.workshopTitle ? (
                    <span> Linked to workshop: <em>{successInfo.workshopTitle}</em>.</span>
                  ) : (
                    <span> Stored in the <strong>Master Resource Persons Pool</strong> (no workshop required). You can assign them to future workshops at any time.</span>
                  )}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}
                  >
                    ➕ Register Another Resource Person
                  </button>
                  <Link href="/resource-persons" className="btn btn-secondary btn-sm">
                    👥 View Resource Persons Directory
                  </Link>
                  {formData.workshopId && (
                    <Link href={`/workshops/${formData.workshopId}`} className="btn btn-ghost btn-sm">
                      📋 Go to Workshop
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {errorMsg && (
          <div style={{
            background: 'rgba(211, 47, 47, 0.08)',
            border: '1px solid var(--error)',
            borderRadius: '8px',
            padding: '0.875rem 1.25rem',
            marginBottom: '1.5rem',
            color: 'var(--error)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Registration Form Card ── */}
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>

            {/* Section 1: Workshop Link (Optional) */}
            <div style={{
              background: 'rgba(141, 21, 58, 0.04)',
              border: '1px dashed var(--primary-light)',
              borderRadius: '8px',
              padding: '1.15rem 1.25rem',
              marginBottom: '1.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🏛️</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                  Workshop Assignment (Optional)
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                  No Workshop Required
                </span>
              </div>
              <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                You can register resource persons independently to build a verified roster. If this person is already assigned to an existing workshop, you may select it below; otherwise leave as <strong>General Resource Pool</strong>.
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <select
                  className="form-input"
                  value={formData.workshopId}
                  onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                  style={{ background: '#fff', fontWeight: 500 }}
                >
                  <option value="">
                    ⭐ None — Register directly to Master Resource Pool (Without Workshop)
                  </option>
                  {workshops.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      📌 {ws.workshopNumber} — {ws.title} ({ws.subject} | {ws.placeName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 2: Identification & Personal Info */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>👤</span> 1. Personal & Identification Details
            </h3>

            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Serial Number <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 600 }}>● Auto-generated</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={`#${formData.serialNumber || '1'}`}
                  readOnly
                  style={{ background: 'var(--bg-light)', fontWeight: 700, color: 'var(--primary)', cursor: 'default' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  National Identity Card (NIC) <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>(Recommended)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 198512345678 or 851234567V"
                  value={formData.nic}
                  onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                <label className="form-label">
                  Full Name with Initials / Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Prof. Ajith Madurapperuma / Dr. Buddhini Samarasinghe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label">Role / Facilitation Level</label>
                <select
                  className="form-input"
                  value={formData.roleInWorkshop}
                  onChange={(e) => setFormData({ ...formData, roleInWorkshop: e.target.value })}
                >
                  <option value="Lead Facilitator">Lead Facilitator</option>
                  <option value="Co-Facilitator">Co-Facilitator</option>
                  <option value="Master Trainer">Master Trainer</option>
                  <option value="Subject Expert">Subject Expert</option>
                  <option value="Technical Consultant">Technical Consultant</option>
                  <option value="Guest Speaker">Guest Speaker</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '1.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Telephone / Mobile Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 0771234567 / 0912234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. ajith@ruh.ac.lk / resource@moe.gov.lk"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Section 3: Official Position & Workplace */}
            <div style={{ height: '1px', background: 'var(--border-light)', margin: '1.5rem 0' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💼</span> 2. Official Designation & Workplace
            </h3>

            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Position / Designation</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Senior Lecturer, Director, Master Trainer, In-Service Advisor"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Workplace / Institute / School</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. University of Ruhuna, NIE, Galle Zone IT Branch, MOE"
                  value={formData.workplace}
                  onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Service Relevant to Position</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SLEAS / SLTS / SLTES / Sri Lanka University Academic Service"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Grade Relevant to Position</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Grade I / Grade II / Special Grade / Senior Professor"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Personal Residential Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. No. 45, High Level Road, Maharagama"
                value={formData.personalAddress}
                onChange={(e) => setFormData({ ...formData, personalAddress: e.target.value })}
              />
            </div>

            {/* Section 4: Qualifications & Competencies */}
            <div style={{ height: '1px', background: 'var(--border-light)', margin: '1.5rem 0' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎓</span> 3. Qualifications & Specializations
            </h3>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Educational & Professional Qualifications</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Ph.D. in Computer Science, B.Sc (Hons) in Computing, PGDE, IEEE Senior Member"
                value={formData.educationalQualifications}
                onChange={(e) => setFormData({ ...formData, educationalQualifications: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Subject Specific Qualifications & Key Competencies</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Python Programming, Cloud Architecture, STEM Pedagogy, Machine Learning"
                value={formData.subjectQualifications}
                onChange={(e) => setFormData({ ...formData, subjectQualifications: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Special Notes / Facilitator Remarks</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Any special remarks, preferred availability, session topics, or equipment requirements..."
                value={formData.specialNotes}
                onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
              />
            </div>

            {/* ── Form Actions ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-light)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <Link href="/resource-persons" className="btn btn-secondary">
                Cancel
              </Link>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{
                    padding: '0.7rem 1.8rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(141, 21, 58, 0.25)'
                  }}
                >
                  {saving ? 'Registering...' : '💾 Save & Register Resource Person'}
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>
    </AppShell>
  );
}
