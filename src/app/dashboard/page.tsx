'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { computeWorkshopStatus } from '@/lib/workshopStatus';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [resourcePersons, setResourcePersons] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;

  const loadDashboard = async () => {
    try {
      const [wsRes, orgRes, notifRes, rpRes] = await Promise.all([
        fetch('/api/workshops'),
        fetch('/api/organizations'),
        fetch('/api/notifications'),
        fetch('/api/resource-persons'),
      ]);

      if (wsRes.ok) {
        const wsJson = await wsRes.json();
        setWorkshops(wsJson.workshops || []);
      }

      if (orgRes.ok) {
        const orgJson = await orgRes.json();
        setPlaces(orgJson.places || []);
      }

      if (notifRes.ok) {
        const notifJson = await notifRes.json();
        setNotifications(notifJson.notifications || []);
      }

      if (rpRes.ok) {
        const rpJson = await rpRes.json();
        setResourcePersons(rpJson.resourcePersons || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleStatusChange = async (workshopId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const wsRes = await fetch('/api/workshops');
        if (wsRes.ok) {
          const wsJson = await wsRes.json();
          setWorkshops(wsJson.workshops || []);
        }
      }
    } catch (err) {
      console.error('Failed to update workshop status:', err);
    }
  };

  // 1. Total Workshops Breakdown (Completed vs Pending)
  const totalWorkshops = workshops.length;
  const completedWorkshops = workshops.filter((w) => {
    const st = computeWorkshopStatus(w).status;
    return st === 'Completed';
  }).length;
  const pendingWorkshops = Math.max(0, totalWorkshops - completedWorkshops);

  // 2. Total Participants / Trainees Breakdown (Completed vs Pending)
  const totalTrainees = workshops.reduce((sum, w) => sum + (w.traineeCount || 0), 0);
  const completedTrainees = workshops
    .filter((w) => computeWorkshopStatus(w).status === 'Completed')
    .reduce((sum, w) => sum + (w.traineeCount || 0), 0);
  const pendingTrainees = Math.max(0, totalTrainees - completedTrainees);

  // 3. Resource Persons Breakdown (Completed vs Pending)
  const totalResourcePersons = resourcePersons.length > 0
    ? resourcePersons.length
    : workshops.reduce((sum, w) => sum + (w.resourcePersonCount || 0), 0);
  const completedResourcePersons = resourcePersons.length > 0
    ? resourcePersons.filter((rp) => {
        const ws = workshops.find((w) => w.id === rp.workshopId);
        return ws && computeWorkshopStatus(ws).status === 'Completed';
      }).length
    : workshops
        .filter((w) => computeWorkshopStatus(w).status === 'Completed')
        .reduce((sum, w) => sum + (w.resourcePersonCount || 0), 0);
  const pendingResourcePersons = Math.max(0, totalResourcePersons - completedResourcePersons);

  return (
    <AppShell>
      <div className="page-container dashboard-container">
        
        {/* ── Welcome Banner (matching wireframe) ── */}
        <div className="welcome-banner">
          <div>
            <h1 className="welcome-title">
              Welcome , {user?.name || 'MOE Planning Branch'}.
            </h1>
            <p className="welcome-subtitle">
              Branch / Unit : <strong>{user?.name || user?.organizationName || 'MOE Planning Branch'}</strong>.
            </p>
          </div>

          <div className="welcome-actions">
            <Link href="/workshops/new" className="btn btn-primary" style={{ fontWeight: 600 }}>
              + Schedule a new workshop
            </Link>
            <Link href="/resource-persons/new" className="btn btn-secondary" style={{ fontWeight: 600 }}>
              + add resource persons.
            </Link>
          </div>
        </div>

        {/* Recent Place Notifications Banner if any */}
        {notifications.length > 0 && (
          <div
            style={{
              padding: '0.9rem 1.25rem',
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
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent-15)',
                color: 'var(--accent-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-dark)' }}>
                  Latest Workshop Notification for Your Branch ({notifications.length})
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {notifications[0]?.message}
                </div>
              </div>
            </div>
            {notifications[0]?.workshopId && (
              <Link href={`/workshops/${notifications[0].workshopId}`} className="btn btn-accent btn-sm">
                Open Workshop & Add Trainees / Participants →
              </Link>
            )}
          </div>
        )}

        {/* ── 3 Summary KPI Cards (matching wireframe) ── */}
        <div className="kpi-split-grid">
          
          {/* Card 1: Total Workshops */}
          <div className="kpi-split-card">
            <div className="kpi-split-header">
              <span className="kpi-split-title">Total workshops.</span>
              <span className="kpi-split-total">{loading ? '...' : totalWorkshops}</span>
            </div>
            <div className="kpi-split-body">
              <div className="kpi-split-col">
                <div className="kpi-split-sublabel">Completed</div>
                <div className="kpi-split-subval" style={{ color: 'var(--teal)' }}>
                  {loading ? '...' : completedWorkshops}
                </div>
              </div>
              <div className="kpi-split-divider" />
              <div className="kpi-split-col">
                <div className="kpi-split-sublabel">Pending</div>
                <div className="kpi-split-subval" style={{ color: 'var(--accent)' }}>
                  {loading ? '...' : pendingWorkshops}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Total Participants / Trainees */}
          <div className="kpi-split-card">
            <div className="kpi-split-header">
              <span className="kpi-split-title">Total participants/ trainees</span>
              <span className="kpi-split-total">{loading ? '...' : totalTrainees}</span>
            </div>
            <div className="kpi-split-body">
              <div className="kpi-split-col">
                <div className="kpi-split-sublabel">Completed</div>
                <div className="kpi-split-subval" style={{ color: 'var(--teal)' }}>
                  {loading ? '...' : completedTrainees}
                </div>
              </div>
              <div className="kpi-split-divider" />
              <div className="kpi-split-col">
                <div className="kpi-split-sublabel">Pending</div>
                <div className="kpi-split-subval" style={{ color: 'var(--accent)' }}>
                  {loading ? '...' : pendingTrainees}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Resource Persons */}
          <div className="kpi-split-card">
            <div className="kpi-split-header">
              <span className="kpi-split-title">Resource Persons.</span>
              <span className="kpi-split-total">{loading ? '...' : totalResourcePersons}</span>
            </div>
            <div className="kpi-split-body">
              <div className="kpi-split-col">
                <div className="kpi-split-sublabel">Completed</div>
                <div className="kpi-split-subval" style={{ color: 'var(--teal)' }}>
                  {loading ? '...' : completedResourcePersons}
                </div>
              </div>
              <div className="kpi-split-divider" />
              <div className="kpi-split-col">
                <div className="kpi-split-sublabel">Pending</div>
                <div className="kpi-split-subval" style={{ color: 'var(--accent)' }}>
                  {loading ? '...' : pendingResourcePersons}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── 2-Column Dashboard Layout (Scheduled workshops on Left, Calendar on Right) ── */}
        <div className="dashboard-layout">
          
          {/* ──── Left Column: Scheduled Workshops ──── */}
          <div className="dashboard-main-col">
            <div className="card" style={{ border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="card-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Scheduled workshops.
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px', marginBottom: 0 }}>
                    Workshops dispatched across organizing branches and target venues
                  </p>
                </div>
                <Link href="/workshops" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                  View All Workshops →
                </Link>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ fontWeight: 700 }}>Workshop ID</th>
                      <th style={{ fontWeight: 700 }}>Title</th>
                      <th style={{ fontWeight: 700 }}>Status</th>
                      <th style={{ fontWeight: 700 }}>Subject</th>
                      <th style={{ fontWeight: 700 }}>Host branch.</th>
                      <th style={{ fontWeight: 700, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workshops.length > 0 ? (
                      workshops.slice(0, 10).map((ws) => {
                        const statusObj = computeWorkshopStatus(ws);
                        const status = statusObj.status;
                        const isCompleted = status === 'Completed';
                        const isInProgress = status === 'In Progress';
                        const isScheduled = status === 'Scheduled';
                        const isRescheduled = ((ws.status || ws.statusName || '').toLowerCase().includes('reschedul')) || Boolean(ws.lastRescheduledAt);

                        return (
                          <tr key={ws.id}>
                            <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                              {ws.workshopNumber}
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                Year {ws.year}
                              </div>
                            </td>

                            <td>
                              <Link href={`/workshops/${ws.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {ws.title}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                📅 {ws.startDate} {ws.endDate && ws.endDate !== ws.startDate ? `to ${ws.endDate}` : ''}
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                <span
                                  style={{
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: isCompleted
                                      ? 'rgba(0, 83, 78, 0.12)'
                                      : isInProgress
                                      ? 'rgba(235, 116, 0, 0.12)'
                                      : 'rgba(21, 101, 192, 0.12)',
                                    color: isCompleted
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
                                  }}
                                >
                                  {isCompleted && '✓ Completed'}
                                  {isInProgress && '▶ In Progress'}
                                  {isScheduled && '⏳ Scheduled'}
                                </span>
                                {isRescheduled && (
                                  <span
                                    style={{
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.62rem',
                                      fontWeight: 600,
                                      background: 'rgba(147, 51, 234, 0.1)',
                                      color: '#7E22CE',
                                      border: '1px solid rgba(147, 51, 234, 0.25)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                    }}
                                  >
                                    🔄 Rescheduled
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ fontSize: '0.85rem' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--teal-10)',
                                  color: 'var(--teal)',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  border: '1px solid var(--teal-20)',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                }}
                              >
                                {ws.subject}
                              </span>
                            </td>

                            <td style={{ fontSize: '0.85rem' }}>
                              <span
                                style={{
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--primary-10)',
                                  color: 'var(--primary)',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  border: '1px solid var(--primary-20)',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                }}
                              >
                                {ws.placeName}
                              </span>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <Link href={`/workshops/${ws.id}`} className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                                Manage →
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                          {loading ? 'Loading workshops...' : 'No workshops scheduled yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ──── Right Column: Interactive Calendar ──── */}
          <div className="dashboard-side-col">
            <DashboardCalendar
              workshops={workshops}
              onStatusChange={handleStatusChange}
              loading={loading}
            />
          </div>

        </div>
      </div>
    </AppShell>
  );
}
