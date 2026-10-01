'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';

interface Participant {
  id: string;
  serialNumber?: number;
  name: string;
  nicNumber: string;
  position: string;
  schoolInstitute: string;
  phone: string;
  email: string;
  attendanceStatus: string;
  workshopId: string;
  workshopTitle: string;
  workshopNumber: string;
  workshopStartDate: string;
  workshopEndDate: string;
  workshopStatus: string;
  workshopPlaceName: string;
}

interface EnrichedWorkshop {
  id: string;
  workshopNumber: string;
  year: string;
  title: string;
  subject?: string;
  categoryName?: string;
  organizingOrgName: string;
  targetOrgName: string;
  startDate: string;
  endDate: string;
  completionDate: string;
  daysRemaining: number;
  daysUntilStart: number;
  totalDays: number;
  elapsedDays: number;
  progressPercent: number;
  venue?: string;
  status: 'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled';
  statusName: string;
  expectedTrainees: number;
  registeredTraineesCount: number;
  actualAttendedCount: number;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'in-progress' | 'pending' | 'completed' | 'participants' | 'all'
  const [activeTab, setActiveTab] = useState<'in-progress' | 'pending' | 'completed' | 'participants' | 'all'>('in-progress');

  // Filters for All Workshops & Participants
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [participantSearch, setParticipantSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const json = await res.json();
          setReportData(json);
        }
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const workshops: EnrichedWorkshop[] = useMemo(() => reportData?.workshops || [], [reportData]);
  const inProgressWorkshops: EnrichedWorkshop[] = useMemo(() => reportData?.inProgressWorkshops || [], [reportData]);
  const completedWorkshops: EnrichedWorkshop[] = useMemo(() => reportData?.completedWorkshops || [], [reportData]);
  const pendingWorkshops: EnrichedWorkshop[] = useMemo(() => reportData?.pendingWorkshops || [], [reportData]);
  const participants: Participant[] = useMemo(() => reportData?.participants || [], [reportData]);

  // Categories list
  const allCategories = useMemo(() => {
    return Array.from(new Set(workshops.map((w) => w.subject || w.categoryName).filter((c): c is string => Boolean(c))));
  }, [workshops]);

  // Filtered all workshops
  const filteredAllWorkshops = useMemo(() => {
    return workshops.filter((ws) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        ws.title.toLowerCase().includes(q) ||
        ws.workshopNumber.toLowerCase().includes(q) ||
        (ws.targetOrgName || '').toLowerCase().includes(q);

      const cat = ws.subject || ws.categoryName;
      const matchesCategory = selectedCategory === 'all' || cat === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [workshops, searchQuery, selectedCategory]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    const q = participantSearch.toLowerCase().trim();
    if (!q) return participants;
    return participants.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.nicNumber.toLowerCase().includes(q) ||
      p.schoolInstitute.toLowerCase().includes(q) ||
      p.workshopTitle.toLowerCase().includes(q) ||
      p.workshopNumber.toLowerCase().includes(q)
    );
  }, [participants, participantSearch]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeTab === 'participants') {
      if (!filteredParticipants.length) return;
      const headers = ['#', 'Name', 'NIC Number', 'Position', 'School / Institute', 'Workshop Number', 'Workshop Title', 'Start Date', 'End Date', 'Attendance Status'];
      const rows = filteredParticipants.map((p, idx) => [
        idx + 1,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.nicNumber}"`,
        `"${(p.position || '').replace(/"/g, '""')}"`,
        `"${(p.schoolInstitute || '').replace(/"/g, '""')}"`,
        `"${p.workshopNumber}"`,
        `"${p.workshopTitle.replace(/"/g, '""')}"`,
        `"${p.workshopStartDate}"`,
        `"${p.workshopEndDate}"`,
        `"${p.attendanceStatus}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      downloadCSV(csv, `registered_participants_${new Date().toISOString().slice(0, 10)}.csv`);
    } else {
      const targetList =
        activeTab === 'in-progress' ? inProgressWorkshops :
        activeTab === 'pending' ? pendingWorkshops :
        activeTab === 'completed' ? completedWorkshops : filteredAllWorkshops;

      if (!targetList.length) return;
      const headers = ['Workshop ID', 'Title', 'Subject', 'Organizing Unit', 'Host Branch', 'Start Date', 'End Date', 'Target Completion Date', 'Status', 'Registered Trainees'];
      const rows = targetList.map((ws) => [
        `"${ws.workshopNumber}"`,
        `"${ws.title.replace(/"/g, '""')}"`,
        `"${(ws.subject || ws.categoryName || '').replace(/"/g, '""')}"`,
        `"${ws.organizingOrgName}"`,
        `"${ws.targetOrgName}"`,
        `"${ws.startDate}"`,
        `"${ws.endDate}"`,
        `"${ws.completionDate || ws.endDate}"`,
        `"${ws.status}"`,
        ws.registeredTraineesCount || ws.expectedTrainees || 0,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      downloadCSV(csv, `workshops_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const metrics = reportData?.metrics || {
    totalWorkshops: workshops.length,
    inProgressCount: inProgressWorkshops.length,
    pendingCount: pendingWorkshops.length,
    completedCount: completedWorkshops.length,
    totalRegisteredParticipants: participants.length,
  };

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h1 className="page-title">Workshop Analytics & Reports</h1>
            <p className="page-subtitle">
              Comprehensive lifecycle tracking: in-progress timelines, pending schedules, completed audits, and registered participants
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
              🖨️ Print Report
            </button>
          </div>
        </div>

        {/* Top 5 KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          {/* Card 1: In Progress */}
          <div
            onClick={() => setActiveTab('in-progress')}
            style={{
              padding: '1.1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--white)',
              border: `2px solid ${activeTab === 'in-progress' ? '#EB7400' : 'rgba(235, 116, 0, 0.25)'}`,
              boxShadow: activeTab === 'in-progress' ? '0 4px 14px rgba(235, 116, 0, 0.15)' : 'var(--shadow-xs)',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EB7400', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Progress
              </span>
              <span style={{ fontSize: '1.2rem' }}>▶️</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EB7400', lineHeight: 1 }}>
              {metrics.inProgressCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Active workshops running today
            </div>
          </div>

          {/* Card 2: Pending */}
          <div
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '1.1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--white)',
              border: `2px solid ${activeTab === 'pending' ? '#1565C0' : 'rgba(21, 101, 192, 0.25)'}`,
              boxShadow: activeTab === 'pending' ? '0 4px 14px rgba(21, 101, 192, 0.15)' : 'var(--shadow-xs)',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending / Scheduled
              </span>
              <span style={{ fontSize: '1.2rem' }}>⏳</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1565C0', lineHeight: 1 }}>
              {metrics.pendingCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Upcoming future workshops
            </div>
          </div>

          {/* Card 3: Completed */}
          <div
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '1.1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--white)',
              border: `2px solid ${activeTab === 'completed' ? '#00534E' : 'rgba(0, 83, 78, 0.25)'}`,
              boxShadow: activeTab === 'completed' ? '0 4px 14px rgba(0, 83, 78, 0.15)' : 'var(--shadow-xs)',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00534E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Completed
              </span>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00534E', lineHeight: 1 }}>
              {metrics.completedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Concluded workshops
            </div>
          </div>

          {/* Card 4: Registered Participants */}
          <div
            onClick={() => setActiveTab('participants')}
            style={{
              padding: '1.1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--white)',
              border: `2px solid ${activeTab === 'participants' ? 'var(--primary)' : 'rgba(141, 21, 58, 0.25)'}`,
              boxShadow: activeTab === 'participants' ? '0 4px 14px rgba(141, 21, 58, 0.15)' : 'var(--shadow-xs)',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Registered Participants
              </span>
              <span style={{ fontSize: '1.2rem' }}>👥</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
              {metrics.totalRegisteredParticipants}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Trainees enrolled across all workshops
            </div>
          </div>

          {/* Card 5: All Workshops */}
          <div
            onClick={() => setActiveTab('all')}
            style={{
              padding: '1.1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--white)',
              border: `2px solid ${activeTab === 'all' ? 'var(--text-primary)' : 'var(--border-default)'}`,
              boxShadow: activeTab === 'all' ? 'var(--shadow-md)' : 'var(--shadow-xs)',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Workshops
              </span>
              <span style={{ fontSize: '1.2rem' }}>📚</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {metrics.totalWorkshops}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              All programs in system
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '2px solid var(--border-light)',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('in-progress')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'in-progress' ? '3px solid #EB7400' : '3px solid transparent',
              color: activeTab === 'in-progress' ? '#EB7400' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <span>▶️ In Progress Workshops</span>
            <span style={{
              padding: '0.1rem 0.45rem',
              borderRadius: '12px',
              fontSize: '0.72rem',
              background: activeTab === 'in-progress' ? '#EB7400' : 'var(--border-light)',
              color: activeTab === 'in-progress' ? '#fff' : 'var(--text-secondary)',
            }}>
              {inProgressWorkshops.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'pending' ? '3px solid #1565C0' : '3px solid transparent',
              color: activeTab === 'pending' ? '#1565C0' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <span>⏳ Pending Workshops</span>
            <span style={{
              padding: '0.1rem 0.45rem',
              borderRadius: '12px',
              fontSize: '0.72rem',
              background: activeTab === 'pending' ? '#1565C0' : 'var(--border-light)',
              color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)',
            }}>
              {pendingWorkshops.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'completed' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'completed' ? '#00534E' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <span>✅ Completed Workshops</span>
            <span style={{
              padding: '0.1rem 0.45rem',
              borderRadius: '12px',
              fontSize: '0.72rem',
              background: activeTab === 'completed' ? '#00534E' : 'var(--border-light)',
              color: activeTab === 'completed' ? '#fff' : 'var(--text-secondary)',
            }}>
              {completedWorkshops.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'participants' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'participants' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <span>👥 All Registered Participants</span>
            <span style={{
              padding: '0.1rem 0.45rem',
              borderRadius: '12px',
              fontSize: '0.72rem',
              background: activeTab === 'participants' ? 'var(--primary)' : 'var(--border-light)',
              color: activeTab === 'participants' ? '#fff' : 'var(--text-secondary)',
            }}>
              {participants.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'all' ? '3px solid var(--text-primary)' : '3px solid transparent',
              color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            <span>📋 All Workshops Audit</span>
            <span style={{
              padding: '0.1rem 0.45rem',
              borderRadius: '12px',
              fontSize: '0.72rem',
              background: activeTab === 'all' ? 'var(--text-primary)' : 'var(--border-light)',
              color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
            }}>
              {workshops.length}
            </span>
          </button>
        </div>

        {/* ─── TAB 1: IN PROGRESS WORKSHOPS (WITH COMPLETION DATES) ──────── */}
        {activeTab === 'in-progress' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(235, 116, 0, 0.08)',
              border: '1.5px solid rgba(235, 116, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#EB7400' }}>
                    Active Ongoing Workshops Overview
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Displaying workshops currently taking place today with their target deadlines and completion dates.
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: '#EB7400',
                color: '#fff',
              }}>
                {inProgressWorkshops.length} Active Right Now
              </span>
            </div>

            {inProgressWorkshops.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>☕</span>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  No Workshops Currently in Progress
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  There are no workshops scheduled to be held on today&apos;s date.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inProgressWorkshops.map((ws) => (
                  <div
                    key={ws.id}
                    className="card"
                    style={{
                      borderLeft: '5px solid #EB7400',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    {/* Top Row: Meta and Title */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: 'rgba(235, 116, 0, 0.15)',
                            color: '#EB7400',
                          }}>
                            ▶ In Progress
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            {ws.workshopNumber}
                          </span>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.7rem',
                            background: 'var(--teal-10)',
                            color: 'var(--teal)',
                            fontWeight: 600,
                          }}>
                            {ws.subject || ws.categoryName || 'Curriculum'}
                          </span>
                        </div>

                        <Link
                          href={`/workshops/${ws.id}`}
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          {ws.title}
                        </Link>
                      </div>

                      {/* Prominent Completion Date Badge */}
                      <div style={{
                        padding: '0.65rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(235, 116, 0, 0.1)',
                        border: '1.5px solid rgba(235, 116, 0, 0.35)',
                        textAlign: 'right',
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EB7400', textTransform: 'uppercase' }}>
                          Target Completion Date
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#B45309' }}>
                          🏁 {ws.completionDate}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {ws.daysRemaining === 0 ? 'Ending Today!' : `⏳ ${ws.daysRemaining} day${ws.daysRemaining > 1 ? 's' : ''} remaining`}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Schedule Details */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          <strong>Started:</strong> {ws.startDate}
                        </span>
                        <span style={{ color: '#B45309', fontWeight: 700 }}>
                          Day {ws.elapsedDays} of {ws.totalDays} ({ws.progressPercent}% Elapsed)
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--gray-200)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${ws.progressPercent}%`,
                          background: 'linear-gradient(90deg, #F59E0B, #EB7400)',
                          borderRadius: 'var(--radius-full)',
                        }} />
                      </div>
                    </div>

                    {/* Meta Info Bar: Host Branch, Trainees */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-light)',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <span>📍 <strong>Host Branch:</strong> {ws.targetOrgName}</span>
                        <span>🏛️ <strong>Organized by:</strong> {ws.organizingOrgName}</span>
                        <span>👥 <strong>Registered Trainees:</strong> {ws.registeredTraineesCount} enrolled</span>
                      </div>

                      <Link
                        href={`/workshops/${ws.id}`}
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#EB7400',
                          textDecoration: 'none',
                        }}
                      >
                        Manage Attendance & Trainees →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: PENDING WORKSHOPS ───────────────────────────────────── */}
        {activeTab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(21, 101, 192, 0.08)',
              border: '1.5px solid rgba(21, 101, 192, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1565C0' }}>
                    Upcoming & Pending Workshops
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Workshops scheduled for upcoming dates, awaiting their kickoff.
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: '#1565C0',
                color: '#fff',
              }}>
                {pendingWorkshops.length} Scheduled
              </span>
            </div>

            {pendingWorkshops.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>📅</span>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  No Pending Workshops
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  There are currently no scheduled future workshops.
                </div>
              </div>
            ) : (
              <div className="table-container card" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Workshop ID</th>
                      <th>Workshop Title</th>
                      <th>Category</th>
                      <th>Host Branch</th>
                      <th>Scheduled Dates</th>
                      <th>Days to Start</th>
                      <th>Expected / Registered</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWorkshops.map((ws) => (
                      <tr key={ws.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>
                          {ws.workshopNumber}
                        </td>
                        <td>
                          <Link href={`/workshops/${ws.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {ws.title}
                          </Link>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            Organized by: {ws.organizingOrgName}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--teal-10)',
                            color: 'var(--teal)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}>
                            {ws.subject || ws.categoryName || 'General'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{ws.targetOrgName}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          📅 {ws.startDate} to {ws.endDate}
                        </td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(21, 101, 192, 0.1)',
                            color: '#1565C0',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                          }}>
                            ⏳ In {ws.daysUntilStart} day{ws.daysUntilStart > 1 ? 's' : ''}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                          <strong>{ws.registeredTraineesCount}</strong> / {ws.expectedTrainees || 40}
                        </td>
                        <td>
                          <Link href={`/workshops/${ws.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                            View Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: COMPLETED WORKSHOPS ─────────────────────────────────── */}
        {activeTab === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 83, 78, 0.08)',
              border: '1.5px solid rgba(0, 83, 78, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#00534E' }}>
                    Completed Workshops Directory
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Historical record of workshops that concluded their training sessions.
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: '#00534E',
                color: '#fff',
              }}>
                {completedWorkshops.length} Completed
              </span>
            </div>

            <div className="table-container card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Workshop ID</th>
                    <th>Workshop Title</th>
                    <th>Category</th>
                    <th>Host Branch</th>
                    <th>Execution Dates</th>
                    <th>Completed Date</th>
                    <th>Registered / Attended</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completedWorkshops.map((ws) => (
                    <tr key={ws.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>
                        {ws.workshopNumber}
                      </td>
                      <td>
                        <Link href={`/workshops/${ws.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ws.title}
                        </Link>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          Organized by: {ws.organizingOrgName}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--teal-10)',
                          color: 'var(--teal)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                        }}>
                          {ws.subject || ws.categoryName || 'General'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{ws.targetOrgName}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {ws.startDate} to {ws.endDate}
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600, color: '#00534E' }}>
                        🏁 {ws.completionDate || ws.endDate}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{ws.actualAttendedCount}</span> / {ws.registeredTraineesCount || ws.expectedTrainees}
                      </td>
                      <td>
                        <Link href={`/workshops/${ws.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                          View Report →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: ALL REGISTERED PARTICIPANTS ─────────────────────────── */}
        {activeTab === 'participants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(141, 21, 58, 0.08)',
              border: '1.5px solid rgba(141, 21, 58, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>👥</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)' }}>
                    All Registered Workshop Participants
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Consolidated registry of teachers, officers, and trainees enrolled across all workshops.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Search by name, NIC, school, workshop..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', minWidth: '260px' }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  📥 Export Participants CSV
                </button>
              </div>
            </div>

            <div className="table-container card" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participant Name</th>
                    <th>NIC Number</th>
                    <th>Position / Designation</th>
                    <th>School / Educational Institute</th>
                    <th>Assigned Workshop</th>
                    <th>Workshop Dates</th>
                    <th>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                        No participants found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.8rem' }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.name}
                          {p.phone && p.phone !== '—' && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                              📞 {p.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {p.nicNumber}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {p.position}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {p.schoolInstitute}
                        </td>
                        <td>
                          <Link href={`/workshops/${p.workshopId}`} style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.82rem' }}>
                            {p.workshopTitle}
                          </Link>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            {p.workshopNumber}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {p.workshopStartDate} to {p.workshopEndDate}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              background:
                                p.attendanceStatus === 'attended'
                                  ? 'rgba(0, 83, 78, 0.12)'
                                  : 'rgba(21, 101, 192, 0.12)',
                              color:
                                p.attendanceStatus === 'attended'
                                  ? '#00534E'
                                  : '#1565C0',
                              border: `1px solid ${
                                p.attendanceStatus === 'attended'
                                  ? 'rgba(0, 83, 78, 0.25)'
                                  : 'rgba(21, 101, 192, 0.25)'
                              }`,
                            }}
                          >
                            {p.attendanceStatus === 'attended' ? '✓ Attended' : '📝 Registered'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 5: ALL WORKSHOPS AUDIT TABLE ───────────────────────────── */}
        {activeTab === 'all' && (
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Comprehensive Workshop Audit Report</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {filteredAllWorkshops.length} total workshop programs in scope
                </p>
              </div>

              {/* Search & Category Filter */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search workshops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.8rem', width: '220px', padding: '0.35rem 0.65rem' }}
                />

                <select
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ fontSize: '0.8rem', width: 'auto' }}
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Workshop ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Host Branch</th>
                    <th>Dates</th>
                    <th>Planned Trainees</th>
                    <th>Enrolled / Attended</th>
                    <th>Lifecycle Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllWorkshops.map((ws) => (
                    <tr key={ws.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {ws.workshopNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/workshops/${ws.id}`} style={{ color: 'var(--text-primary)' }}>
                          {ws.title}
                        </Link>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--teal-10)',
                            color: 'var(--teal)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {ws.subject || ws.categoryName || 'General'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{ws.targetOrgName}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {ws.startDate} to {ws.endDate}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                        {ws.expectedTrainees || 40}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: 'var(--teal)' }}>
                        {ws.registeredTraineesCount} registered
                        {ws.actualAttendedCount > 0 && ` (${ws.actualAttendedCount} attended)`}
                      </td>
                      <td>
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
                            background:
                              ws.status === 'Completed'
                                ? 'rgba(0, 83, 78, 0.12)'
                                : ws.status === 'In Progress'
                                ? 'rgba(235, 116, 0, 0.12)'
                                : 'rgba(21, 101, 192, 0.12)',
                            color:
                              ws.status === 'Completed'
                                ? '#00534E'
                                : ws.status === 'In Progress'
                                ? '#EB7400'
                                : '#1565C0',
                            border: `1px solid ${
                              ws.status === 'Completed'
                                ? 'rgba(0, 83, 78, 0.25)'
                                : ws.status === 'In Progress'
                                ? 'rgba(235, 116, 0, 0.25)'
                                : 'rgba(21, 101, 192, 0.25)'
                            }`,
                          }}
                        >
                          {ws.status === 'Completed' && '✓ Completed'}
                          {ws.status === 'In Progress' && '▶ In Progress'}
                          {ws.status === 'Scheduled' && '⏳ Scheduled'}
                        </span>
                      </td>
                      <td>
                        <Link href={`/workshops/${ws.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
