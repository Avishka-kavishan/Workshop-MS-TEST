'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';

interface AipPlan {
  id: string;
  branchId: string;
  branchName: string;
  year: string;
  phaseTitle: string;
  targetTitle: string;
  mainResponsibility: string;
  mainContactNo: string;
  overallResponsibility: string;
  overallContactNo: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  createdAt: string;
  updatedAt: string;
}

interface AipActivity {
  id: string;
  planId?: string;
  branchId: string;
  branchName: string;
  year: string;
  outputNo: string;
  activityCode: string;
  activity: string;
  voteNumber: string;
  estimatedCost: number;
  financialMonths: number[];
  physicalMonths: string[];
  financialQ1: number;
  financialQ2: number;
  financialQ3: number;
  financialQ4: number;
  targetQ1: string;
  targetQ2: string;
  targetQ3: string;
  targetQ4: string;
  responsibleOfficer: string;
  createdAt: string;
  updatedAt: string;
}

const MONTH_NAMES_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AnnualPlanPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2027');
  const [plan, setPlan] = useState<AipPlan | null>(null);
  const [activities, setActivities] = useState<AipActivity[]>([]);
  const [branchInfo, setBranchInfo] = useState<{ id: string; name: string } | null>(null);

  // Directly editable fields in the sheet
  const [mainResp, setMainResp] = useState('');
  const [mainContact, setMainContact] = useState('');
  const [overallResp, setOverallResp] = useState('');
  const [overallContact, setOverallContact] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [headerSavedSuccess, setHeaderSavedSuccess] = useState(false);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AipActivity | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Activity Form Fields
  const [formOutputNo, setFormOutputNo] = useState('1');
  const [formActivityCode, setFormActivityCode] = useState('');
  const [formActivity, setFormActivity] = useState('');
  const [formVoteNumber, setFormVoteNumber] = useState('-');
  const [formEstimatedCost, setFormEstimatedCost] = useState('');
  const [formResponsibleOfficer, setFormResponsibleOfficer] = useState('');

  const [formFinancialMonths, setFormFinancialMonths] = useState<number[]>(Array(12).fill(0));
  const [formPhysicalMonths, setFormPhysicalMonths] = useState<string[]>(Array(12).fill('-'));

  const [formFinancialQ1, setFormFinancialQ1] = useState(0);
  const [formFinancialQ2, setFormFinancialQ2] = useState(0);
  const [formFinancialQ3, setFormFinancialQ3] = useState(0);
  const [formFinancialQ4, setFormFinancialQ4] = useState(0);

  const [formTargetQ1, setFormTargetQ1] = useState('-');
  const [formTargetQ2, setFormTargetQ2] = useState('-');
  const [formTargetQ3, setFormTargetQ3] = useState('-');
  const [formTargetQ4, setFormTargetQ4] = useState('100%');

  // Load Data
  const loadPlanData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/annual-plan?year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setBranchInfo(json.branch);
        setPlan(json.plan);
        setActivities(json.activities || []);

        if (json.plan) {
          setMainResp(json.plan.mainResponsibility || '');
          setMainContact(json.plan.mainContactNo || '');
          setOverallResp(json.plan.overallResponsibility || '');
          setOverallContact(json.plan.overallContactNo || '');
        } else {
          setMainResp('Mrs. Udara T. Dikkumbura, Add.Sec.(Information Technology and Digital Education)');
          setMainContact('714929279');
          setOverallResp('Mrs. S. Dakshina Kasthuriarachchi (Director of Education)');
          setOverallContact('714325568');
        }
      }
    } catch (err) {
      console.error('Failed to load annual plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanData();
  }, [selectedYear]);

  // Create AIP Plan button
  const handleCreateAip = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/annual-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${selectedYear}`,
          mainResponsibility: mainResp || 'Mrs. Udara T. Dikkumbura, Add.Sec.(Information Technology and Digital Education)',
          mainContactNo: mainContact || '714929279',
          overallResponsibility: overallResp || 'Mrs. S. Dakshina Kasthuriarachchi (Director of Education)',
          overallContactNo: overallContact || '714325568',
          status: 'Draft',
        }),
      });

      if (res.ok) {
        await loadPlanData();
      }
    } catch (err) {
      console.error('Error creating AIP plan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save directly editable fields in the sheet
  const handleSaveHeaderFields = async () => {
    try {
      setIsSavingHeader(true);
      const res = await fetch('/api/annual-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan?.id,
          year: selectedYear,
          mainResponsibility: mainResp,
          mainContactNo: mainContact,
          overallResponsibility: overallResp,
          overallContactNo: overallContact,
        }),
      });
      if (res.ok) {
        setHeaderSavedSuccess(true);
        setTimeout(() => setHeaderSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving header fields:', err);
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Calculations for bottom Total rows
  const totals = useMemo(() => {
    // 1. Total Estimated Cost
    const totalEstimatedCost = activities.reduce(
      (sum, a) => sum + (Number(a.estimatedCost) || 0),
      0
    );

    // 2. Monthly Financial Totals
    const monthlyFinancial = Array(12).fill(0);
    activities.forEach((act) => {
      (act.financialMonths || []).forEach((val, idx) => {
        if (idx < 12) {
          monthlyFinancial[idx] += Number(val) || 0;
        }
      });
    });

    // 3. Quarterly Cumulative Financial Totals
    const q1Fin = monthlyFinancial[0] + monthlyFinancial[1] + monthlyFinancial[2];
    const q2Fin = q1Fin + monthlyFinancial[3] + monthlyFinancial[4] + monthlyFinancial[5];
    const q3Fin = q2Fin + monthlyFinancial[6] + monthlyFinancial[7] + monthlyFinancial[8];
    const q4Fin = q3Fin + monthlyFinancial[9] + monthlyFinancial[10] + monthlyFinancial[11];
    const quarterlyFinancial = [q1Fin, q2Fin, q3Fin, q4Fin];

    // 4. Monthly Physical Progress Totals
    const n = activities.length || 1;
    const monthlyPhysicalSums = Array(12).fill(0);
    activities.forEach((act) => {
      (act.physicalMonths || []).forEach((val, idx) => {
        if (idx < 12) {
          const raw = String(val || '').replace('%', '').trim();
          const num = parseFloat(raw);
          if (!isNaN(num)) monthlyPhysicalSums[idx] += num;
        }
      });
    });

    const monthlyPhysical = monthlyPhysicalSums.map((sum) => Math.round((sum / n) * 10) / 10);

    // 5. Quarterly Cumulative Physical Targets
    const q1Phys = Math.round((monthlyPhysical[0] + monthlyPhysical[1] + monthlyPhysical[2]) * 10) / 10;
    const q2Phys = Math.round((q1Phys + monthlyPhysical[3] + monthlyPhysical[4] + monthlyPhysical[5]) * 10) / 10;
    const q3Phys = Math.round((q2Phys + monthlyPhysical[6] + monthlyPhysical[7] + monthlyPhysical[8]) * 10) / 10;
    const q4Phys = activities.length > 0 ? 100 : 0;
    const quarterlyPhysical = [q1Phys, q2Phys, q3Phys, q4Phys];

    return {
      totalEstimatedCost: Math.round(totalEstimatedCost * 1000) / 1000,
      monthlyFinancial: monthlyFinancial.map((f) => Math.round(f * 1000) / 1000),
      quarterlyFinancial: quarterlyFinancial.map((f) => Math.round(f * 1000) / 1000),
      monthlyPhysical,
      quarterlyPhysical,
    };
  }, [activities]);

  // Open modal to add activity
  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormOutputNo('1');
    setFormActivityCode(String(activities.length + 1));
    setFormActivity('');
    setFormVoteNumber('-');
    setFormEstimatedCost('');
    setFormResponsibleOfficer('');
    setFormFinancialMonths(Array(12).fill(0));
    setFormPhysicalMonths(Array(12).fill('-'));
    setFormFinancialQ1(0);
    setFormFinancialQ2(0);
    setFormFinancialQ3(0);
    setFormFinancialQ4(0);
    setFormTargetQ1('-');
    setFormTargetQ2('-');
    setFormTargetQ3('-');
    setFormTargetQ4('100%');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing activity
  const handleOpenEditModal = (act: AipActivity) => {
    setEditingActivity(act);
    setFormOutputNo(act.outputNo || '1');
    setFormActivityCode(act.activityCode || '1');
    setFormActivity(act.activity || '');
    setFormVoteNumber(act.voteNumber || '-');
    setFormEstimatedCost(act.estimatedCost !== undefined && act.estimatedCost !== null ? String(act.estimatedCost) : '');
    setFormResponsibleOfficer(act.responsibleOfficer || '');

    const fin = act.financialMonths && act.financialMonths.length === 12
      ? [...act.financialMonths]
      : Array(12).fill(0);
    setFormFinancialMonths(fin);

    const phys = act.physicalMonths && act.physicalMonths.length === 12
      ? [...act.physicalMonths]
      : Array(12).fill('-');
    setFormPhysicalMonths(phys);

    setFormFinancialQ1(act.financialQ1 || 0);
    setFormFinancialQ2(act.financialQ2 || 0);
    setFormFinancialQ3(act.financialQ3 || 0);
    setFormFinancialQ4(act.financialQ4 || 0);

    setFormTargetQ1(act.targetQ1 || '-');
    setFormTargetQ2(act.targetQ2 || '-');
    setFormTargetQ3(act.targetQ3 || '-');
    setFormTargetQ4(act.targetQ4 || '100%');

    setFormError('');
    setIsModalOpen(true);
  };

  // Live calculation of quarters in the form when user updates monthly numbers
  const handleFinancialMonthChange = (monthIdx: number, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    const updated = [...formFinancialMonths];
    updated[monthIdx] = num;
    setFormFinancialMonths(updated);

    // Auto calculate cumulative quarters
    const q1 = updated[0] + updated[1] + updated[2];
    const q2 = q1 + updated[3] + updated[4] + updated[5];
    const q3 = q2 + updated[6] + updated[7] + updated[8];
    const q4 = q3 + updated[9] + updated[10] + updated[11];
    setFormFinancialQ1(Math.round(q1 * 1000) / 1000);
    setFormFinancialQ2(Math.round(q2 * 1000) / 1000);
    setFormFinancialQ3(Math.round(q3 * 1000) / 1000);
    setFormFinancialQ4(Math.round(q4 * 1000) / 1000);
  };

  const handlePhysicalMonthChange = (monthIdx: number, valStr: string) => {
    const updated = [...formPhysicalMonths];
    updated[monthIdx] = valStr;
    setFormPhysicalMonths(updated);

    // Helper to parse %
    const parseP = (v: string) => {
      const n = parseFloat(String(v || '').replace('%', '').trim());
      return isNaN(n) ? 0 : n;
    };

    const q1 = parseP(updated[0]) + parseP(updated[1]) + parseP(updated[2]);
    const q2 = q1 + parseP(updated[3]) + parseP(updated[4]) + parseP(updated[5]);
    const q3 = q2 + parseP(updated[6]) + parseP(updated[7]) + parseP(updated[8]);
    const q4 = q3 + parseP(updated[9]) + parseP(updated[10]) + parseP(updated[11]);

    if (q1 > 0) setFormTargetQ1(`${q1}%`);
    if (q2 > 0) setFormTargetQ2(`${q2}%`);
    if (q3 > 0) setFormTargetQ3(`${q3}%`);
    if (q4 > 0) setFormTargetQ4(`${q4}%`);
  };

  // Submit Activity Form (Add or Edit)
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivity.trim()) {
      setFormError('Please enter the Main Activities description.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');

      const payload = {
        id: editingActivity?.id,
        planId: plan?.id,
        year: selectedYear,
        outputNo: formOutputNo,
        activityCode: formActivityCode || String(activities.length + 1),
        activity: formActivity,
        voteNumber: formVoteNumber,
        estimatedCost: parseFloat(formEstimatedCost) || 0,
        responsibleOfficer: formResponsibleOfficer,
        financialMonths: formFinancialMonths,
        physicalMonths: formPhysicalMonths,
        financialQ1: formFinancialQ1,
        financialQ2: formFinancialQ2,
        financialQ3: formFinancialQ3,
        financialQ4: formFinancialQ4,
        targetQ1: formTargetQ1,
        targetQ2: formTargetQ2,
        targetQ3: formTargetQ3,
        targetQ4: formTargetQ4,
      };

      const res = await fetch('/api/annual-plan/activities', {
        method: editingActivity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await loadPlanData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to save activity');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error submitting activity');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to remove Activity ${code}?`)) return;

    try {
      const res = await fetch(`/api/annual-plan/activities?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadPlanData();
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
    }
  };

  // Export to CSV matching MOE Matrix
  const handleExportCSV = () => {
    const headers = [
      'Outcome/Output No',
      'Activity No',
      'Main Activities',
      'Vote Number',
      'Allocation/Estimated Cost (Mn)',
      'Target Type',
      'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
      'Q1 (Cumulative)', 'Q2 (Cumulative)', 'Q3 (Cumulative)', 'Q4 (Cumulative)',
      'Responsibility'
    ];

    const rows: string[][] = [];

    // Header info rows
    rows.push(['3. Implementation Phase']);
    rows.push([`Overall Physical and Financial Targets ${selectedYear}`]);
    rows.push([`Main responsibility: ${mainResp}`, '', '', '', '', '', `Contact No: ${mainContact}`]);
    rows.push([`Overall responsibility: ${overallResp}`, '', '', '', '', '', `Contact No: ${overallContact}`]);
    rows.push([]);
    rows.push(headers);

    // Activity rows (2 sub-rows per activity)
    activities.forEach((a) => {
      // Row 1: Financial
      rows.push([
        `"${a.outputNo}"`,
        `"${a.activityCode}"`,
        `"${(a.activity || '').replace(/"/g, '""')}"`,
        `"${a.voteNumber || '-'}"`,
        String(a.estimatedCost || '0'),
        'Financial (Rs. Mn)',
        ...(a.financialMonths || Array(12).fill(0)).map(String),
        String(a.financialQ1 || 0),
        String(a.financialQ2 || 0),
        String(a.financialQ3 || 0),
        String(a.financialQ4 || 0),
        `"${a.responsibleOfficer || ''}"`
      ]);

      // Row 2: Physical
      rows.push([
        '', '', '', '', '',
        'Physical (%)',
        ...(a.physicalMonths || Array(12).fill('-')).map((v) => `"${v}"`),
        `"${a.targetQ1 || '-'}"`,
        `"${a.targetQ2 || '-'}"`,
        `"${a.targetQ3 || '-'}"`,
        `"${a.targetQ4 || '100%'}"`,
        ''
      ]);
    });

    // Totals rows
    rows.push([
      'Total', '', '', '',
      String(totals.totalEstimatedCost),
      'Financial (Rs. Mn) Cumulative',
      ...totals.monthlyFinancial.map(String),
      ...totals.quarterlyFinancial.map(String),
      ''
    ]);
    rows.push([
      '', '', '', '', '',
      'Physical (%) Cumulative',
      ...totals.monthlyPhysical.map((p) => `${p}%`),
      ...totals.quarterlyPhysical.map((p) => `${p}%`),
      ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MOE_AIP_${selectedYear}_Official_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      <style jsx global>{`
        .aip-sheet-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .aip-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .aip-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          color: #1f2937;
        }
        .aip-table th, .aip-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: center;
          vertical-align: middle;
        }
        .aip-table th {
          background: #f8fafc;
          font-weight: 700;
          color: #374151;
        }
        .aip-table .header-maroon {
          background: #7a1c2d;
          color: #ffffff;
        }
        .aip-table .header-sub-maroon {
          background: #5a101e;
          color: #ffffff;
        }
        .aip-table .header-sub-group {
          background: #f1f5f9;
          font-weight: 700;
          color: #1e293b;
        }
        .aip-table td.text-left {
          text-align: left;
        }
        .aip-table td.text-right {
          text-align: right;
        }
        .aip-table .type-financial {
          background: #fdf2f4;
          font-weight: 600;
          color: #7a1c2d;
        }
        .aip-table .type-physical {
          background: #f0fdf4;
          font-weight: 600;
          color: #166534;
        }
        .aip-table .total-row-fin {
          background: #fef2f2;
          font-weight: 700;
          color: #991b1b;
        }
        .aip-table .total-row-phys {
          background: #f0fdf4;
          font-weight: 700;
          color: #166534;
        }
        @media print {
          .no-print { display: none !important; }
          .app-sidebar, .app-header { display: none !important; }
          body { background: #ffffff !important; }
          .aip-sheet-card { border: none !important; box-shadow: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}</style>

      <div style={{ maxWidth: '1750px', margin: '0 auto', padding: '1.25rem 1rem' }}>

        {/* ── Page Header & Controls ── */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.75rem' }}>📅</span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7a1c2d', margin: 0 }}>
                Annual Implementation Plan (AIP)
              </h1>
              {plan && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                }}>
                  {plan.status || 'Draft'}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Ministry of Education Official Format • Implementation Matrix & Quarterly Targets
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Year Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#7a1c2d',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <option value="2027">2027 (Official Reference)</option>
                <option value="2026">2026</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {plan ? (
              <>
                <button
                  onClick={handleOpenAddModal}
                  style={{
                    background: '#7a1c2d',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(122, 28, 45, 0.25)',
                  }}
                >
                  <span>➕</span> Add Activity
                </button>

                <button
                  onClick={handleExportCSV}
                  style={{
                    background: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>📥</span> Export CSV
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>🖨️</span> Print / PDF
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* ── Branch Indicator Banner ── */}
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, rgba(122, 28, 45, 0.06), rgba(90, 16, 30, 0.03))',
          borderLeft: '4px solid #7a1c2d',
          padding: '0.75rem 1.25rem',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 600 }}>Active User Branch: </span>
            <strong style={{ color: '#7a1c2d', fontSize: '0.925rem' }}>
              {branchInfo?.name || user?.organizationName || 'Information Technology and Digital Education Branch'}
            </strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
            🔒 Branch automatically identified from authenticated account
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            Loading Annual Implementation Plan...
          </div>
        ) : !plan ? (
          /* ── Empty State / Create AIP Prompt ── */
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            maxWidth: '700px',
            margin: '2rem auto',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', marginBottom: '0.5rem' }}>
              Create {selectedYear} Annual Implementation Plan
            </h2>
            <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '520px', margin: '0 auto 1.75rem auto' }}>
              No AIP has been initialized for <strong>{branchInfo?.name || 'this branch'}</strong> for year {selectedYear}.
              Click below to initialize the official Ministry of Education template.
            </p>

            <button
              onClick={handleCreateAip}
              style={{
                background: '#7a1c2d',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(122, 28, 45, 0.35)',
              }}
            >
              ✨ Create AIP ({selectedYear})
            </button>
          </div>
        ) : (
          /* ── Official AIP Sheet ── */
          <div className="aip-sheet-card">

            {/* Document Title Banner */}
            <div style={{
              background: '#7a1c2d',
              color: '#ffffff',
              padding: '1.25rem 1.5rem',
              textAlign: 'center',
              borderBottom: '2px solid #5a101e',
            }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.025em' }}>
                {plan.phaseTitle || '3. Implementation Phase'}
              </h2>
              <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.05rem', fontWeight: 600, opacity: 0.95 }}>
                {plan.targetTitle || `Overall Physical and Financial Targets ${selectedYear}`}
              </h3>
            </div>

            {/* Editable Header Meta Box (Main & Overall Responsibility) */}
            <div style={{
              background: '#f8fafc',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #cbd5e1',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}>
                {/* Main Responsibility */}
                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#7a1c2d', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Main Responsibility
                  </label>
                  <input
                    type="text"
                    value={mainResp}
                    onChange={(e) => setMainResp(e.target.value)}
                    placeholder="Enter main responsibility officer..."
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      marginBottom: '0.4rem',
                      color: '#1f2937',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Contact No:</span>
                    <input
                      type="text"
                      value={mainContact}
                      onChange={(e) => setMainContact(e.target.value)}
                      placeholder="e.g. 714929279"
                      style={{
                        flex: 1,
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        color: '#1f2937',
                      }}
                    />
                  </div>
                </div>

                {/* Overall Responsibility */}
                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#7a1c2d', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Overall Responsibility
                  </label>
                  <input
                    type="text"
                    value={overallResp}
                    onChange={(e) => setOverallResp(e.target.value)}
                    placeholder="Enter overall responsibility director..."
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      marginBottom: '0.4rem',
                      color: '#1f2937',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Contact No:</span>
                    <input
                      type="text"
                      value={overallContact}
                      onChange={(e) => setOverallContact(e.target.value)}
                      placeholder="e.g. 714325568"
                      style={{
                        flex: 1,
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        color: '#1f2937',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Save header button */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', alignItems: 'center', gap: '0.75rem' }}>
                {headerSavedSuccess && (
                  <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                    ✅ Responsibilities saved successfully
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveHeaderFields}
                  disabled={isSavingHeader}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #7a1c2d',
                    color: '#7a1c2d',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingHeader ? 'Saving...' : '💾 Save Responsibility Details'}
                </button>
              </div>
            </div>

            {/* Official AIP Matrix Table */}
            <div className="aip-table-wrapper">
              <table className="aip-table">
                <thead>
                  {/* Top Header Row */}
                  <tr>
                    <th rowSpan={2} style={{ width: '60px' }}>Outcome / Output No</th>
                    <th rowSpan={2} style={{ width: '55px' }}>Activity No</th>
                    <th rowSpan={2} style={{ minWidth: '280px', maxWidth: '380px' }}>Main Activities</th>
                    <th rowSpan={2} style={{ width: '130px' }}>Vote Number</th>
                    <th rowSpan={2} style={{ width: '90px' }}>Allocation / Estimated Cost (Mn)</th>
                    <th rowSpan={2} style={{ width: '115px' }}>Target Type</th>
                    <th colSpan={12} className="header-sub-group">
                      January to December - Monthly basis (Non-Cumulative)
                    </th>
                    <th colSpan={4} className="header-sub-group" style={{ background: '#fef3c7', color: '#92400e' }}>
                      Q1 to Q4 - Quarterly basis (Cumulative)
                    </th>
                    <th rowSpan={2} style={{ minWidth: '180px' }}>Responsibility</th>
                    <th rowSpan={2} className="no-print" style={{ width: '80px' }}>Actions</th>
                  </tr>

                  {/* Sub Header Months & Quarters */}
                  <tr>
                    {MONTH_NAMES_SHORT.map((m, i) => (
                      <th key={`m-${i}`} style={{ width: '38px', fontSize: '0.75rem' }}>
                        {m}
                      </th>
                    ))}
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q1</th>
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q2</th>
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q3</th>
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q4</th>
                  </tr>
                </thead>

                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={24} style={{ padding: '3rem 1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                        No activities added yet. Click <strong>"➕ Add Activity"</strong> to insert your first activity.
                      </td>
                    </tr>
                  ) : (
                    activities.map((act) => {
                      const finMonths = act.financialMonths || Array(12).fill(0);
                      const physMonths = act.physicalMonths || Array(12).fill('-');

                      return (
                        <React.Fragment key={act.id}>
                          {/* Sub-row 1: Financial */}
                          <tr>
                            <td rowSpan={2} style={{ fontWeight: 700 }}>{act.outputNo || '-'}</td>
                            <td rowSpan={2} style={{ fontWeight: 700 }}>{act.activityCode}</td>
                            <td rowSpan={2} className="text-left" style={{ lineHeight: '1.4' }}>
                              {act.activity}
                            </td>
                            <td rowSpan={2} style={{ fontSize: '0.75rem' }}>{act.voteNumber || '-'}</td>
                            <td rowSpan={2} className="text-right" style={{ fontWeight: 700 }}>
                              {act.estimatedCost !== undefined && act.estimatedCost !== 0
                                ? Number(act.estimatedCost).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 })
                                : '-'}
                            </td>

                            {/* Sub-row 1 Label: Financial */}
                            <td className="type-financial">Financial (Rs. Mn)</td>

                            {/* 12 Months Financial */}
                            {finMonths.map((val, mIdx) => (
                              <td key={`fin-${act.id}-${mIdx}`} style={{ fontSize: '0.75rem' }}>
                                {Number(val) !== 0 ? Number(val) : 0}
                              </td>
                            ))}

                            {/* Cumulative Quarters Financial */}
                            <td style={{ background: '#fef9c3', fontWeight: 600 }}>{act.financialQ1 || 0}</td>
                            <td style={{ background: '#fef9c3', fontWeight: 600 }}>{act.financialQ2 || 0}</td>
                            <td style={{ background: '#fef9c3', fontWeight: 600 }}>{act.financialQ3 || 0}</td>
                            <td style={{ background: '#fef9c3', fontWeight: 700, color: '#7a1c2d' }}>{act.financialQ4 || 0}</td>

                            <td rowSpan={2} className="text-left" style={{ fontSize: '0.78rem', lineHeight: '1.3' }}>
                              {act.responsibleOfficer || '-'}
                            </td>

                            {/* Action Buttons */}
                            <td rowSpan={2} className="no-print">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(act)}
                                  style={{
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    color: '#1e293b',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteActivity(act.id, act.activityCode)}
                                  style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  🗑️ Del
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Sub-row 2: Physical */}
                          <tr>
                            <td className="type-physical">Physical (%)</td>

                            {/* 12 Months Physical */}
                            {physMonths.map((val, mIdx) => (
                              <td key={`phys-${act.id}-${mIdx}`} style={{ fontSize: '0.75rem' }}>
                                {val || '-'}
                              </td>
                            ))}

                            {/* Cumulative Quarters Physical */}
                            <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{act.targetQ1 || '-'}</td>
                            <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{act.targetQ2 || '-'}</td>
                            <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{act.targetQ3 || '-'}</td>
                            <td style={{ background: '#f0fdf4', fontWeight: 700, color: '#166534' }}>{act.targetQ4 || '100%'}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>

                {/* ── Total Rows ── */}
                {activities.length > 0 && (
                  <tfoot>
                    {/* Financial Cumulative Total Row */}
                    <tr className="total-row-fin">
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', paddingRight: '1rem' }}>
                        Total
                      </td>
                      <td className="text-right" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        {totals.totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                      </td>
                      <td style={{ fontWeight: 700 }}>Financial (Rs. Mn) Cumulative</td>

                      {/* Monthly financial totals */}
                      {totals.monthlyFinancial.map((mVal, idx) => (
                        <td key={`tot-fin-${idx}`} style={{ fontWeight: 700 }}>
                          {mVal !== 0 ? mVal : 0}
                        </td>
                      ))}

                      {/* Cumulative quarterly financial totals */}
                      {totals.quarterlyFinancial.map((qVal, idx) => (
                        <td key={`tot-qfin-${idx}`} style={{ fontWeight: 800, background: '#fee2e2' }}>
                          {qVal}
                        </td>
                      ))}

                      <td></td>
                      <td className="no-print"></td>
                    </tr>

                    {/* Physical Cumulative Total Row */}
                    <tr className="total-row-phys">
                      <td colSpan={4}></td>
                      <td></td>
                      <td style={{ fontWeight: 700 }}>Physical (%) Cumulative</td>

                      {/* Monthly physical average contribution */}
                      {totals.monthlyPhysical.map((pVal, idx) => (
                        <td key={`tot-phys-${idx}`} style={{ fontWeight: 700 }}>
                          {pVal}%
                        </td>
                      ))}

                      {/* Cumulative quarterly physical totals */}
                      {totals.quarterlyPhysical.map((qVal, idx) => (
                        <td key={`tot-qphys-${idx}`} style={{ fontWeight: 800, background: '#dcfce7' }}>
                          {qVal}%
                        </td>
                      ))}

                      <td></td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Add / Edit Activity Modal Form ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#7a1c2d',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {editingActivity ? `✏️ Edit Activity (Code: ${editingActivity.activityCode})` : '➕ Add Activity (Official MOE Format)'}
                </h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  {selectedYear} Annual Implementation Plan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveActivity} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

                {formError && (
                  <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px', color: '#991b1b', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}

                {/* Section 1: Identification & Basic Info */}
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#7a1c2d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Activity Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Outcome / Output No
                    </label>
                    <input
                      type="text"
                      value={formOutputNo}
                      onChange={(e) => setFormOutputNo(e.target.value)}
                      placeholder="e.g. 1"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Activity No <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formActivityCode}
                      onChange={(e) => setFormActivityCode(e.target.value)}
                      placeholder="e.g. 1"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Vote Number
                    </label>
                    <input
                      type="text"
                      value={formVoteNumber}
                      onChange={(e) => setFormVoteNumber(e.target.value)}
                      placeholder="e.g. 126-01-2-0-2401 or -"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Allocation / Cost (Rs. Mn)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formEstimatedCost}
                      onChange={(e) => setFormEstimatedCost(e.target.value)}
                      placeholder="e.g. 80.0 or 0.2"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                    Main Activities Description <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formActivity}
                    onChange={(e) => setFormActivity(e.target.value)}
                    placeholder="Enter detailed activity description..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                    Responsibility per Activity
                  </label>
                  <input
                    type="text"
                    value={formResponsibleOfficer}
                    onChange={(e) => setFormResponsibleOfficer(e.target.value)}
                    placeholder="e.g. Mrs. H.A.S.P. Senarathne (DDE) or Mrs. E.T.W. Silva (AD-ICT)"
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Section 2: Monthly Financial & Physical Targets */}
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7a1c2d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Monthly Targets (January – December)
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  Enter monthly non-cumulative financial and physical targets. Quarters are calculated cumulatively automatically.
                </p>

                <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left', width: '140px' }}>Target Type</th>
                        {MONTH_NAMES_SHORT.map((m, idx) => (
                          <th key={`hd-${idx}`} style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '60px' }}>
                            {m} ({idx + 1})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Financial Months Input */}
                      <tr>
                        <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#fdf2f4', color: '#7a1c2d' }}>
                          Financial (Rs. Mn)
                        </td>
                        {formFinancialMonths.map((val, idx) => (
                          <td key={`inp-fin-${idx}`} style={{ padding: '3px', border: '1px solid #cbd5e1' }}>
                            <input
                              type="number"
                              step="any"
                              value={val === 0 ? '' : val}
                              placeholder="0"
                              onChange={(e) => handleFinancialMonthChange(idx, e.target.value)}
                              style={{ width: '100%', padding: '3px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem' }}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Physical Months Input */}
                      <tr>
                        <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#f0fdf4', color: '#166534' }}>
                          Physical (%)
                        </td>
                        {formPhysicalMonths.map((val, idx) => (
                          <td key={`inp-phys-${idx}`} style={{ padding: '3px', border: '1px solid #cbd5e1' }}>
                            <input
                              type="text"
                              value={val === '-' ? '' : val}
                              placeholder="-"
                              onChange={(e) => handlePhysicalMonthChange(idx, e.target.value)}
                              style={{ width: '100%', padding: '3px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem' }}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Cumulative Quarterly Targets */}
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7a1c2d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  3. Quarterly Cumulative Targets (Q1 – Q4)
                </h4>
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                      Financial Quarters (Cumulative)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q1</span>
                        <input
                          type="number"
                          step="any"
                          value={formFinancialQ1}
                          onChange={(e) => setFormFinancialQ1(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q2</span>
                        <input
                          type="number"
                          step="any"
                          value={formFinancialQ2}
                          onChange={(e) => setFormFinancialQ2(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q3</span>
                        <input
                          type="number"
                          step="any"
                          value={formFinancialQ3}
                          onChange={(e) => setFormFinancialQ3(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q4</span>
                        <input
                          type="number"
                          step="any"
                          value={formFinancialQ4}
                          onChange={(e) => setFormFinancialQ4(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                      Physical Quarters (Cumulative %)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q1</span>
                        <input
                          type="text"
                          value={formTargetQ1}
                          onChange={(e) => setFormTargetQ1(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q2</span>
                        <input
                          type="text"
                          value={formTargetQ2}
                          onChange={(e) => setFormTargetQ2(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q3</span>
                        <input
                          type="text"
                          value={formTargetQ3}
                          onChange={(e) => setFormTargetQ3(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q4</span>
                        <input
                          type="text"
                          value={formTargetQ4}
                          onChange={(e) => setFormTargetQ4(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                background: '#f8fafc',
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#4b5563',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    background: '#7a1c2d',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingActivity ? 'Update Activity' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppShell>
  );
}

