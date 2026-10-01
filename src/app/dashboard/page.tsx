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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;

  const loadDashboard = async () => {
    try {
      const [wsRes, orgRes, notifRes] = await Promise.all([
        fetch('/api/workshops'),
        fetch('/api/organizations'),
        fetch('/api/notifications'),
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
        // Refresh workshops data
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

  const totalWorkshops = workshops.length;
  const toConductCount = workshops.filter((w) => w.isToConduct).length;
  const scheduledByYouCount = workshops.filter((w) => w.isScheduledByYou).length;
  const totalTrainees = workshops.reduce((sum, w) => sum + (w.traineeCount || 0), 0);

  return (
    <AppShell>
      <div className="page-container dashboard-container">
        {/* Welcome Banner */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border-light)',
            borderLeft: '5px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem 1.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>
                Welcome, {user?.name || 'Authorized Branch'}
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Branch / Unit: <strong>{user?.name || user?.organizationName}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/workshops/new" className="btn btn-primary">
              ➕ Schedule a new workshop
            </Link>
            <Link href="/workshops" className="btn btn-secondary">
              📋 All Workshops
            </Link>
          </div>
        </div>

        {/* Recent Place Notifications Banner if any */}
        {notifications.length > 0 && (
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

        {/* ── 2-Column Dashboard Layout (Main content on Left, Calendar on Right) ── */}
        <div className="dashboard-layout">
          
          {/* ──── Left Main Column ──── */}
          <div className="dashboard-main-col">
            
            {/* KPI Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  📚
                </div>
                <div className="stat-value">{loading ? '...' : totalWorkshops}</div>
                <div className="stat-label">Total Connected Workshops</div>
              </div>

              <div className="stat-card teal">
                <div className="stat-icon teal">
                  📍
                </div>
                <div className="stat-value" style={{ color: 'var(--teal)' }}>
                  {loading ? '...' : toConductCount}
                </div>
                <div className="stat-label">Workshops to Conduct (Place)</div>
              </div>

              <div className="stat-card accent">
                <div className="stat-icon accent">
                  📤
                </div>
                <div className="stat-value" style={{ color: 'var(--accent)' }}>
                  {loading ? '...' : scheduledByYouCount}
                </div>
                <div className="stat-label">Workshops You Scheduled</div>
              </div>

              <div className="stat-card gold">
                <div className="stat-icon gold">
                  👥
                </div>
                <div className="stat-value" style={{ color: 'var(--gold-dark)' }}>
                  {loading ? '...' : totalTrainees}
                </div>
                <div className="stat-label">Trainees / Participants Registered</div>
              </div>
            </div>

            {/* Recent Workshops List Table */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Scheduled Workshops</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Workshops dispatched across organizing branches and host places
                  </p>
                </div>
                <Link href="/workshops" className="btn btn-secondary btn-sm">
                  View All Workshops →
                </Link>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Workshop ID</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Subject</th>
                      <th>Host Branch</th>
                      <th>Duration</th>
                      <th>Trainees</th>
                      <th>Actions</th>
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
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Year {ws.year}</div>
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

                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              ⏳ {ws.daysHeld} Days
                            </td>

                            <td style={{ fontSize: '0.85rem' }}>
                              👥 <strong>{ws.traineeCount}</strong> registered
                            </td>

                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <Link href={`/workshops/${ws.id}`} className="btn btn-secondary btn-sm">
                                  Manage →
                                </Link>
                                <a
                                  href={`/api/workshops/${ws.id}/export`}
                                  className="btn btn-ghost btn-sm"
                                  title="Export to Excel"
                                  style={{ color: 'var(--teal)', fontWeight: 600 }}
                                >
                                  📊 Excel
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                          {loading ? 'Loading workshops...' : 'No workshops scheduled yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ──── Right Sidebar Column: Interactive Calendar ──── */}
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
