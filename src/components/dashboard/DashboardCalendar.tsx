'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface DashboardCalendarProps {
  workshops: any[];
  onStatusChange?: (workshopId: string, newStatus: string) => Promise<void>;
  loading?: boolean;
}

// Days of week starting with Monday (as in official LMS standard)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeStatus(ws: any): 'Completed' | 'In Progress' | 'Scheduled' {
  const startStr = (ws.startDate || '').slice(0, 10);
  const endStr = (ws.endDate || ws.startDate || '').slice(0, 10);

  if (startStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    if (todayStr > endStr) return 'Completed';
    if (todayStr >= startStr && todayStr <= endStr) return 'In Progress';
    return 'Scheduled';
  }

  const s = (ws.status || ws.statusName || '').toLowerCase();
  const id = (ws.statusId || '').toLowerCase();

  if (s.includes('complete') || id.includes('complete')) return 'Completed';
  if (s.includes('progress') || s.includes('ongoing') || id.includes('ongoing')) return 'In Progress';
  return 'Scheduled'; // Pending / Scheduled
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardCalendar({ workshops = [], onStatusChange, loading }: DashboardCalendarProps) {
  // Current visible month/year
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  // Selected single date (YYYY-MM-DD) or null for all month
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  // Status filter chip
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Scheduled' | 'In Progress'>('all');
  // State for updating status inline
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const currentYear = viewDate.getFullYear();
  const currentMonthIdx = viewDate.getMonth();

  const today = new Date();
  const todayKey = formatDateKey(today);

  // Month navigation
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonthIdx - 1, 1));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonthIdx + 1, 1));
    setSelectedDateKey(null);
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDateKey(formatDateKey(now));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate(new Date(newYear, currentMonthIdx, 1));
    setSelectedDateKey(null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(new Date(currentYear, newMonth, 1));
    setSelectedDateKey(null);
  };

  // Build workshop lookup map for the calendar days
  // Key: YYYY-MM-DD -> Array of workshops on that day
  const { workshopsByDate, monthWorkshops, statusCounts } = useMemo(() => {
    const map: Record<string, any[]> = {};
    const inMonth: any[] = [];
    const counts = { total: 0, completed: 0, scheduled: 0, inProgress: 0 };

    workshops.forEach((ws) => {
      const startStr = (ws.startDate || '').slice(0, 10);
      const endStr = (ws.endDate || ws.startDate || '').slice(0, 10);

      if (!startStr) return;

      const normStatus = normalizeStatus(ws);
      const startParts = startStr.split('-').map(Number);
      const endParts = endStr.split('-').map(Number);

      const sDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const eDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);

      // Check if this workshop touches the current month
      const startMonth = sDate.getFullYear() * 12 + sDate.getMonth();
      const endMonth = eDate.getFullYear() * 12 + eDate.getMonth();
      const targetMonth = currentYear * 12 + currentMonthIdx;

      const isInThisMonth = targetMonth >= startMonth && targetMonth <= endMonth;

      if (isInThisMonth) {
        inMonth.push(ws);
        counts.total++;
        if (normStatus === 'Completed') counts.completed++;
        else if (normStatus === 'In Progress') counts.inProgress++;
        else counts.scheduled++;
      }

      // Populate every day in range
      const cur = new Date(sDate);
      // Safeguard max 60 days loop
      let count = 0;
      while (cur <= eDate && count < 60) {
        const key = formatDateKey(cur);
        if (!map[key]) map[key] = [];
        if (!map[key].some((item) => item.id === ws.id)) {
          map[key].push(ws);
        }
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    });

    return { workshopsByDate: map, monthWorkshops: inMonth, statusCounts: counts };
  }, [workshops, currentYear, currentMonthIdx]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonthIdx + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();
    // Monday is 0, Sunday is 6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const days: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      workshops: any[];
    }> = [];

    // Leading days from previous month
    const prevMonthLastDate = new Date(currentYear, currentMonthIdx, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const prevDate = new Date(currentYear, currentMonthIdx - 1, d);
      const key = formatDateKey(prevDate);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: key === todayKey,
        workshops: workshopsByDate[key] || [],
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(currentYear, currentMonthIdx, d);
      const key = formatDateKey(curDate);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: key === todayKey,
        workshops: workshopsByDate[key] || [],
      });
    }

    // Trailing days from next month to complete row of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonthIdx + 1, d);
      const key = formatDateKey(nextDate);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: key === todayKey,
        workshops: workshopsByDate[key] || [],
      });
    }

    return days;
  }, [currentYear, currentMonthIdx, workshopsByDate, todayKey]);

  // Filter workshop list based on selected date and status filter
  const displayedWorkshops = useMemo(() => {
    let list = selectedDateKey
      ? (workshopsByDate[selectedDateKey] || [])
      : monthWorkshops;

    if (statusFilter !== 'all') {
      list = list.filter((w) => normalizeStatus(w) === statusFilter);
    }

    // Remove duplicates
    const seen = new Set<string>();
    return list.filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  }, [selectedDateKey, workshopsByDate, monthWorkshops, statusFilter]);

  // Handle inline quick status change
  const handleQuickStatusChange = async (wsId: string, newStatus: string) => {
    if (onStatusChange) {
      setUpdatingId(wsId);
      try {
        await onStatusChange(wsId, newStatus);
        setStatusMsg(`Workshop status marked as "${newStatus}"`);
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (err: any) {
        console.error('Failed to change status:', err);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  return (
    <div className="dashboard-calendar-wrapper">
      {/* ── Main Calendar Card ── */}
      <div className="card calendar-card" style={{ padding: '1.25rem' }}>
        
        {/* Card Header with Title and Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                Calendar
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Monthly workshop schedules & status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', height: 'auto', fontWeight: 600 }}
            title="Jump to today"
          >
            Today
          </button>
        </div>

        {/* Month & Year Bar with Next / Prev Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--gray-100)',
          borderRadius: 'var(--radius-md)',
          padding: '0.4rem 0.6rem',
          marginBottom: '0.85rem',
          border: '1px solid var(--border-light)',
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="calendar-nav-btn"
            title="Previous Month"
            aria-label="Previous Month"
          >
            ◀
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <select
              value={currentMonthIdx}
              onChange={handleMonthChange}
              style={{
                background: 'transparent',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={handleYearChange}
              style={{
                background: 'transparent',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="calendar-nav-btn"
            title="Next Month"
            aria-label="Next Month"
          >
            ▶
          </button>
        </div>

        {/* Weekday Header: Mon Tue Wed Thu Fri Sat Sun */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          marginBottom: '0.4rem',
        }}>
          {WEEKDAYS.map((wd) => (
            <div key={wd} style={{ padding: '0.2rem 0' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Days 7-col Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          background: 'var(--border-light)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          {calendarDays.map((day, idx) => {
            const isSelected = selectedDateKey === day.dateKey;
            const hasWorkshops = day.workshops.length > 0;
            const completedCount = day.workshops.filter((w) => normalizeStatus(w) === 'Completed').length;
            const inProgressCount = day.workshops.filter((w) => normalizeStatus(w) === 'In Progress').length;
            const scheduledCount = day.workshops.filter((w) => normalizeStatus(w) === 'Scheduled').length;

            return (
              <div
                key={day.dateKey + idx}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDateKey(null); // toggle off
                  } else {
                    setSelectedDateKey(day.dateKey);
                  }
                }}
                className={`calendar-cell ${!day.isCurrentMonth ? 'is-outside' : ''} ${day.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                title={
                  hasWorkshops
                    ? `${day.dateKey}: ${day.workshops.map((w) => `${w.title} (${normalizeStatus(w)})`).join('; ')}`
                    : day.dateKey
                }
                style={{
                  minHeight: '44px',
                  background: isSelected
                    ? 'rgba(141, 21, 58, 0.12)'
                    : day.isCurrentMonth
                    ? 'var(--white)'
                    : 'var(--gray-100)',
                  cursor: 'pointer',
                  padding: '3px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background var(--ease)',
                  outline: isSelected ? '2px solid var(--primary)' : day.isToday ? '1.5px dashed var(--accent)' : 'none',
                  outlineOffset: '-2px',
                  position: 'relative',
                }}
              >
                {/* Day Number */}
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: day.isToday || isSelected ? 800 : day.isCurrentMonth ? 600 : 400,
                    color: isSelected
                      ? 'var(--primary)'
                      : day.isToday
                      ? 'var(--accent-dark)'
                      : day.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-placeholder)',
                    lineHeight: 1.1,
                    marginTop: '1px',
                  }}
                >
                  {day.dayNumber}
                </span>

                {/* Workshop Status Indicator Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minHeight: '8px', marginBottom: '2px' }}>
                  {completedCount > 0 && (
                    <span
                      className="calendar-dot completed"
                      title={`${completedCount} Completed`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#00534E',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {inProgressCount > 0 && (
                    <span
                      className="calendar-dot in-progress"
                      title={`${inProgressCount} In Progress`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#EB7400',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {scheduledCount > 0 && (
                    <span
                      className="calendar-dot scheduled"
                      title={`${scheduledCount} Pending / Scheduled`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#1565C0',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.75rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--border-light)',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}>
          <div
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'all' : 'Completed')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: statusFilter === 'all' || statusFilter === 'Completed' ? 1 : 0.4 }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00534E' }} />
            <span>Completed ({statusCounts.completed})</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'all' : 'In Progress')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: statusFilter === 'all' || statusFilter === 'In Progress' ? 1 : 0.4 }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EB7400' }} />
            <span>In Progress ({statusCounts.inProgress})</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'Scheduled' ? 'all' : 'Scheduled')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: statusFilter === 'all' || statusFilter === 'Scheduled' ? 1 : 0.4 }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1565C0' }} />
            <span>Pending ({statusCounts.scheduled})</span>
          </div>
        </div>

      </div>

      {/* ── Monthly Workshop Overview & Detail Section ── */}
      <div className="card" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {selectedDateKey ? (
                <>
                  Workshops on <span style={{ color: 'var(--primary)' }}>{formatDisplayDate(selectedDateKey)}</span>
                </>
              ) : (
                <>
                  Workshops in <span style={{ color: 'var(--primary)' }}>{MONTH_NAMES[currentMonthIdx]} {currentYear}</span>
                </>
              )}
            </h4>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {selectedDateKey
                ? 'Showing workshops scheduled for this selected date'
                : `${statusCounts.total} workshop(s) planned for this month`}
            </div>
          </div>

          {selectedDateKey && (
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--primary)' }}
            >
              ✕ View All Month
            </button>
          )}
        </div>

        {/* Filter Chips: All | Completed | In Progress | Pending */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'all' ? 'var(--primary)' : 'var(--border-default)',
              background: statusFilter === 'all' ? 'var(--primary-10)' : 'var(--white)',
              color: statusFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            All ({selectedDateKey ? displayedWorkshops.length : statusCounts.total})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Completed')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'Completed' ? '#00534E' : 'var(--border-default)',
              background: statusFilter === 'Completed' ? 'rgba(0, 83, 78, 0.12)' : 'var(--white)',
              color: statusFilter === 'Completed' ? '#00534E' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ✓ Completed ({statusCounts.completed})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('In Progress')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'In Progress' ? '#EB7400' : 'var(--border-default)',
              background: statusFilter === 'In Progress' ? 'rgba(235, 116, 0, 0.12)' : 'var(--white)',
              color: statusFilter === 'In Progress' ? '#EB7400' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ▶ In Progress ({statusCounts.inProgress})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Scheduled')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'Scheduled' ? '#1565C0' : 'var(--border-default)',
              background: statusFilter === 'Scheduled' ? 'rgba(21, 101, 192, 0.12)' : 'var(--white)',
              color: statusFilter === 'Scheduled' ? '#1565C0' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ⏳ Pending ({statusCounts.scheduled})
          </button>
        </div>

        {/* Feedback message when status changes */}
        {statusMsg && (
          <div style={{
            padding: '0.4rem 0.75rem',
            background: 'rgba(0, 83, 78, 0.1)',
            border: '1px solid #00534E',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: '#00534E',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}>
            ✓ {statusMsg}
          </div>
        )}

        {/* Workshops Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
          {displayedWorkshops.length > 0 ? (
            displayedWorkshops.map((ws) => {
              const status = normalizeStatus(ws);
              const isUpdating = updatingId === ws.id;

              return (
                <div
                  key={ws.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    borderLeft: `4px solid ${
                      status === 'Completed' ? '#00534E' : status === 'In Progress' ? '#EB7400' : '#1565C0'
                    }`,
                    background: 'var(--white)',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all var(--ease)',
                  }}
                >
                  {/* Top row: Status Badge & Workshop ID */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        background:
                          status === 'Completed'
                            ? 'rgba(0, 83, 78, 0.12)'
                            : status === 'In Progress'
                            ? 'rgba(235, 116, 0, 0.12)'
                            : 'rgba(21, 101, 192, 0.12)',
                        color:
                          status === 'Completed'
                            ? '#00534E'
                            : status === 'In Progress'
                            ? '#EB7400'
                            : '#1565C0',
                      }}
                    >
                      {status === 'Completed' && '✓ Completed'}
                      {status === 'In Progress' && '▶ In Progress'}
                      {status === 'Scheduled' && '⏳ Pending / Scheduled'}
                    </span>

                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {ws.workshopNumber || ws.year}
                    </span>
                  </div>

                  {/* Title */}
                  <Link
                    href={`/workshops/${ws.id}`}
                    style={{
                      display: 'block',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                      marginBottom: '0.35rem',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  >
                    {ws.title}
                  </Link>

                  {/* Date range & duration */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span>📅</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatDisplayDate(ws.startDate)}
                      {ws.endDate && ws.endDate !== ws.startDate && ` – ${formatDisplayDate(ws.endDate)}`}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      ({ws.daysHeld || 1} day{ws.daysHeld > 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Place */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span>📍</span>
                    <span>{ws.placeName || 'Assigned Branch'}</span>
                  </div>

                  {/* Footer actions: Open link and quick status changer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.4rem',
                    borderTop: '1px dashed var(--border-light)',
                    marginTop: '0.4rem',
                  }}>
                    <Link
                      href={`/workshops/${ws.id}`}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      Open Workshop →
                    </Link>

                    <span style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-tertiary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: status === 'Completed' ? '#00534E' : status === 'In Progress' ? '#EB7400' : '#1565C0',
                      }} />
                      Auto (by date)
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '1.75rem 1rem',
              color: 'var(--text-tertiary)',
              background: 'var(--gray-100)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>📋</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {selectedDateKey
                  ? `No workshops on ${formatDisplayDate(selectedDateKey)}`
                  : statusFilter !== 'all'
                  ? `No ${statusFilter} workshops in this month`
                  : `No workshops scheduled for ${MONTH_NAMES[currentMonthIdx]} ${currentYear}`}
              </div>
              <p style={{ fontSize: '0.72rem', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                Use the button below to schedule a new workshop.
              </p>
              <Link href="/workshops/new" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
                ➕ Schedule Workshop
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
