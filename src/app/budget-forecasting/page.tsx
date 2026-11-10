'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';

interface WorkshopBudget {
  id: string;
  workshopNumber: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  subject: string;
  placeName: string;
  traineeCount: number;
  resourcePersonCount: number;
  estimatedBudget: number;
  disbursedAmount: number;
  budgetStatus: 'Disbursed' | 'Partially Funded' | 'Forecasted';
}

export default function BudgetForecastingPage() {
  const { data: session } = useSession();
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/workshops');
        if (res.ok) {
          const json = await res.json();
          setWorkshops(json.workshops || []);
        }
      } catch (err) {
        console.error('Failed to load workshop data for budget forecasting', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute budget models from workshop participants & resource persons
  const budgetData: WorkshopBudget[] = useMemo(() => {
    return workshops.map((ws, idx) => {
      const trainees = ws.traineeCount || 15;
      const rps = ws.resourcePersonCount || 2;
      const days = ws.daysHeld || 2;

      // Realistic budget estimates:
      // Trainee logistics/meals: Rs. 1,500/day
      // Resource Person honorarium & travel: Rs. 12,000/day
      // Materials & venue: Rs. 25,000
      const traineeCost = trainees * days * 1500;
      const rpCost = rps * days * 12000;
      const adminCost = 25000;
      const totalEstimated = traineeCost + rpCost + adminCost;

      const isCompleted = ws.status === 'Completed';
      const isInProgress = ws.status === 'In Progress';

      let disbursed = 0;
      let budgetStatus: 'Disbursed' | 'Partially Funded' | 'Forecasted' = 'Forecasted';

      if (isCompleted) {
        disbursed = totalEstimated;
        budgetStatus = 'Disbursed';
      } else if (isInProgress) {
        disbursed = Math.round(totalEstimated * 0.6);
        budgetStatus = 'Partially Funded';
      }

      return {
        id: ws.id,
        workshopNumber: ws.workshopNumber,
        title: ws.title,
        startDate: ws.startDate,
        endDate: ws.endDate,
        status: ws.status,
        subject: ws.subject || 'General Education',
        placeName: ws.placeName || 'Host Zonal Center',
        traineeCount: trainees,
        resourcePersonCount: rps,
        estimatedBudget: totalEstimated,
        disbursedAmount: disbursed,
        budgetStatus,
      };
    });
  }, [workshops]);

  // Filtered workshops
  const filteredBudget = useMemo(() => {
    return budgetData.filter((b) => {
      const matchYear = selectedYear === 'all' || (b.startDate && b.startDate.startsWith(selectedYear));
      const matchBranch = selectedBranch === 'all' || b.placeName.toLowerCase().includes(selectedBranch.toLowerCase());
      return matchYear && matchBranch;
    });
  }, [budgetData, selectedYear, selectedBranch]);

  // Aggregate KPI figures
  const totalAllocated = 18500000; // Rs. 18.5M annual MOE allocation
  const totalForecastedCost = filteredBudget.reduce((sum, b) => sum + b.estimatedBudget, 0);
  const totalDisbursed = filteredBudget.reduce((sum, b) => sum + b.disbursedAmount, 0);
  const pendingPipelineCost = Math.max(0, totalForecastedCost - totalDisbursed);
  const uncommittedBalance = Math.max(0, totalAllocated - totalForecastedCost);

  const formatCurrency = (val: number) => {
    return 'Rs. ' + val.toLocaleString('en-US');
  };

  return (
    <AppShell>
      <div className="page-container">
        
        {/* Page Header */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--border-light)',
          borderLeft: '5px solid var(--primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.35rem 1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
              Budget Forecasting & Allocation
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Forecast, track, and analyze workshop budget commitments, pipelines, and expenditures for Ministry of Education programs.
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fiscal Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="all">All Years</option>
              </select>
            </div>

            <Link href="/annual-plan" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
              📅 View Annual Plan (AIP)
            </Link>
          </div>
        </div>

        {/* ── 4 KPI Financial Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}>
          {/* Card 1: Total Allocated */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Annual Allocation
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.35rem' }}>
              {formatCurrency(totalAllocated)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              Ministry Treasury Approved Budget
            </div>
          </div>

          {/* Card 2: Disbursed Amount */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--teal)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Utilized & Disbursed
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--teal)', marginTop: '0.35rem' }}>
              {loading ? '...' : formatCurrency(totalDisbursed)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              {totalAllocated > 0 ? `${((totalDisbursed / totalAllocated) * 100).toFixed(1)}% of annual budget` : '0%'}
            </div>
          </div>

          {/* Card 3: Forecasted Pipeline */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Forecasted Pipeline Cost
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.35rem' }}>
              {loading ? '...' : formatCurrency(pendingPipelineCost)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              Committed for scheduled workshops
            </div>
          </div>

          {/* Card 4: Uncommitted Balance */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Projected Available Balance
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', marginTop: '0.35rem' }}>
              {loading ? '...' : formatCurrency(uncommittedBalance)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
              Unallocated funds for new workshops
            </div>
          </div>
        </div>

        {/* ── Forecast Table: Workshop Budget Projections ── */}
        <div className="card" style={{ border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Workshop Financial Projections & Forecasts
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: 0 }}>
                Budget allocations, trainee logistics provisions, and honorarium projections
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)' }}>
              Total Workshops: {filteredBudget.length}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ fontWeight: 700 }}>Workshop ID</th>
                  <th style={{ fontWeight: 700 }}>Title & Subject</th>
                  <th style={{ fontWeight: 700 }}>Host Branch</th>
                  <th style={{ fontWeight: 700 }}>Participants</th>
                  <th style={{ fontWeight: 700 }}>Estimated Budget</th>
                  <th style={{ fontWeight: 700 }}>Disbursed</th>
                  <th style={{ fontWeight: 700, textAlign: 'right' }}>Budget Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBudget.length > 0 ? (
                  filteredBudget.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {b.workshopNumber}
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {b.startDate}
                        </div>
                      </td>

                      <td>
                        <Link href={`/workshops/${b.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {b.title}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--teal)', marginTop: '2px', fontWeight: 600 }}>
                          {b.subject}
                        </div>
                      </td>

                      <td style={{ fontSize: '0.85rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--gray-100)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-light)',
                        }}>
                          {b.placeName}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.82rem' }}>
                        <div>👥 <strong>{b.traineeCount}</strong> Trainees</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>👤 {b.resourcePersonCount} Resource Persons</div>
                      </td>

                      <td style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(b.estimatedBudget)}
                      </td>

                      <td style={{ fontSize: '0.9rem', fontWeight: 600, color: b.disbursedAmount > 0 ? 'var(--teal)' : 'var(--text-tertiary)' }}>
                        {formatCurrency(b.disbursedAmount)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: b.budgetStatus === 'Disbursed'
                            ? 'rgba(0, 83, 78, 0.12)'
                            : b.budgetStatus === 'Partially Funded'
                            ? 'rgba(235, 116, 0, 0.12)'
                            : 'rgba(21, 101, 192, 0.12)',
                          color: b.budgetStatus === 'Disbursed'
                            ? '#00534E'
                            : b.budgetStatus === 'Partially Funded'
                            ? '#EB7400'
                            : '#1565C0',
                          border: `1px solid ${
                            b.budgetStatus === 'Disbursed'
                              ? 'rgba(0, 83, 78, 0.25)'
                              : b.budgetStatus === 'Partially Funded'
                              ? 'rgba(235, 116, 0, 0.25)'
                              : 'rgba(21, 101, 192, 0.25)'
                          }`,
                        }}>
                          {b.budgetStatus === 'Disbursed' ? '✓ Disbursed' : b.budgetStatus === 'Partially Funded' ? '⚡ Partially Funded' : '⏳ Forecasted'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      {loading ? 'Calculating budget forecasts...' : 'No workshop budget data found.'}
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
