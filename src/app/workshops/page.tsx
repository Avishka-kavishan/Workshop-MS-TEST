'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';

export default function WorkshopsPage() {
  const { data: session } = useSession();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<'all' | 'to-conduct' | 'scheduled-by-you'>('all');
  const [selectedPlace, setSelectedPlace] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [counts, setCounts] = useState<{ total: number; toConduct: number; scheduledByYou: number }>({
    total: 0,
    toConduct: 0,
    scheduledByYou: 0,
  });

  const user = session?.user as any;

  useEffect(() => {
    async function loadMeta() {
      try {
        const orgRes = await fetch('/api/organizations');
        if (orgRes.ok) {
          const json = await orgRes.json();
          setPlaces(json.places || []);
        }
      } catch (err) {
        console.error('Failed to load metadata', err);
      }
    }
    loadMeta();
  }, []);

  const fetchWorkshops = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedConnection !== 'all') params.append('connection', selectedConnection);
      if (selectedPlace !== 'all') params.append('place', selectedPlace);
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`/api/workshops?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setWorkshops(json.workshops || []);
        if (json.counts) {
          setCounts(json.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch workshops', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, [selectedConnection, selectedPlace, selectedYear, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkshops();
  };

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>Workshops</h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--teal-10)',
                  color: 'var(--teal)',
                  border: '1px solid var(--teal-20)',
                }}
              >
                🔒 Connected Workshops Only
              </span>
            </div>
            <p className="page-subtitle">
              Showing only workshops you are connected to (as organizer, creator, or host place: <strong>{user?.organizationName || user?.name || 'Your Branch'}</strong>)
            </p>
          </div>
        </div>


        {/* Connected Workshops Scope: All Connected vs To Conduct vs Scheduled by You */}
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--border-light)',
            paddingBottom: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedConnection('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: selectedConnection === 'all' ? 'var(--primary)' : 'var(--border-default)',
              background: selectedConnection === 'all' ? 'var(--primary)' : 'var(--white)',
              color: selectedConnection === 'all' ? '#fff' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <span>🌐 All Workshops</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                background: selectedConnection === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--gray-200)',
                color: selectedConnection === 'all' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
              }}
            >
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedConnection('to-conduct')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: selectedConnection === 'to-conduct' ? 'var(--teal)' : 'var(--border-default)',
              background: selectedConnection === 'to-conduct' ? 'var(--teal)' : 'var(--white)',
              color: selectedConnection === 'to-conduct' ? '#fff' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <span>📍 Self conduct workshops</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                background: selectedConnection === 'to-conduct' ? 'rgba(255,255,255,0.25)' : 'var(--teal-10)',
                color: selectedConnection === 'to-conduct' ? '#fff' : 'var(--teal)',
                fontWeight: 700,
              }}
            >
              {counts.toConduct}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedConnection('scheduled-by-you')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: selectedConnection === 'scheduled-by-you' ? 'var(--accent)' : 'var(--border-default)',
              background: selectedConnection === 'scheduled-by-you' ? 'var(--accent)' : 'var(--white)',
              color: selectedConnection === 'scheduled-by-you' ? '#fff' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all var(--ease)',
            }}
          >
            <span>📤 Workshop conduct by organizer</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                background: selectedConnection === 'scheduled-by-you' ? 'rgba(255,255,255,0.25)' : 'var(--accent-10)',
                color: selectedConnection === 'scheduled-by-you' ? '#fff' : 'var(--accent-dark)',
                fontWeight: 700,
              }}
            >
              {counts.scheduledByYou}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px' }}
          >
            <input
              type="text"
              className="form-input"
              placeholder="Search by workshop title, subject, branch, or place..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('');
                  setTimeout(fetchWorkshops, 50);
                }}
              >
                Clear
              </button>
            )}
          </form>

          {/* Place & Year Dropdowns */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Filter by Place */}
            <select
              className="form-select"
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              style={{ width: 'auto', minWidth: '200px', fontSize: '0.85rem' }}
            >
              <option value="all">All Places / Host Branches</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Filter by Year */}
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
            >
              <option value="all">All Years</option>
              <option value="2024">Year 2024</option>
              <option value="2025">Year 2025</option>
              <option value="2026">Year 2026</option>
              <option value="2027">Year 2027</option>
            </select>

            {/* Filter by Status */}
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: 'auto', minWidth: '145px', fontSize: '0.85rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">⏳ Scheduled</option>
              <option value="Rescheduled">🔄 Rescheduled</option>
              <option value="In Progress">▶ In Progress</option>
              <option value="Completed">✓ Completed</option>
            </select>
          </div>
        </div>

        {/* Workshops Table */}
        <div className="card" style={{ padding: '0.75rem' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workshop ID & Year</th>
                  <th>Workshop Title</th>
                  <th>Subject</th>
                  <th>Your Role</th>
                  <th>Organizing Branch</th>
                  <th>Host Branch</th>
                  <th>Days Held</th>
                  <th>Trainees</th>
                  <th>Resource Persons</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workshops.length > 0 ? (
                  workshops.map((ws) => (
                    <tr key={ws.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--primary)' }}>
                          {ws.workshopNumber}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          Year {ws.year}
                        </div>
                        {((ws.status || '').toLowerCase().includes('reschedul')) && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(147, 51, 234, 0.12)',
                                color: '#7E22CE',
                                border: '1px solid rgba(147, 51, 234, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              🔄 Rescheduled
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        <Link href={`/workshops/${ws.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ws.title}
                        </Link>
                        {ws.aim && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Objectives: {ws.aim}
                          </div>
                        )}
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

                      <td>
                        {ws.isToConduct && ws.isScheduledByYou ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--primary-10)',
                              color: 'var(--primary)',
                              border: '1px solid var(--primary-20)',
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            🌟 Host & Organizer
                          </span>
                        ) : ws.isToConduct ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--teal-10)',
                              color: 'var(--teal)',
                              border: '1px solid var(--teal-20)',
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            📍 To Conduct (Host Place)
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--accent-10)',
                              color: 'var(--accent-dark)',
                              border: '1px solid var(--accent-20)',
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            📤 Scheduled by You
                          </span>
                        )}
                      </td>

                      <td style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 500 }}>{ws.branch}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                          by {ws.creatorName}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.85rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
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

                      <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ⏳ {ws.daysHeld} Days
                      </td>

                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        👥 <strong>{ws.traineeCount}</strong> registered
                      </td>

                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        🎤 <strong>{ws.resourcePersonCount}</strong> assigned
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-tertiary)' }}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <div className="empty-state-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {loading ? 'Loading workshops...' : 'No connected workshops found'}
                        </div>
                        <p className="empty-state-text" style={{ maxWidth: '480px', margin: '0.5rem auto 1rem auto', fontSize: '0.85rem', lineHeight: 1.5 }}>
                          {selectedConnection === 'to-conduct'
                            ? `No workshops are scheduled to be conducted at ${user?.organizationName || 'your branch'}.`
                            : selectedConnection === 'scheduled-by-you'
                            ? `Your branch (${user?.organizationName || 'your branch'}) has not scheduled any workshops yet.`
                            : `You can only view workshops that are assigned to your branch to conduct or that your branch has scheduled.`}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
