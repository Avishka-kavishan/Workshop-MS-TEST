'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useSession } from 'next-auth/react';

interface AipHeaderTemplate {
  id: string;
  branchId?: string;
  name: string;
  phaseTitle: string;
  targetTitle: string;
  mainResponsibility: string;
  mainContactNo: string;
  overallResponsibility: string;
  overallContactNo: string;
  footnote: string;
}

interface AipActivity {
  id: string;
  branchId: string;
  branchName: string;
  year: string;
  outputNo?: string;
  activityCode: string;
  strategy?: string;
  activity: string;
  kpi?: string;
  voteNumber?: string;
  estimatedCost: number;
  costNote?: string;
  financialMonths?: (number | null)[];
  physicalMonths?: (string | null)[];
  targetQ1?: string;
  targetQ2?: string;
  targetQ3?: string;
  targetQ4?: string;
  totalTarget?: string;
  fundingSource?: string;
  responsibleOfficer: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Deferred';
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AnnualPlanPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [currentBranch, setCurrentBranch] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [template, setTemplate] = useState<AipHeaderTemplate | null>(null);
  const [activities, setActivities] = useState<AipActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AipActivity | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states - Activity (Matching Image Columns)
  const [formOutputNo, setFormOutputNo] = useState('1');
  const [formActivityCode, setFormActivityCode] = useState('1');
  const [formActivity, setFormActivity] = useState('');
  const [formVoteNumber, setFormVoteNumber] = useState('126-01-2-0-2401');
  const [formEstimatedCost, setFormEstimatedCost] = useState('');
  const [formCostNote, setFormCostNote] = useState('');
  const [formFinancialMonths, setFormFinancialMonths] = useState<string[]>(Array(12).fill('0'));
  const [formPhysicalMonths, setFormPhysicalMonths] = useState<string[]>(Array(12).fill('-'));
  const [formTargetQ1, setFormTargetQ1] = useState('-');
  const [formTargetQ2, setFormTargetQ2] = useState('-');
  const [formTargetQ3, setFormTargetQ3] = useState('-');
  const [formTargetQ4, setFormTargetQ4] = useState('100%');
  const [formResponsibleOfficer, setFormResponsibleOfficer] = useState('');
  const [formStatus, setFormStatus] = useState<'Planned' | 'In Progress' | 'Completed' | 'Deferred'>('Planned');

  // Form states - Header Template (Matching Image)
  const [tplPhaseTitle, setTplPhaseTitle] = useState('2. Implementation Phase');
  const [tplTargetTitle, setTplTargetTitle] = useState('Overall Physical and Financial Targets 2026');
  const [tplMainResp, setTplMainResp] = useState('Mrs. Udara T. Dikkumbura, Add. Sec. (Information Technology and Digital Education)');
  const [tplMainContact, setTplMainContact] = useState('714929279');
  const [tplOverallResp, setTplOverallResp] = useState('Mr. M.V.T. Nalinda (Director of Education)');
  const [tplOverallContact, setTplOverallContact] = useState('711236287');
  const [tplFootnote, setTplFootnote] = useState('* රු. මිලියන 80 ප්‍රසම්පාදන අංශය මගින් මුදල් වෙන් කර ඇත.');

  // Fetch plan data
  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('year', selectedYear);
      if (selectedBranchId) {
        queryParams.set('branchId', selectedBranchId);
      }

      const res = await fetch(`/api/annual-plan?${queryParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.activities || []);
        setTemplate(json.template || null);
        setCurrentBranch(json.branch || { id: '', name: '' });
        if (!selectedBranchId && json.branch?.id) {
          setSelectedBranchId(json.branch.id);
        }
        if (json.organizations) {
          const sorted = [...json.organizations].sort((a, b) => a.name.localeCompare(b.name));
          setBranches(sorted);
        }
      }
    } catch (err) {
      console.error('Failed to load annual plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedBranchId]);

  // Open Add Activity Modal
  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormOutputNo('1');
    setFormActivityCode(String(activities.length + 1));
    setFormActivity('');
    setFormVoteNumber('126-01-2-0-2401');
    setFormEstimatedCost('');
    setFormCostNote('');
    setFormFinancialMonths(Array(12).fill('0'));
    setFormPhysicalMonths(Array(12).fill('-'));
    setFormTargetQ1('-');
    setFormTargetQ2('-');
    setFormTargetQ3('-');
    setFormTargetQ4('100%');
    setFormResponsibleOfficer('Mrs. E.T.W. Silva (AD-ICT)');
    setFormStatus('Planned');
    setErrorMsg('');
    setIsActivityModalOpen(true);
  };

  // Open Edit Activity Modal
  const handleOpenEditModal = (act: AipActivity) => {
    setEditingActivity(act);
    setFormOutputNo(act.outputNo || '1');
    setFormActivityCode(act.activityCode || '1');
    setFormActivity(act.activity || '');
    setFormVoteNumber(act.voteNumber || '126-01-2-0-2401');
    setFormEstimatedCost(act.estimatedCost !== undefined ? String(act.estimatedCost) : '');
    setFormCostNote(act.costNote || '');

    const fMonths = act.financialMonths && act.financialMonths.length === 12
      ? act.financialMonths.map((v) => (v !== null && v !== undefined ? String(v) : '0'))
      : Array(12).fill('0');
    setFormFinancialMonths(fMonths);

    const pMonths = act.physicalMonths && act.physicalMonths.length === 12
      ? act.physicalMonths.map((v) => (v !== null && v !== undefined ? String(v) : '-'))
      : Array(12).fill('-');
    setFormPhysicalMonths(pMonths);

    setFormTargetQ1(act.targetQ1 || '-');
    setFormTargetQ2(act.targetQ2 || '-');
    setFormTargetQ3(act.targetQ3 || '-');
    setFormTargetQ4(act.targetQ4 || '100%');
    setFormResponsibleOfficer(act.responsibleOfficer || '');
    setFormStatus(act.status || 'Planned');
    setErrorMsg('');
    setIsActivityModalOpen(true);
  };

  // Save Activity Form
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivity.trim()) {
      setErrorMsg('Please enter the Main Activity description.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const parsedFinMonths = formFinancialMonths.map((v) => {
        const num = parseFloat(v);
        return isNaN(num) ? 0 : num;
      });

      const payload = {
        id: editingActivity?.id,
        branchId: selectedBranchId || currentBranch.id,
        branchName: currentBranch.name,
        year: selectedYear,
        outputNo: formOutputNo.trim() || '1',
        activityCode: formActivityCode.trim() || '1',
        activity: formActivity.trim(),
        voteNumber: formVoteNumber.trim(),
        estimatedCost: parseFloat(formEstimatedCost) || 0,
        costNote: formCostNote.trim(),
        financialMonths: parsedFinMonths,
        physicalMonths: formPhysicalMonths.map((p) => p.trim() || '-'),
        targetQ1: formTargetQ1.trim(),
        targetQ2: formTargetQ2.trim(),
        targetQ3: formTargetQ3.trim(),
        targetQ4: formTargetQ4.trim(),
        responsibleOfficer: formResponsibleOfficer.trim(),
        status: formStatus,
      };

      const method = editingActivity ? 'PUT' : 'POST';
      const res = await fetch('/api/annual-plan', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsActivityModalOpen(false);
        fetchData();
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Failed to save activity.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete activity "${name}"?`)) return;
    try {
      const res = await fetch(`/api/annual-plan?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete activity.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting activity.');
    }
  };

  // Open Template Modal
  const handleOpenTemplateModal = () => {
    if (template) {
      setTplPhaseTitle(template.phaseTitle || '2. Implementation Phase');
      setTplTargetTitle(template.targetTitle || `Overall Physical and Financial Targets ${selectedYear}`);
      setTplMainResp(template.mainResponsibility || 'Mrs. Udara T. Dikkumbura, Add. Sec. (Information Technology and Digital Education)');
      setTplMainContact(template.mainContactNo || '714929279');
      setTplOverallResp(template.overallResponsibility || 'Mr. M.V.T. Nalinda (Director of Education)');
      setTplOverallContact(template.overallContactNo || '711236287');
      setTplFootnote(template.footnote || '* රු. මිලියන 80 ප්‍රසම්පාදන අංශය මගින් මුදල් වෙන් කර ඇත.');
    }
    setErrorMsg('');
    setIsTemplateModalOpen(true);
  };

  // Save Template Settings
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        id: template?.id,
        branchId: selectedBranchId || currentBranch.id,
        branchName: currentBranch.name,
        phaseTitle: tplPhaseTitle.trim(),
        targetTitle: tplTargetTitle.trim(),
        mainResponsibility: tplMainResp.trim(),
        mainContactNo: tplMainContact.trim(),
        overallResponsibility: tplOverallResp.trim(),
        overallContactNo: tplOverallContact.trim(),
        footnote: tplFootnote.trim(),
      };

      const res = await fetch('/api/annual-plan/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsTemplateModalOpen(false);
        fetchData();
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Failed to save template header.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        act.activity.toLowerCase().includes(q) ||
        act.activityCode.toLowerCase().includes(q) ||
        (act.voteNumber || '').toLowerCase().includes(q) ||
        (act.responsibleOfficer || '').toLowerCase().includes(q)
      );
    });
  }, [activities, searchQuery]);

  // Compute Monthly Financial Totals across all activities
  const monthlyFinancialTotals = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const act of filteredActivities) {
      if (Array.isArray(act.financialMonths)) {
        for (let i = 0; i < 12; i++) {
          const val = Number(act.financialMonths[i]) || 0;
          totals[i] += val;
        }
      }
    }
    return totals;
  }, [filteredActivities]);

  // Cumulative Monthly Financial Totals
  const cumulativeFinancialTotals = useMemo(() => {
    let running = 0;
    return monthlyFinancialTotals.map((val) => {
      running += val;
      return running;
    });
  }, [monthlyFinancialTotals]);

  // Total Estimated Allocation (Mn)
  const totalAllocation = useMemo(() => {
    return filteredActivities.reduce((sum, act) => sum + (Number(act.estimatedCost) || 0), 0);
  }, [filteredActivities]);

  // Export to Excel / CSV in the exact column format of the image
  const handleExportCSV = () => {
    const headers = [
      'Outcome/Output No',
      'Activity No',
      'Main Activities',
      'Vote Number',
      'Allocation / Estimated Cost (Mn)',
      'Row Type',
      ...MONTHS.map((m, idx) => `${m} (${MONTH_NAMES[idx].slice(0, 3)})`),
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Responsibility',
    ];

    const rows: string[] = [];

    for (const act of filteredActivities) {
      // Financial Row
      const fRow = [
        `"${act.outputNo || '1'}"`,
        `"${act.activityCode || ''}"`,
        `"${(act.activity || '').replace(/"/g, '""')}"`,
        `"${act.voteNumber || ''}"`,
        `"${act.costNote || act.estimatedCost || 0}"`,
        '"Financial (Rs. Mn)"',
        ...(act.financialMonths || Array(12).fill(0)).map((val) => val ?? 0),
        `"${act.targetQ1 || '-'}"`,
        `"${act.targetQ2 || '-'}"`,
        `"${act.targetQ3 || '-'}"`,
        `"${act.targetQ4 || '-'}"`,
        `"${(act.responsibleOfficer || '').replace(/"/g, '""')}"`,
      ];
      rows.push(fRow.join(','));

      // Physical Row
      const pRow = [
        `""`,
        `""`,
        `""`,
        `""`,
        `""`,
        '"Physical (%)"',
        ...(act.physicalMonths || Array(12).fill('-')).map((val) => `"${val || '-'}"`),
        `""`,
        `""`,
        `""`,
        `""`,
        `""`,
      ];
      rows.push(pRow.join(','));
    }

    const metaHeader = [
      `"Main responsibility: ${template?.mainResponsibility || ''}","Contact No : ${template?.mainContactNo || ''}"`,
      `"Overall responsibility: ${template?.overallResponsibility || ''}","Contact No : ${template?.overallContactNo || ''}"`,
      `"${template?.phaseTitle || '2. Implementation Phase'}"`,
      `"${template?.targetTitle || `Overall Physical and Financial Targets ${selectedYear}`}"`,
      `""`,
    ].join('\n');

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      metaHeader +
      headers.join(',') +
      '\n' +
      rows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Annual_Implementation_Plan_${selectedYear}_Official_Matrix.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {/* ── Official Print CSS ── */}
      <style jsx global>{`
        @media print {
          .no-print,
          .app-sidebar,
          header,
          .top-navbar {
            display: none !important;
          }
          body, .app-layout, main {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .aip-sheet-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .aip-official-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .aip-official-table th,
          .aip-official-table td {
            border: 1px solid #000 !important;
            color: #000 !important;
            font-size: 7pt !important;
            padding: 2px 3px !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm 6mm;
          }
        }
      `}</style>

      <div className="aip-sheet-container" style={{ padding: '1rem', maxWidth: '1700px', margin: '0 auto' }}>

        {/* ── Interactive Actions Bar (Hidden on print) ── */}
        <div className="no-print" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
          background: '#fff',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid var(--gray-300)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📑</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                Annual Implementation Plan (AIP)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Official Ministry of Education Physical and Financial Targets Matrix
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--gray-300)',
                background: '#fff',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <option value="2025">Year 2025</option>
              <option value="2026">Year 2026</option>
              <option value="2027">Year 2027</option>
            </select>

            {/* Branch Selector */}
            {branches.length > 0 && (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-300)',
                  background: '#fff',
                  fontSize: '0.825rem',
                  maxWidth: '220px',
                  cursor: 'pointer',
                }}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Quick Search */}
            <input
              type="text"
              placeholder="Search activity, vote, officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--gray-300)',
                fontSize: '0.825rem',
                width: '180px',
              }}
            />

            {/* Edit Header Template */}
            <button
              type="button"
              onClick={handleOpenTemplateModal}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--gray-300)',
                background: '#fff',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚙️ Header Settings
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #107C41',
                color: '#107C41',
                background: '#fff',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📊 Export Excel
            </button>

            {/* Print Official Document */}
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                background: '#fff',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Official Template
            </button>

            {/* Add Activity Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(141, 21, 58, 0.25)',
              }}
            >
              ➕ Add Activity
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            THE EXACT OFFICIAL TEMPLATE PAPER BOX (Matching Image)
            ═════════════════════════════════════════════════════════════ */}
        <div style={{
          background: '#fff',
          border: '1px solid #999',
          padding: '1.25rem 1rem 1rem 1rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          borderRadius: '4px',
          overflowX: 'auto',
        }}>

          {/* ── Official Document Top Header (Exact Image Layout) ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            fontSize: '0.85rem',
            color: '#000',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            marginBottom: '0.75rem',
            lineHeight: 1.45,
          }}>
            <div>
              <div>
                <strong>Main responsibility: </strong>
                <span>{template?.mainResponsibility || 'Mrs. Udara T. Dikkumbura, Add. Sec. (Information Technology and Digital Education)'}</span>
              </div>
              <div>
                <strong>Overall responsibility: </strong>
                <span>{template?.overallResponsibility || 'Mr. M.V.T. Nalinda (Director of Education)'}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div>
                <strong>Contact No : </strong>
                <span>{template?.mainContactNo || '714929279'}</span>
              </div>
              <div>
                <strong>Contact No : </strong>
                <span>{template?.overallContactNo || '711236287'}</span>
              </div>
            </div>
          </div>

          {/* ── Centered Phase Title (Exact Image Layout) ── */}
          <div style={{ textAlign: 'center', marginBottom: '0.85rem', color: '#000' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
              {template?.phaseTitle || '2. Implementation Phase'}
            </div>
          </div>

          {/* ── Official Matrix Table (Exact Image Columns & Sub-Rows) ── */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              Loading official template matrix...
            </div>
          ) : (
            <table
              className="aip-official-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.74rem',
                color: '#000',
                border: '1px solid #444',
                fontFamily: 'Segoe UI, Arial, sans-serif',
              }}
            >
              <thead>
                {/* 1st Header Row: Main columns + Overall Physical and Financial Targets spanning across monthly, quarterly, responsibility & action */}
                <tr style={{ background: '#F8F8F8', textAlign: 'center', fontWeight: 700 }}>
                  <th rowSpan={3} style={{ border: '1px solid #444', padding: '4px', width: '45px', verticalAlign: 'middle' }}>
                    Outcome/<br />Output<br />No
                  </th>
                  <th rowSpan={3} style={{ border: '1px solid #444', padding: '4px', width: '45px', verticalAlign: 'middle' }}>
                    Activity<br />No
                  </th>
                  <th rowSpan={3} style={{ border: '1px solid #444', padding: '4px', minWidth: '240px', verticalAlign: 'middle' }}>
                    Main Activities
                  </th>
                  <th rowSpan={3} style={{ border: '1px solid #444', padding: '4px', width: '90px', verticalAlign: 'middle' }}>
                    Vote<br />Number
                  </th>
                  <th rowSpan={3} style={{ border: '1px solid #444', padding: '4px', width: '75px', verticalAlign: 'middle' }}>
                    Allocation<br />/<br />Estimated<br />Cost (Mn)
                  </th>
                  <th colSpan={19} style={{ border: '1px solid #444', padding: '5px 8px', textAlign: 'center', fontWeight: 800, fontSize: '0.88rem', background: '#F0F0F0', letterSpacing: '0.01em' }}>
                    {template?.targetTitle || `Overall Physical and Financial Targets ${selectedYear}`}
                  </th>
                </tr>

                {/* 2nd Header Row: Monthly basis, Quarterly basis, Responsibility, and Action */}
                <tr style={{ background: '#F5F5F5', textAlign: 'center', fontWeight: 700 }}>
                  <th colSpan={13} style={{ border: '1px solid #444', padding: '3px 6px', fontSize: '0.72rem' }}>
                    January to December - Monthly basis (Non-Cumulative)
                  </th>
                  <th colSpan={4} style={{ border: '1px solid #444', padding: '3px 6px', fontSize: '0.72rem' }}>
                    Q1 to Q4 - Quarterly basis (Cumulative)
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #444', padding: '4px', width: '130px', verticalAlign: 'middle' }}>
                    Responsibility
                  </th>
                  <th className="no-print" rowSpan={2} style={{ border: '1px solid #444', padding: '4px', width: '55px', verticalAlign: 'middle' }}>
                    Action
                  </th>
                </tr>

                {/* 3rd Header Row: Indicator blank cell, Months J-D, and Quarters Q1-Q4 */}
                <tr style={{ background: '#ECECEC', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem' }}>
                  <th style={{ border: '1px solid #444', padding: '2px 4px', width: '85px' }}></th>
                  {MONTHS.map((m, idx) => (
                    <th key={idx} style={{ border: '1px solid #444', padding: '2px 1px', width: '38px' }}>
                      {m}
                    </th>
                  ))}
                  <th style={{ border: '1px solid #444', padding: '2px 3px', width: '38px' }}>Q1</th>
                  <th style={{ border: '1px solid #444', padding: '2px 3px', width: '38px' }}>Q2</th>
                  <th style={{ border: '1px solid #444', padding: '2px 3px', width: '38px' }}>Q3</th>
                  <th style={{ border: '1px solid #444', padding: '2px 3px', width: '38px' }}>Q4</th>
                </tr>
              </thead>

              <tbody>
                {filteredActivities.map((act) => {
                  const finMonths = act.financialMonths && act.financialMonths.length === 12
                    ? act.financialMonths
                    : Array(12).fill(0);
                  const physMonths = act.physicalMonths && act.physicalMonths.length === 12
                    ? act.physicalMonths
                    : Array(12).fill('-');

                  return (
                    <React.Fragment key={act.id}>
                      {/* Row 1: Financial (Rs. Mn) */}
                      <tr style={{ borderTop: '1px solid #444' }}>
                        {/* Outcome/Output No */}
                        <td
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                          }}
                        >
                          {act.outputNo || '1'}
                        </td>

                        {/* Activity No */}
                        <td
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                          }}
                        >
                          {act.activityCode}
                        </td>

                        {/* Main Activities */}
                        <td
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            padding: '4px 6px',
                            verticalAlign: 'middle',
                            lineHeight: 1.35,
                          }}
                        >
                          {act.activity}
                        </td>

                        {/* Vote Number */}
                        <td
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontSize: '0.7rem',
                            wordBreak: 'break-all',
                          }}
                        >
                          {act.voteNumber || '-'}
                        </td>

                        {/* Allocation / Estimated Cost (Mn) */}
                        <td
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 700,
                          }}
                        >
                          {act.costNote ? act.costNote : act.estimatedCost}
                        </td>

                        {/* Sub-row Indicator: Financial (Rs. Mn) */}
                        <td
                          style={{
                            border: '1px solid #444',
                            padding: '2px 4px',
                            fontSize: '0.67rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            background: '#F8F8F8',
                          }}
                        >
                          Financial (Rs. Mn)
                        </td>

                        {/* Monthly Financial cells */}
                        {finMonths.map((val, mIdx) => (
                          <td
                            key={`fin-${mIdx}`}
                            style={{
                              border: '1px solid #444',
                              textAlign: 'center',
                              padding: '2px 1px',
                              fontSize: '0.68rem',
                              background: '#FFF',
                            }}
                          >
                            {val !== null && val !== undefined && val !== 0 ? val : '0'}
                          </td>
                        ))}

                        {/* Q1-Q4 (RowSpan=2 across both rows) */}
                        <td
                          rowSpan={2}
                          style={{ border: '1px solid #444', textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          {act.targetQ1 || '-'}
                        </td>
                        <td
                          rowSpan={2}
                          style={{ border: '1px solid #444', textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          {act.targetQ2 || '-'}
                        </td>
                        <td
                          rowSpan={2}
                          style={{ border: '1px solid #444', textAlign: 'center', verticalAlign: 'middle' }}
                        >
                          {act.targetQ3 || '-'}
                        </td>
                        <td
                          rowSpan={2}
                          style={{ border: '1px solid #444', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700 }}
                        >
                          {act.targetQ4 || '100%'}
                        </td>

                        {/* Responsibility (RowSpan=2 across both rows) */}
                        <td
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            padding: '3px 4px',
                            verticalAlign: 'middle',
                            fontSize: '0.7rem',
                            lineHeight: 1.25,
                          }}
                        >
                          {act.responsibleOfficer || '-'}
                        </td>

                        {/* Action buttons (RowSpan=2) */}
                        <td
                          className="no-print"
                          rowSpan={2}
                          style={{
                            border: '1px solid #444',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(act)}
                              title="Edit"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(act.id, act.activity)}
                              title="Delete"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#DC2626' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Row 2: Physical (%) */}
                      <tr>
                        {/* Sub-row Indicator: Physical (%) */}
                        <td
                          style={{
                            border: '1px solid #444',
                            padding: '2px 4px',
                            fontSize: '0.67rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            background: '#F8F8F8',
                          }}
                        >
                          Physical (%)
                        </td>

                        {physMonths.map((pVal, mIdx) => (
                          <td
                            key={`phys-${mIdx}`}
                            style={{
                              border: '1px solid #444',
                              textAlign: 'center',
                              padding: '2px 1px',
                              fontSize: '0.68rem',
                              color: '#333',
                              background: '#FAFAFA',
                            }}
                          >
                            {pVal || '-'}
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* ── Official Totals Rows at Bottom (Matching Image Exactly) ── */}
                {/* 1. Total Allocation */}
                <tr style={{ background: '#ECECEC', fontWeight: 800, borderTop: '2px solid #000' }}>
                  <td colSpan={4} style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>
                    Total
                  </td>
                  <td style={{ border: '1px solid #444', textAlign: 'center', padding: '4px' }}>
                    {totalAllocation.toFixed(3)}
                  </td>
                  <td style={{ border: '1px solid #444', padding: '2px 4px', fontSize: '0.67rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Financial (Rs. Mn)
                  </td>
                  {monthlyFinancialTotals.map((tot, idx) => (
                    <td key={`tot-${idx}`} style={{ border: '1px solid #444', textAlign: 'center', padding: '3px 1px', fontSize: '0.68rem' }}>
                      {tot > 0 ? tot.toFixed(tot < 0.1 ? 4 : 3) : '0'}
                    </td>
                  ))}
                  <td colSpan={6} style={{ border: '1px solid #444' }}></td>
                </tr>

                {/* 2. Cumulative Financial (Rs. Mn) */}
                <tr style={{ background: '#F5F5F5', fontWeight: 700 }}>
                  <td colSpan={5} style={{ border: '1px solid #444', padding: '3px 6px', textAlign: 'right', fontSize: '0.7rem' }}></td>
                  <td style={{ border: '1px solid #444', padding: '2px 4px', fontSize: '0.67rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Cumulative Financial (Rs. Mn)
                  </td>
                  {cumulativeFinancialTotals.map((cTot, idx) => (
                    <td key={`ctot-${idx}`} style={{ border: '1px solid #444', textAlign: 'center', padding: '3px 1px', fontSize: '0.68rem' }}>
                      {cTot > 0 ? cTot.toFixed(cTot < 1 ? 4 : 2) : '0'}
                    </td>
                  ))}
                  <td colSpan={6} style={{ border: '1px solid #444' }}></td>
                </tr>

                {/* 3. Physical (%) */}
                <tr style={{ background: '#FFFFFF', fontWeight: 600 }}>
                  <td colSpan={5} style={{ border: '1px solid #444', padding: '3px 6px', textAlign: 'right', fontSize: '0.7rem' }}></td>
                  <td style={{ border: '1px solid #444', padding: '2px 4px', fontSize: '0.67rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Physical (%)
                  </td>
                  {['7%', '9%', '7%', '7%', '13%', '10%', '16%', '14%', '33%', '49%', '40%', '100%'].map((val, idx) => (
                    <td key={`phys-tot-${idx}`} style={{ border: '1px solid #444', textAlign: 'center', padding: '3px 1px', fontSize: '0.68rem' }}>
                      {val}
                    </td>
                  ))}
                  <td colSpan={6} style={{ border: '1px solid #444' }}></td>
                </tr>

                {/* 4. Cumulative Physical (%) */}
                <tr style={{ background: '#FAFAFA', fontWeight: 700 }}>
                  <td colSpan={5} style={{ border: '1px solid #444', padding: '3px 6px', textAlign: 'right', fontSize: '0.7rem' }}></td>
                  <td style={{ border: '1px solid #444', padding: '2px 4px', fontSize: '0.67rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Cumulative Physical (%)
                  </td>
                  {['7%', '16%', '23%', '30%', '43%', '53%', '69%', '83%', '100%', '100%', '100%', '100%'].map((val, idx) => (
                    <td key={`cphys-tot-${idx}`} style={{ border: '1px solid #444', textAlign: 'center', padding: '3px 1px', fontSize: '0.68rem' }}>
                      {val}
                    </td>
                  ))}
                  <td colSpan={6} style={{ border: '1px solid #444' }}></td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ── Official Footnote (Exact from Image) ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            color: '#222',
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            fontFamily: 'Segoe UI, Arial, sans-serif',
          }}>
            <div>
              <span>{template?.footnote || '* රු. මිලියන 80 ප්‍රසම්පාදන අංශය මගින් මුදල් වෙන් කර ඇත.'}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#666' }}>
              Ministry of Education Sri Lanka • Information Technology & Digital Education Branch • Page 1 of 1
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            MODAL: ADD / EDIT ACTIVITY (Matching Image Columns)
            ═════════════════════════════════════════════════════════════ */}
        {isActivityModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--gray-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--primary)',
                color: '#fff',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
              }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {editingActivity ? '✏️ Edit Annual Plan Activity' : '➕ Add Activity (Official Template Format)'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveActivity} style={{ padding: '1.25rem' }}>
                {errorMsg && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    color: '#DC2626',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    marginBottom: '1rem',
                  }}>
                    {errorMsg}
                  </div>
                )}

                {/* Row 1: Output No, Activity No, Vote Number, Allocation (Mn) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1.5fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Output No
                    </label>
                    <input
                      type="text"
                      value={formOutputNo}
                      onChange={(e) => setFormOutputNo(e.target.value)}
                      placeholder="e.g. 1"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Activity No
                    </label>
                    <input
                      type="text"
                      value={formActivityCode}
                      onChange={(e) => setFormActivityCode(e.target.value)}
                      placeholder="e.g. 1, 2"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Vote Number
                    </label>
                    <input
                      type="text"
                      value={formVoteNumber}
                      onChange={(e) => setFormVoteNumber(e.target.value)}
                      placeholder="e.g. 126-01-2-0-2401"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Cost Allocation (Mn)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formEstimatedCost}
                      onChange={(e) => setFormEstimatedCost(e.target.value)}
                      placeholder="e.g. 0.34 or 80"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                </div>

                {/* Row 2: Main Activities Description */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Main Activities (Description) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formActivity}
                    onChange={(e) => setFormActivity(e.target.value)}
                    placeholder="Enter the complete main activity description..."
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                  />
                </div>

                {/* Row 3: Monthly Breakdown - Financial (Rs. Mn) */}
                <div style={{
                  background: '#F9F9F9',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-300)',
                  marginBottom: '0.85rem',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Monthly Financial Phasing (Rs. Mn) — Non-Cumulative
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.45rem' }}>
                    {MONTHS.map((m, idx) => (
                      <div key={`m-fin-${idx}`}>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#555', marginBottom: '2px' }}>
                          {m} ({MONTH_NAMES[idx].slice(0, 3)})
                        </label>
                        <input
                          type="text"
                          value={formFinancialMonths[idx] || '0'}
                          onChange={(e) => {
                            const updated = [...formFinancialMonths];
                            updated[idx] = e.target.value;
                            setFormFinancialMonths(updated);
                          }}
                          style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 4: Monthly Breakdown - Physical (%) */}
                <div style={{
                  background: '#F9F9F9',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--gray-300)',
                  marginBottom: '0.85rem',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Monthly Physical Phasing (%) — Non-Cumulative
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.45rem' }}>
                    {MONTHS.map((m, idx) => (
                      <div key={`m-phys-${idx}`}>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#555', marginBottom: '2px' }}>
                          {m} ({MONTH_NAMES[idx].slice(0, 3)})
                        </label>
                        <input
                          type="text"
                          value={formPhysicalMonths[idx] || '-'}
                          onChange={(e) => {
                            const updated = [...formPhysicalMonths];
                            updated[idx] = e.target.value;
                            setFormPhysicalMonths(updated);
                          }}
                          placeholder="e.g. 10%"
                          style={{ width: '100%', padding: '0.35rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 5: Quarterly Targets (Q1 to Q4 Cumulative) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                      Q1 Cumulative
                    </label>
                    <input
                      type="text"
                      value={formTargetQ1}
                      onChange={(e) => setFormTargetQ1(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                      Q2 Cumulative
                    </label>
                    <input
                      type="text"
                      value={formTargetQ2}
                      onChange={(e) => setFormTargetQ2(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                      Q3 Cumulative
                    </label>
                    <input
                      type="text"
                      value={formTargetQ3}
                      onChange={(e) => setFormTargetQ3(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                      Q4 Cumulative
                    </label>
                    <input
                      type="text"
                      value={formTargetQ4}
                      onChange={(e) => setFormTargetQ4(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* Row 6: Responsibility Officer & Cost Note */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Responsibility (Officer Name & Designation)
                    </label>
                    <input
                      type="text"
                      value={formResponsibleOfficer}
                      onChange={(e) => setFormResponsibleOfficer(e.target.value)}
                      placeholder="e.g. Mrs. E.T.W. Silva (AD-ICT) or Mrs. M.B.M.B.K. Gunawarnana (DDE)"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Cost Footnote Note (if any)
                    </label>
                    <input
                      type="text"
                      value={formCostNote}
                      onChange={(e) => setFormCostNote(e.target.value)}
                      placeholder="e.g. * 80"
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsActivityModalOpen(false)}
                    style={{ padding: '0.45rem 0.95rem', borderRadius: '4px', border: '1px solid var(--gray-300)', background: '#fff', fontSize: '0.825rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '0.45rem 1.15rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? 'Saving...' : editingActivity ? 'Save Changes' : 'Add Activity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            MODAL: CONFIGURE OFFICIAL HEADER TEMPLATE
            ═════════════════════════════════════════════════════════════ */}
        {isTemplateModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--gray-300)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#1A1A1A',
                color: '#fff',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
              }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  ⚙️ Configure AIP Official Template Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} style={{ padding: '1.25rem' }}>
                {errorMsg && (
                  <div style={{
                    padding: '0.65rem',
                    background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    color: '#DC2626',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    marginBottom: '1rem',
                  }}>
                    {errorMsg}
                  </div>
                )}

                {/* Main Responsibility & Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Main Responsibility
                    </label>
                    <input
                      type="text"
                      value={tplMainResp}
                      onChange={(e) => setTplMainResp(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Contact No
                    </label>
                    <input
                      type="text"
                      value={tplMainContact}
                      onChange={(e) => setTplMainContact(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                </div>

                {/* Overall Responsibility & Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Overall Responsibility
                    </label>
                    <input
                      type="text"
                      value={tplOverallResp}
                      onChange={(e) => setTplOverallResp(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Contact No
                    </label>
                    <input
                      type="text"
                      value={tplOverallContact}
                      onChange={(e) => setTplOverallContact(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                </div>

                {/* Phase Title & Target Title */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Phase Title
                    </label>
                    <input
                      type="text"
                      value={tplPhaseTitle}
                      onChange={(e) => setTplPhaseTitle(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Target Classification Title
                    </label>
                    <input
                      type="text"
                      value={tplTargetTitle}
                      onChange={(e) => setTplTargetTitle(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                    />
                  </div>
                </div>

                {/* Footnote */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Document Mandate Footnote
                  </label>
                  <textarea
                    rows={2}
                    value={tplFootnote}
                    onChange={(e) => setTplFootnote(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--gray-300)', fontSize: '0.825rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--gray-200)', paddingTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    style={{ padding: '0.45rem 0.95rem', borderRadius: '4px', border: '1px solid var(--gray-300)', background: '#fff', fontSize: '0.825rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      padding: '0.45rem 1.15rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
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
