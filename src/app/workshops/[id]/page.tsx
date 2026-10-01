'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';
import { computeWorkshopStatus } from '@/lib/workshopStatus';

export default function WorkshopDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const { data: session } = useSession();

  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trainees' | 'resource-persons' | 'attendance'>('overview');

  // Attendance state
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const workshopDays = React.useMemo(() => {
    if (!workshop) return [];
    const count = Math.max(1, Math.min(Number(workshop.daysHeld) || 1, 30));
    const base = workshop.startDate ? new Date(workshop.startDate) : new Date();
    const validBase = isNaN(base.getTime()) ? new Date() : base;

    const days = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(validBase);
      d.setDate(validBase.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      days.push({
        dayIndex: i + 1,
        dateStr,
        label: `Day ${i + 1} (${label})`,
        formatted: label,
      });
    }
    return days;
  }, [workshop?.startDate, workshop?.daysHeld]);

  useEffect(() => {
    if (workshopDays.length > 0 && !selectedAttendanceDate) {
      setSelectedAttendanceDate(workshopDays[0].dateStr);
    }
  }, [workshopDays, selectedAttendanceDate]);

  useEffect(() => {
    if (!selectedAttendanceDate || !workshop?.trainees) return;
    const currentMap: Record<string, 'present' | 'absent' | 'late'> = {};
    workshop.trainees.forEach((t: any) => {
      if (t.dailyAttendance && t.dailyAttendance[selectedAttendanceDate]) {
        currentMap[t.id] = t.dailyAttendance[selectedAttendanceDate];
      } else if (t.attendanceStatus === 'attended') {
        currentMap[t.id] = 'present';
      } else if (t.attendanceStatus === 'absent') {
        currentMap[t.id] = 'absent';
      } else {
        currentMap[t.id] = 'present';
      }
    });
    setAttendanceMap(currentMap);
  }, [selectedAttendanceDate, workshop?.trainees]);

  const handleMarkAllPresent = () => {
    if (!workshop?.trainees) return;
    const nextMap: Record<string, 'present' | 'absent' | 'late'> = {};
    workshop.trainees.forEach((t: any) => {
      nextMap[t.id] = 'present';
    });
    setAttendanceMap(nextMap);
  };

  const handleAttendanceStatusChange = (traineeId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [traineeId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedAttendanceDate) return;
    setAttendanceSaving(true);
    setAttendanceMsg(null);
    try {
      const res = await fetch(`/api/workshops/${id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedAttendanceDate,
          attendance: attendanceMap,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendanceMsg({ type: 'success', text: data.message || 'Attendance saved successfully!' });
        fetchWorkshop();
        setTimeout(() => setAttendanceMsg(null), 4000);
      } else {
        setAttendanceMsg({ type: 'error', text: data.error || 'Failed to save attendance.' });
      }
    } catch (err: any) {
      setAttendanceMsg({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({
    newStartDate: '',
    newEndDate: '',
    keepVenue: true,
    newVenue: '',
    reason: '',
  });

  const handleOpenRescheduleModal = () => {
    setRescheduleError('');
    setRescheduleForm({
      newStartDate: workshop?.startDate || '',
      newEndDate: workshop?.endDate || '',
      keepVenue: true,
      newVenue: '',
      reason: '',
    });
    setShowRescheduleModal(true);
  };

  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'reschedule' && workshop && workshop.canReschedule !== false) {
      handleOpenRescheduleModal();
    }
  }, [searchParams, workshop?.id]);

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleSubmitting(true);
    setRescheduleError('');

    try {
      const res = await fetch(`/api/workshops/${id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescheduleForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || 'Failed to reschedule workshop');
        setRescheduleSubmitting(false);
        return;
      }

      setShowRescheduleModal(false);
      fetchWorkshop();
    } catch (err: any) {
      setRescheduleError(err.message || 'An unexpected error occurred');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Trainee Modal state
  const [showTraineeModal, setShowTraineeModal] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<any>(null);
  const [traineeForm, setTraineeForm] = useState({
    serialNumber: 1,
    nicNumber: '',
    name: '',
    position: '',
    schoolInstitute: '',
    region: '',
    province: '',
    phone: '',
    attendanceStatus: 'registered' as 'registered' | 'attended' | 'absent',
  });

  // Resource Person Modal state
  const [showRpModal, setShowRpModal] = useState(false);
  const [editingRp, setEditingRp] = useState<any>(null);
  const [rpForm, setRpForm] = useState({
    serialNumber: 1,
    nic: '',
    name: '',
    position: '',
    service: '',
    grade: '',
    workplace: '',
    personalAddress: '',
    educationalQualifications: '',
    subjectQualifications: '',
    phone: '',
    specialNotes: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Venue management state (filled by Host Branch)
  const [editingVenue, setEditingVenue] = useState(false);
  const [venueInput, setVenueInput] = useState('');
  const [savingVenue, setSavingVenue] = useState(false);

  const handleSaveVenue = async () => {
    setSavingVenue(true);
    try {
      const res = await fetch(`/api/workshops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: venueInput.trim() }),
      });
      if (res.ok) {
        setEditingVenue(false);
        setSuccessMsg('Specific Venue / Hall updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchWorkshop();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to update venue');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error updating venue');
    } finally {
      setSavingVenue(false);
    }
  };

  const user = session?.user as any;

  const fetchWorkshop = async () => {
    try {
      const res = await fetch(`/api/workshops/${id}`);
      if (res.ok) {
        const json = await res.json();
        setWorkshop(json.workshop);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to load workshop');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching workshop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchWorkshop();
  }, [id]);

  // ── Trainee Handlers ────────────────────────────────────────────────
  const handleOpenTraineeModal = (trainee?: any) => {
    if (trainee) {
      setEditingTrainee(trainee);
      setTraineeForm({
        serialNumber: trainee.serialNumber || 1,
        nicNumber: trainee.nicNumber || '',
        name: trainee.name || '',
        position: trainee.position || trainee.designation || '',
        schoolInstitute: trainee.schoolInstitute || trainee.organization || '',
        region: trainee.region || '',
        province: trainee.province || '',
        phone: trainee.phone || '',
        attendanceStatus: trainee.attendanceStatus || 'registered',
      });
    } else {
      setEditingTrainee(null);
      const existingTrainees = workshop?.trainees || [];
      const maxSerial = existingTrainees.reduce((max: number, t: any) => Math.max(max, t.serialNumber || 0), 0);
      const nextSerial = maxSerial > 0 ? maxSerial + 1 : existingTrainees.length + 1;

      setTraineeForm({
        serialNumber: nextSerial,
        nicNumber: '',
        name: '',
        position: '',
        schoolInstitute: workshop?.placeName || '',
        region: '',
        province: '',
        phone: '',
        attendanceStatus: 'registered',
      });
    }
    setShowTraineeModal(true);
  };

  const handleSaveTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeForm.name.trim()) return;

    setActionLoading(true);
    try {
      const url = editingTrainee
        ? `/api/workshops/${id}/trainees/${editingTrainee.id}`
        : `/api/workshops/${id}/trainees`;
      const method = editingTrainee ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traineeForm),
      });

      if (res.ok) {
        setShowTraineeModal(false);
        setSuccessMsg(editingTrainee ? 'Trainee updated successfully!' : 'Trainee added successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchWorkshop();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTrainee = async (traineeId: string) => {
    if (!confirm('Are you sure you want to remove this trainee?')) return;
    try {
      const res = await fetch(`/api/workshops/${id}/trainees/${traineeId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWorkshop();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Resource Person Handlers ────────────────────────────────────────
  const handleOpenRpModal = (rp?: any) => {
    if (rp) {
      setEditingRp(rp);
      setRpForm({
        serialNumber: rp.serialNumber || 1,
        nic: rp.nic || '',
        name: rp.name || '',
        position: rp.position || rp.designation || '',
        service: rp.service || '',
        grade: rp.grade || '',
        workplace: rp.workplace || rp.organization || '',
        personalAddress: rp.personalAddress || '',
        educationalQualifications: rp.educationalQualifications || '',
        subjectQualifications: rp.subjectQualifications || rp.expertiseArea || '',
        phone: rp.phone || '',
        specialNotes: rp.specialNotes || rp.remarks || '',
      });
    } else {
      setEditingRp(null);
      const existingRps = workshop?.resourcePersons || [];
      const maxSerial = existingRps.reduce((max: number, r: any) => Math.max(max, r.serialNumber || 0), 0);
      const nextSerial = maxSerial > 0 ? maxSerial + 1 : existingRps.length + 1;

      setRpForm({
        serialNumber: nextSerial,
        nic: '',
        name: '',
        position: '',
        service: '',
        grade: '',
        workplace: workshop?.branch || '',
        personalAddress: '',
        educationalQualifications: '',
        subjectQualifications: workshop?.subject || '',
        phone: '',
        specialNotes: '',
      });
    }
    setShowRpModal(true);
  };

  const handleSaveRp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpForm.name.trim()) return;

    setActionLoading(true);
    try {
      const url = editingRp
        ? `/api/workshops/${id}/resource-persons/${editingRp.id}`
        : `/api/workshops/${id}/resource-persons`;
      const method = editingRp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpForm),
      });

      if (res.ok) {
        setShowRpModal(false);
        setSuccessMsg(editingRp ? 'Resource Person updated!' : 'Resource Person added!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchWorkshop();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRp = async (rpId: string) => {
    if (!confirm('Are you sure you want to remove this resource person?')) return;
    try {
      const res = await fetch(`/api/workshops/${id}/resource-persons/${rpId}`, { method: 'DELETE' });
      if (res.ok) fetchWorkshop();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Simple Status Toggle Handler (No Approvals) ──────────────────────
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/workshops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchWorkshop();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Excel Export Handler ─────────────────────────────────────────────
  const handleExportExcel = () => {
    window.location.href = `/api/workshops/${id}/export`;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="loading-overlay">
          <div className="spinner" />
          <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>
            Loading workshop details...
          </span>
        </div>
      </AppShell>
    );
  }

  if (errorMsg || !workshop) {
    return (
      <AppShell>
        <div className="page-container">
          <div className="alert alert-error">
            ⚠️ {errorMsg || 'Workshop could not be found.'}
          </div>
          <Link href="/workshops" className="btn btn-secondary">
            ← Return to Workshops
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-container">

        {/* Success Alert */}
        {successMsg && (
          <div className="alert alert-success">
            ✓ {successMsg}
          </div>
        )}

        {/* ───── Main Workshop Banner ───── */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '0', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--primary-10)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--primary-20)',
                  }}
                >
                  {workshop.workshopNumber}
                </span>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--teal-10)',
                    color: 'var(--teal)',
                    border: '1px solid var(--teal)',
                  }}
                >
                  📅 Year {workshop.year}
                </span>


                {(() => {
                  const statusObj = computeWorkshopStatus(workshop);
                  const isCompleted = statusObj.status === 'Completed';
                  const isInProgress = statusObj.status === 'In Progress';
                  return (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-full)',
                        background:
                          isCompleted
                            ? 'rgba(0, 83, 78, 0.12)'
                            : isInProgress
                            ? 'rgba(235, 116, 0, 0.12)'
                            : 'rgba(21, 101, 192, 0.12)',
                        color:
                          isCompleted
                            ? '#00534E'
                            : isInProgress
                            ? '#EB7400'
                            : '#1565C0',
                        border: `1px solid ${
                          isCompleted
                            ? 'rgba(0, 83, 78, 0.25)'
                            : isInProgress
                            ? 'rgba(235, 116, 0, 0.25)'
                            : 'rgba(21, 101, 192, 0.25)'
                        }`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isCompleted && '✓ Completed'}
                      {isInProgress && '▶ In Progress'}
                      {!isCompleted && !isInProgress && '⏳ Scheduled'}
                    </span>
                  );
                })()}

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    background: workshop.confirmationStatus === 'Tentative' ? 'rgba(235, 116, 0, 0.12)' : 'rgba(0, 83, 78, 0.12)',
                    color: workshop.confirmationStatus === 'Tentative' ? '#EB7400' : '#00534E',
                    border: `1px solid ${workshop.confirmationStatus === 'Tentative' ? 'rgba(235, 116, 0, 0.3)' : 'rgba(0, 83, 78, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {workshop.confirmationStatus === 'Tentative' ? '🟡 Tentative' : '🟢 Confirmed'}
                </span>
              </div>

              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                {workshop.title}
              </h1>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <div>🏢 Organizing Branch: <strong style={{ color: 'var(--text-primary)' }}>{workshop.branch}</strong></div>
                <div>📚 Subject: <strong style={{ color: 'var(--primary)' }}>{workshop.subject}</strong></div>
                <div>Place: <strong style={{ color: 'var(--text-primary)' }}>{workshop.placeName}</strong></div>
                <div>⏳ Duration: <strong style={{ color: 'var(--text-primary)' }}>{workshop.daysHeld} Days</strong></div>
              </div>
            </div>

            {/* Quick Action Buttons: Reschedule & Excel Export */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {workshop.canReschedule !== false && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleOpenRescheduleModal}
                  style={{
                    fontWeight: 600,
                    padding: '0.55rem 1.1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    borderColor: 'rgba(147, 51, 234, 0.35)',
                    color: '#7E22CE',
                    background: 'rgba(147, 51, 234, 0.06)',
                  }}
                >
                  <span>📅</span>
                  <span>Reschedule Workshop</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-success"
                onClick={handleExportExcel}
                title="Download complete workshop summary, trainees, and resource persons into Microsoft Excel"
                style={{ fontWeight: 600, padding: '0.55rem 1.25rem' }}
              >
                📊 Export to Excel (.csv)
              </button>
            </div>
          </div>
        </div>

        {/* ───── Place Notification Banner ───── */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--accent-10)',
            border: '1px solid var(--accent)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>📢</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-dark)' }}>
                Target Host Place: {workshop.placeName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                This workshop has been routed to <strong>{workshop.placeName}</strong> to be held over {workshop.daysHeld} days.
                The officers at this place can add the trainees and resource persons below, and export the finalized record to Excel.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={() => setActiveTab('trainees')}
          >
            Manage Participants →
          </button>
        </div>

        {/* ───── Tab Navigation ───── */}
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📋 Workshop Overview & Objectives
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'trainees' ? 'active' : ''}`}
            onClick={() => setActiveTab('trainees')}
          >
            👥 Trainees / Participants ({workshop.trainees?.length || 0})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'resource-persons' ? 'active' : ''}`}
            onClick={() => setActiveTab('resource-persons')}
          >
            🎤 Resource Persons ({workshop.resourcePersons?.length || 0})
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            ✅ Attendance
          </button>
        </div>

        {/* ───── TAB 1: OVERVIEW & OBJECTIVES ───── */}
        {activeTab === 'overview' && (
          <div className="workshop-overview-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Reschedule Alert Notice */}
              {(workshop.status === 'Rescheduled' || (workshop.rescheduleHistory && workshop.rescheduleHistory.length > 0)) && (
                <div
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    borderLeft: '4px solid #7E22CE',
                    background: 'linear-gradient(to right, rgba(147, 51, 234, 0.05), transparent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>🔄</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#7E22CE' }}>
                          Workshop Schedule Notice
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          This workshop has been officially rescheduled {workshop.rescheduleCount ? `(${workshop.rescheduleCount} time${workshop.rescheduleCount > 1 ? 's' : ''})` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setShowHistoryModal(true)}
                      style={{
                        background: 'rgba(147, 51, 234, 0.1)',
                        color: '#7E22CE',
                        border: '1px solid rgba(147, 51, 234, 0.25)',
                        fontWeight: 600,
                      }}
                    >
                      📜 View Schedule History ({workshop.rescheduleHistory?.length || 0})
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ background: 'var(--white)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>ORIGINAL SCHEDULE</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                        {workshop.originalStartDate || workshop.startDate} to {workshop.originalEndDate || workshop.endDate}
                      </div>
                    </div>
                    <div style={{ background: 'var(--white)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#7E22CE', fontWeight: 600 }}>CURRENT SCHEDULE</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {workshop.startDate} to {workshop.endDate} ({workshop.daysHeld} Days)
                      </div>
                    </div>
                    {workshop.lastRescheduleReason && (
                      <div style={{ background: 'var(--white)', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>LATEST OFFICIAL REASON</div>
                        <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                          "{workshop.lastRescheduleReason}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Objectives Card */}
              <div className="card">
                <h3 className="card-title" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  🎯 Objectives of the Workshop
                </h3>
                {workshop.aim ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {workshop.aim.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '2px' }}>🎯</span>
                        <span>{line.replace(/^[•\-\d+\.]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No specific objectives provided.</p>
                )}

                {workshop.expectedOutput && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <h4 style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      📦 Expected Outcomes
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {workshop.expectedOutput.split('\n').filter(Boolean).map((line: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--teal)', fontWeight: 700, marginTop: '2px' }}>✓</span>
                          <span>{line.replace(/^[•\-\d+\.]\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Specific Venue / Hall Card (Filled by Host Branch) */}
              <div
                className="card"
                style={{
                  borderLeft: '4px solid var(--teal)',
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.04), rgba(20, 184, 166, 0.01))',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 className="card-title" style={{ color: 'var(--teal)', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🏢 Specific Venue / Hall <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>(Host Branch)</span>
                  </h3>
                  {!editingVenue && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setVenueInput(workshop.venue || '');
                        setEditingVenue(true);
                      }}
                    >
                      ✏️ {workshop.venue ? 'Change Venue / Hall' : '+ Assign Venue / Hall'}
                    </button>
                  )}
                </div>

                {editingVenue ? (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Enter the room, computer lab, or hall where this workshop will be held at <strong>{workshop.placeName}</strong>:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, minWidth: '220px' }}
                        placeholder="e.g. IT Computer Lab 1, Resource Centre, Main Auditorium"
                        value={venueInput}
                        onChange={(e) => setVenueInput(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSaveVenue}
                        disabled={savingVenue}
                      >
                        {savingVenue ? 'Saving...' : '💾 Save Venue'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setEditingVenue(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {workshop.venue ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem' }}>📍</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {workshop.venue}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--teal)', background: 'var(--teal-10)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontWeight: 600 }}>
                          ✓ Confirmed by Host Branch
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No specific hall/room assigned yet. The host branch ({workshop.placeName}) can assign the venue here.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Trainees / Participants Registered
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                    {workshop.trainees?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Enrolled participants
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Resource Persons
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>
                    {workshop.resourcePersons?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Lead facilitators & lecturers
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--teal)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Duration in Days
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--teal)', marginTop: '0.25rem' }}>
                    {workshop.daysHeld} Days
                  </div>
                </div>
              </div>
            </div>

            {/* Right Meta Column */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem', color: 'var(--primary)' }}>
                Workshop Specifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>YEAR</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{workshop.year}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>ORGANIZING BRANCH</div>
                  <div style={{ fontWeight: 600 }}>{workshop.branch}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>EDUCATIONAL SUBJECT</div>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{workshop.subject}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>HOST BRANCH</div>
                  <div style={{ fontWeight: 600 }}>{workshop.placeName}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>SPECIFIC VENUE / HALL</div>
                  <div style={{ fontWeight: 600, color: workshop.venue ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {workshop.venue || (
                      <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                        To be filled by Host Branch
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>DATES</div>
                  <div>{workshop.startDate || 'TBD'} to {workshop.endDate || 'TBD'}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 600 }}>REGISTERED BY</div>
                  <div>{workshop.creatorName}</div>
                </div>

                {/* Export Shortcut Card */}
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--gray-100)',
                    border: '1px solid var(--border-light)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Export Full Roster
                  </div>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleExportExcel}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    📥 Download Excel Sheet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───── TAB 2: TRAINEE MANAGEMENT ───── */}
        {activeTab === 'trainees' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Trainees / Participants ({workshop.trainees?.length || 0})</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Add and manage participating teachers, officers, or school representatives for {workshop.placeName}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleExportExcel}
                >
                  📥 Export Trainees / Participants to Excel
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenTraineeModal()}
                >
                  ➕ Add trainees / participants
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial No.</th>
                    <th>NIC Number</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>School / Institute</th>
                    <th>Region</th>
                    <th>Province</th>
                    <th>Telephone Number</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workshop.trainees && workshop.trainees.length > 0 ? (
                    workshop.trainees.map((t: any, idx: number) => (
                      <tr key={t.id}>
                        <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                          #{t.serialNumber || idx + 1}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>
                          {t.nicNumber || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</td>
                        <td>{t.position || t.designation || 'Teacher'}</td>
                        <td>{t.schoolInstitute || t.organization || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.region || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.province || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.phone || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenTraineeModal(t)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error)' }}
                              onClick={() => handleDeleteTrainee(t.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👥</div>
                          <div className="empty-state-title">No Trainees / Participants Registered Yet</div>
                          <p className="empty-state-text">
                            Officers at {workshop.placeName} can add participating teachers and staff.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenTraineeModal()}
                            style={{ marginTop: '1rem' }}
                          >
                            ➕ Add trainees / participants
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───── TAB 3: RESOURCE PERSONS ───── */}
        {activeTab === 'resource-persons' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Resource Persons & Facilitators ({workshop.resourcePersons?.length || 0})</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Trainers, university lecturers, and subject experts assigned for this workshop
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleExportExcel}
                >
                  📥 Export to Excel
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenRpModal()}
                >
                  ➕ Add Resource Person
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Serial No.</th>
                    <th>NIC Number</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Service</th>
                    <th>Grade</th>
                    <th>Workplace</th>
                    <th>Personal Address</th>
                    <th>Edu / Prof Qualifications</th>
                    <th>Subject Qualifications</th>
                    <th>Telephone Number</th>
                    <th>Special Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workshop.resourcePersons && workshop.resourcePersons.length > 0 ? (
                    workshop.resourcePersons.map((rp: any, idx: number) => (
                      <tr key={rp.id}>
                        <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          #{rp.serialNumber || idx + 1}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {rp.nic || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {rp.name}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {rp.position || rp.designation || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {rp.service || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {rp.grade || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {rp.workplace || rp.organization || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: '160px' }}>
                          {rp.personalAddress || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: '180px' }}>
                          {rp.educationalQualifications || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 500, minWidth: '180px' }}>
                          {rp.subjectQualifications || rp.expertiseArea || '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {rp.phone || '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic', minWidth: '150px' }}>
                          {rp.specialNotes || rp.remarks || '—'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenRpModal(rp)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--error)' }}
                              onClick={() => handleDeleteRp(rp.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="empty-state">
                          <div className="empty-state-icon">🎤</div>
                          <div className="empty-state-title">No Resource Persons Assigned Yet</div>
                          <p className="empty-state-text">
                            Add guest lecturers, senior instructors, or technical facilitators for this workshop.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenRpModal()}
                            style={{ marginTop: '1rem' }}
                          >
                            ➕ Add First Resource Person
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───── TAB 4: ATTENDANCE ───── */}
        {activeTab === 'attendance' && (
          <div className="card">
            <div className="card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>✅ Workshop Attendance</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Record and manage daily session participation for registered educators
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleMarkAllPresent}
                  disabled={!workshop.trainees || workshop.trainees.length === 0}
                >
                  ✓ Mark All Present
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveAttendance}
                  disabled={attendanceSaving || !workshop.trainees || workshop.trainees.length === 0}
                  style={{ minWidth: '140px' }}
                >
                  {attendanceSaving ? '💾 Saving...' : '💾 Save Attendance'}
                </button>
              </div>
            </div>

            {/* Notification alert banner */}
            {attendanceMsg && (
              <div
                style={{
                  margin: '0 1.5rem 1rem 1.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: attendanceMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${attendanceMsg.type === 'success' ? '#10B981' : '#EF4444'}`,
                  color: attendanceMsg.type === 'success' ? '#065F46' : '#991B1B',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{attendanceMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{attendanceMsg.text}</span>
              </div>
            )}

            {/* Multi-day date selector bar */}
            <div
              style={{
                margin: '0 1.5rem 1.25rem 1.5rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gray-100)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Select Session Date:
                </span>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {workshopDays.map((d) => {
                    const isSelected = selectedAttendanceDate === d.dateStr;
                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        onClick={() => setSelectedAttendanceDate(d.dateStr)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.9rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: isSelected ? 'var(--primary)' : 'var(--white)',
                          color: isSelected ? 'var(--white)' : 'var(--text-primary)',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-default)'}`,
                          boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        <span>📅</span>
                        <span>{d.label}</span>
                        {isSelected && <span style={{ fontSize: '0.75rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day stats summary counter */}
              {(() => {
                const total = workshop.trainees?.length || 0;
                let present = 0;
                let absent = 0;
                let late = 0;

                if (workshop.trainees) {
                  workshop.trainees.forEach((t: any) => {
                    const status = attendanceMap[t.id];
                    if (status === 'present') present++;
                    else if (status === 'absent') absent++;
                    else if (status === 'late') late++;
                    else present++; // default
                  });
                }

                const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

                return (
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: '#ECFDF5', color: '#065F46', fontWeight: 600 }}>
                      Present: {present}
                    </span>
                    <span style={{ fontSize: '0.82rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: '#FEF2F2', color: '#991B1B', fontWeight: 600 }}>
                      Absent: {absent}
                    </span>
                    <span style={{ fontSize: '0.82rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: '#FFFBEB', color: '#92400E', fontWeight: 600 }}>
                      Late: {late}
                    </span>
                    <span style={{ fontSize: '0.82rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', background: 'var(--primary-10)', color: 'var(--primary)', fontWeight: 700 }}>
                      Rate: {rate}%
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Attendance Roster Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                    <th>Trainee / Participant</th>
                    <th>NIC Number</th>
                    <th>School / Institute</th>
                    <th>Position / Designation</th>
                    <th style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>Attendance Status ({selectedAttendanceDate})</th>
                  </tr>
                </thead>
                <tbody>
                  {workshop.trainees && workshop.trainees.length > 0 ? (
                    workshop.trainees.map((t: any, idx: number) => {
                      const currentStatus = attendanceMap[t.id] || (t.attendanceStatus === 'absent' ? 'absent' : 'present');

                      return (
                        <tr key={t.id}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                            {t.serialNumber || idx + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                            {t.phone && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>📞 {t.phone}</div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>
                              {t.nicNumber || t.nic || '—'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {t.schoolInstitute || t.organization || '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {t.position || t.designation || '—'}
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden',
                                border: '1.5px solid var(--border-default)',
                                background: 'var(--white)',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleAttendanceStatusChange(t.id, 'present')}
                                title="Mark Present"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  fontWeight: currentStatus === 'present' ? 700 : 500,
                                  background: currentStatus === 'present' ? '#10B981' : 'transparent',
                                  color: currentStatus === 'present' ? '#ffffff' : 'var(--text-secondary)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                ✓ Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceStatusChange(t.id, 'absent')}
                                title="Mark Absent"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  fontWeight: currentStatus === 'absent' ? 700 : 500,
                                  background: currentStatus === 'absent' ? '#EF4444' : 'transparent',
                                  color: currentStatus === 'absent' ? '#ffffff' : 'var(--text-secondary)',
                                  border: 'none',
                                  borderLeft: '1px solid var(--border-default)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                ✕ Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceStatusChange(t.id, 'late')}
                                title="Mark Late"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  fontWeight: currentStatus === 'late' ? 700 : 500,
                                  background: currentStatus === 'late' ? '#F59E0B' : 'transparent',
                                  color: currentStatus === 'late' ? '#ffffff' : 'var(--text-secondary)',
                                  border: 'none',
                                  borderLeft: '1px solid var(--border-default)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                ⏰ Late
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <div className="empty-state">
                          <div className="empty-state-icon">👥</div>
                          <div className="empty-state-title">No Trainees Registered for this Workshop</div>
                          <p className="empty-state-text">
                            Participants must be registered in the workshop roster before taking attendance.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setActiveTab('trainees')}
                            style={{ marginTop: '1rem' }}
                          >
                            ➕ Go to Trainees / Participants Roster
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───── MODAL: ADD / EDIT TRAINEE ───── */}
        {showTraineeModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '620px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{editingTrainee ? 'Edit Trainee / Participant' : 'Add Trainee / Participant to Workshop'}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Fill out participant registration details, location, and contact information
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowTraineeModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTrainee}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* 1. Serial Number (Auto-generated) & 2. NIC Number */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Serial Number <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 600 }}>● Auto-generated</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={`#${traineeForm.serialNumber}`}
                        readOnly
                        style={{ background: 'var(--bg-light)', fontWeight: 700, color: 'var(--primary)', cursor: 'default' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">NIC Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 199012345678 or 901234567V"
                        value={traineeForm.nicNumber}
                        onChange={(e) => setTraineeForm({ ...traineeForm, nicNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 3. Name */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Kumari Jayasinghe"
                      value={traineeForm.name}
                      onChange={(e) => setTraineeForm({ ...traineeForm, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* 4. Position & 5. School / Institute */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Position</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. ICT Teacher, Principal"
                        value={traineeForm.position}
                        onChange={(e) => setTraineeForm({ ...traineeForm, position: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">School / Institute</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Mahinda College, Galle"
                        value={traineeForm.schoolInstitute}
                        onChange={(e) => setTraineeForm({ ...traineeForm, schoolInstitute: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 6. Region & 7. Province */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Region</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Galle Zone / Southern Region"
                        value={traineeForm.region}
                        onChange={(e) => setTraineeForm({ ...traineeForm, region: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Province</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Southern Province / Western Province"
                        value={traineeForm.province}
                        onChange={(e) => setTraineeForm({ ...traineeForm, province: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 8. Telephone Number */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Telephone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 0771234567"
                      value={traineeForm.phone}
                      onChange={(e) => setTraineeForm({ ...traineeForm, phone: e.target.value })}
                    />
                  </div>

                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowTraineeModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : (editingTrainee ? 'Update Trainee / Participant' : 'Save Trainee / Participant')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ───── MODAL: ADD / EDIT RESOURCE PERSON ───── */}
        {showRpModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '680px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">
                    {editingRp ? 'Edit Resource Person' : 'Add Resource Person'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Fill out resource person details, qualifications, and service information
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowRpModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRp}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* 1. Serial Number (Auto-generated) & 2. NIC Number */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Serial Number <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 600 }}>● Auto-generated</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={`#${rpForm.serialNumber}`}
                        readOnly
                        style={{ background: 'var(--bg-light)', fontWeight: 700, color: 'var(--primary)', cursor: 'default' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        NIC Number
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 198512345678 or 851234567V"
                        value={rpForm.nic}
                        onChange={(e) => setRpForm({ ...rpForm, nic: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 3. Name */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. K.A. Nimal Fernando"
                      value={rpForm.name}
                      onChange={(e) => setRpForm({ ...rpForm, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* 4. Position & 7. Workplace */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Position</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Master Trainer / Senior Lecturer"
                        value={rpForm.position}
                        onChange={(e) => setRpForm({ ...rpForm, position: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Workplace</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Galle Zone IT Branch / University of Ruhuna"
                        value={rpForm.workplace}
                        onChange={(e) => setRpForm({ ...rpForm, workplace: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 5. Service & 6. Grade */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Service Relevant to the Position</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. SLEAS / SLTS / SLTES / Non-Academic"
                        value={rpForm.service}
                        onChange={(e) => setRpForm({ ...rpForm, service: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Grade Relevant to the Position</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Grade I / Grade II / Grade III / Special Grade"
                        value={rpForm.grade}
                        onChange={(e) => setRpForm({ ...rpForm, grade: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 8. Personal Address & 11. Telephone Number */}
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Telephone Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="e.g. 0771234567 / 0912234567"
                        value={rpForm.phone}
                        onChange={(e) => setRpForm({ ...rpForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Personal Address</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. No. 45, Temple Road, Galle"
                        value={rpForm.personalAddress}
                        onChange={(e) => setRpForm({ ...rpForm, personalAddress: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* 9. Educational and Professional Qualifications */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Educational and Professional Qualifications</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="e.g. B.Sc in Computer Science, PGDE, M.Ed, MBCS..."
                      value={rpForm.educationalQualifications}
                      onChange={(e) => setRpForm({ ...rpForm, educationalQualifications: e.target.value })}
                    />
                  </div>

                  {/* 10. Subject Specific Qualifications */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Subject Specific Qualifications</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="e.g. Certified Python Professional, Cloud Practitioner, ICT Trainer Certificate..."
                      value={rpForm.subjectQualifications}
                      onChange={(e) => setRpForm({ ...rpForm, subjectQualifications: e.target.value })}
                    />
                  </div>

                  {/* 12. Special Notes */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Special Notes</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Any special notes, remarks, or specific session requirements..."
                      value={rpForm.specialNotes}
                      onChange={(e) => setRpForm({ ...rpForm, specialNotes: e.target.value })}
                    />
                  </div>

                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowRpModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : (editingRp ? 'Update Resource Person' : 'Save Resource Person')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ───── MODAL: RESCHEDULE WORKSHOP ───── */}
        {showRescheduleModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '580px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">📅 Reschedule Workshop</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Update the official dates for this educational workshop
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowRescheduleModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {rescheduleError && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--error)',
                        color: 'var(--error)',
                        fontSize: '0.84rem',
                      }}
                    >
                      ⚠️ {rescheduleError}
                    </div>
                  )}

                  {/* Branch Role Indicator */}
                  {(() => {
                    const user = session?.user as any;
                    const isOrganizer =
                      workshop.organizingOrgId === user?.organizationId ||
                      workshop.createdBy === user?.id ||
                      (workshop.branch && user?.organizationName && (
                        workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase()) ||
                        user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase())
                      ));
                    const isHost =
                      (workshop.placeId || workshop.targetOrgId) === user?.organizationId ||
                      (workshop.placeName && user?.organizationName && (
                        workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase()) ||
                        user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase())
                      ));
                    const isAdmin = (user?.roleName || '').toLowerCase().includes('admin');

                    return (
                      <div
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          background: isOrganizer ? 'rgba(235, 116, 0, 0.08)' : isHost ? 'rgba(0, 83, 78, 0.08)' : 'rgba(21, 101, 192, 0.08)',
                          border: `1px solid ${isOrganizer ? 'rgba(235, 116, 0, 0.25)' : isHost ? 'rgba(0, 83, 78, 0.25)' : 'rgba(21, 101, 192, 0.25)'}`,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{isOrganizer ? '🏛️' : isHost ? '📍' : '🛡️'}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: isOrganizer ? 'var(--accent-dark)' : isHost ? 'var(--teal)' : 'var(--primary)' }}>
                            {isOrganizer
                              ? `Rescheduling as Organizing Branch (${workshop.branch || 'Organizer'})`
                              : isHost
                              ? `Rescheduling as Host Branch (${workshop.placeName || 'Host Venue'})`
                              : `Rescheduling as System Administrator`}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                            {isOrganizer
                              ? `The Host Branch (${workshop.placeName}) will be automatically notified immediately.`
                              : isHost
                              ? `The Organizing Branch (${workshop.branch}) will be automatically notified immediately.`
                              : `Both Organizing Branch (${workshop.branch}) and Host Branch (${workshop.placeName}) will be notified.`}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Existing Schedule Info Box */}
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--gray-100)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Current Schedule
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div><strong>Start Date:</strong> {workshop.startDate || 'TBD'}</div>
                      <div><strong>End Date:</strong> {workshop.endDate || 'TBD'}</div>
                      <div><strong>Duration:</strong> {workshop.daysHeld} Days</div>
                    </div>
                    {workshop.venue && (
                      <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                        <strong>Venue:</strong> {workshop.venue}
                      </div>
                    )}
                  </div>

                  {/* Attendance warning if attendance already exists */}
                  {(() => {
                    const hasAttendanceRecords = workshop.trainees?.some(
                      (t: any) => (t.dailyAttendance && Object.keys(t.dailyAttendance).length > 0) || t.attendanceStatus === 'attended'
                    );
                    if (!hasAttendanceRecords) return null;

                    return (
                      <div
                        style={{
                          padding: '0.75rem 0.95rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid #F59E0B',
                          color: '#92400E',
                          fontSize: '0.82rem',
                          lineHeight: 1.45,
                        }}
                      >
                        <strong>⚠️ Notice regarding attendance:</strong>
                        <div style={{ marginTop: '0.2rem' }}>
                          This workshop already has recorded session attendance. Rescheduling will establish new session dates, while previously recorded attendance records will be safely retained in the audit history.
                        </div>
                      </div>
                    );
                  })()}

                  {/* New Dates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        New Start Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={rescheduleForm.newStartDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setRescheduleForm((prev) => {
                            let newEnd = prev.newEndDate;
                            if (newEnd && newEnd < newStart) newEnd = newStart;
                            return { ...prev, newStartDate: newStart, newEndDate: newEnd };
                          });
                        }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        New End Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={rescheduleForm.newEndDate}
                        min={rescheduleForm.newStartDate}
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, newEndDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Computed Days Preview */}
                  {rescheduleForm.newStartDate && rescheduleForm.newEndDate && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                      ⏱️ Computed Workshop Duration: {
                        Math.max(1, Math.ceil(Math.abs(new Date(rescheduleForm.newEndDate).getTime() - new Date(rescheduleForm.newStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
                      } Days
                    </div>
                  )}

                  {/* Venue Option */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Venue Handling for New Dates</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="venueHandling"
                          checked={rescheduleForm.keepVenue}
                          onChange={() => setRescheduleForm({ ...rescheduleForm, keepVenue: true })}
                        />
                        <span>Keep existing venue ({workshop.venue || 'No venue assigned yet'})</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="venueHandling"
                          checked={!rescheduleForm.keepVenue}
                          onChange={() => setRescheduleForm({ ...rescheduleForm, keepVenue: false })}
                        />
                        <span>Assign new venue / Hall (or leave for Host Branch to reconfirm)</span>
                      </label>
                    </div>

                    {!rescheduleForm.keepVenue && (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter new specific venue/hall (optional)..."
                        value={rescheduleForm.newVenue}
                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, newVenue: e.target.value })}
                        style={{ marginTop: '0.55rem' }}
                      />
                    )}
                  </div>

                  {/* Reason for Rescheduling (Mandatory) */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Reason for Rescheduling <span className="required">*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Clearly state the official administrative, logistical, or academic reason for rescheduling (Mandatory for Ministry audit trail)..."
                      value={rescheduleForm.reason}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowRescheduleModal(false)}
                    disabled={rescheduleSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={rescheduleSubmitting}
                  >
                    {rescheduleSubmitting ? 'Rescheduling & Notifying...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ───── MODAL: SCHEDULE HISTORY AUDIT TRAIL ───── */}
        {showHistoryModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '640px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">📜 Schedule History & Audit Trail</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Complete timeline of schedule modifications for this workshop
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowHistoryModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* 1. Original Schedule Entry */}
                <div
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--gray-100)',
                    border: '1.5px solid var(--border-default)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--teal)' }}>
                      🌱 Initial Schedule (Created)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {workshop.createdAt ? new Date(workshop.createdAt).toLocaleString() : 'Original'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    {workshop.originalStartDate || workshop.startDate} to {workshop.originalEndDate || workshop.endDate}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Organized by: {workshop.branch} • Created by: {workshop.creatorName}
                  </div>
                </div>

                {/* 2. Reschedule History Timeline */}
                {workshop.rescheduleHistory && workshop.rescheduleHistory.length > 0 ? (
                  workshop.rescheduleHistory.map((h: any, idx: number) => (
                    <div
                      key={h.id || idx}
                      style={{
                        padding: '0.9rem 1.1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(147, 51, 234, 0.04)',
                        border: '1.5px solid rgba(147, 51, 234, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#7E22CE' }}>
                          🔄 Rescheduled #{workshop.rescheduleHistory.length - idx}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.92rem', flexWrap: 'wrap' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                          {h.oldStartDate} – {h.oldEndDate}
                        </span>
                        <span>➔</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {h.newStartDate} – {h.newEndDate} ({h.newDaysHeld} Days)
                        </strong>
                      </div>

                      <div style={{ fontSize: '0.82rem', marginTop: '0.5rem', background: 'var(--white)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <strong>Reason:</strong> {h.reason}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <span>Rescheduled By: <strong>{h.rescheduledByName}</strong> ({h.rescheduledByOrgName})</span>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-tertiary)' }}>Role: {h.rescheduledByBranchType}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No subsequent reschedule modifications recorded.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHistoryModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
