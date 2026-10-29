'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';

interface AipAmendment {
  id: string;
  year: string;
  amendmentNumber: number;
  title: string;
  circularRef?: string;
  deadline?: string;
  notes?: string;
  progressStartDate?: string;
  progressEndDate?: string;
  status: 'Active' | 'Closed';
  totalBranches?: number;
  submittedBranchesCount?: number;
  branchSubmissions?: Array<{
    branchId: string;
    branchName: string;
    status: string;
    submittedAt: string | null;
    activityCount: number;
    totalCost: number;
  }>;
}

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
  progressStartDate?: string;
  progressEndDate?: string;
  amendmentNumber?: number;
  amendmentId?: string;
  submittedAt?: string;
  submissionNotes?: string;
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
  remarks?: string;
  physicalProgress?: string;
  physicalProgressPct?: string;
  financialProgress?: number;
  financialProgressPct?: string;
  createdAt: string;
  updatedAt: string;
}

interface MoeBranch {
  id: string;
  name: string;
  code: string;
}

const MONTH_NAMES_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function AnnualPlanPage() {
  const { data: session, status } = useSession();
    const user = session?.user as any;

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2027');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [moeBranches, setMoeBranches] = useState<MoeBranch[]>([]);

  const [plan, setPlan] = useState<AipPlan | null>(null);
  const [activities, setActivities] = useState<AipActivity[]>([]);

  // Amendment states
  const [amendments, setAmendments] = useState<AipAmendment[]>([]);
  const [selectedAmendmentNumber, setSelectedAmendmentNumber] = useState<number>(0);
  const [currentAmendment, setCurrentAmendment] = useState<AipAmendment | null>(null);

  // Planning Branch: Call for Amendment Modal
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callTitle, setCallTitle] = useState('');
  const [callCircular, setCallCircular] = useState('');
  const [callDeadline, setCallDeadline] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callProgressStart, setCallProgressStart] = useState('2027.01.01');
  const [callProgressEnd, setCallProgressEnd] = useState('2027.10.31');
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressSavedSuccess, setProgressSavedSuccess] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callSuccessMsg, setCallSuccessMsg] = useState('');

  // Planning Branch: Submissions Tracker Modal
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);

  // Branch Officer: Submit Amendment to Planning Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const [branchInfo, setBranchInfo] = useState<{ id: string; name: string } | null>(null);

  // Directly editable fields in the sheet
  const [mainResp, setMainResp] = useState('');
  const [mainContact, setMainContact] = useState('');
  const [overallResp, setOverallResp] = useState('');
  const [overallContact, setOverallContact] = useState('');
  const [formPhaseTitle, setFormPhaseTitle] = useState('3. Implementation Phase');
  const [formTargetTitle, setFormTargetTitle] = useState('');
  const [progressRangeStart, setProgressRangeStart] = useState('2026.01.01');
  const [progressRangeEnd, setProgressRangeEnd] = useState('2026.10.31');
  const [formPhysicalProgress, setFormPhysicalProgress] = useState('');
  const [formPhysicalProgressPct, setFormPhysicalProgressPct] = useState('');
  const [formFinancialProgress, setFormFinancialProgress] = useState('');
  const [formFinancialProgressPct, setFormFinancialProgressPct] = useState('');
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
  const [formRemarks, setFormRemarks] = useState('');

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

  // Load Data - dynamically detects branch, year, and amendment version
  const loadPlanData = async (targetBranchId?: string, targetAmendmentNum?: number) => {
    try {
      setLoading(true);
      const bId = targetBranchId || user?.organizationId;
      const amendNum = targetAmendmentNum !== undefined ? targetAmendmentNum : selectedAmendmentNumber;
      const url = bId 
        ? `/api/annual-plan?year=${selectedYear}&branchId=${encodeURIComponent(bId)}&amendmentNumber=${amendNum}`
        : `/api/annual-plan?year=${selectedYear}&amendmentNumber=${amendNum}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setBranchInfo(json.branch);
        setMoeBranches(json.moeBranches || []);
        if (json.branch?.id) {
          setSelectedBranchId(json.branch.id);
        }
        setPlan(json.plan);
        setActivities(json.activities || []);
        setAmendments(json.amendments || []);
        setCurrentAmendment(json.currentAmendment || null);

        if (json.plan) {
          setMainResp(json.plan.mainResponsibility || '');
          setMainContact(json.plan.mainContactNo || '');
          setOverallResp(json.plan.overallResponsibility || '');
          setOverallContact(json.plan.overallContactNo || '');
          setFormPhaseTitle(json.plan.phaseTitle || '3. Implementation Phase');
          setFormTargetTitle(json.plan.targetTitle || '');
          setProgressRangeStart(json.plan.progressStartDate || `${selectedYear}.01.01`);
          setProgressRangeEnd(json.plan.progressEndDate || `${selectedYear}.10.31`);
        }
      }
    } catch (err) {
      console.error('Failed to load annual plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync with URL query parameter ?amendmentNumber=X without requiring Suspense
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qNum = params.get('amendmentNumber');
      if (qNum !== null) {
        const parsed = parseInt(qNum, 10);
        if (!isNaN(parsed) && parsed !== selectedAmendmentNumber) {
          setSelectedAmendmentNumber(parsed);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    loadPlanData(user?.organizationId, selectedAmendmentNumber);
  }, [status, user?.organizationId, selectedYear, selectedAmendmentNumber]);

  // Handle branch switch
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    loadPlanData(newBranchId);
  };

  // Handle inline progress changes in the amendment table
  const handleProgressChange = (
    actId: string,
    field: 'physicalProgress' | 'physicalProgressPct' | 'financialProgress' | 'financialProgressPct',
    val: any
  ) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, [field]: val } : a))
    );
  };

  // Batch save all progress numbers for the current amendment
  const handleSaveAllProgress = async () => {
    try {
      setIsSavingProgress(true);
      const payload = {
        activities: activities.map((a) => ({
          id: a.id,
          physicalProgress: a.physicalProgress || '',
          physicalProgressPct: a.physicalProgressPct || '',
          financialProgress: a.financialProgress !== undefined && !isNaN(Number(a.financialProgress)) ? Number(a.financialProgress) : undefined,
          financialProgressPct: a.financialProgressPct || '',
        })),
      };
      const res = await fetch('/api/annual-plan/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setProgressSavedSuccess(true);
        setTimeout(() => setProgressSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save progress updates:', err);
    } finally {
      setIsSavingProgress(false);
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
          branchId: branchInfo?.id || selectedBranchId,
          branchName: branchInfo?.name,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
          mainResponsibility: mainResp,
          mainContactNo: mainContact,
          overallResponsibility: overallResp,
          overallContactNo: overallContact,
          phaseTitle: formPhaseTitle,
          targetTitle: formTargetTitle,
          progressStartDate: progressRangeStart,
          progressEndDate: progressRangeEnd,
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

    // 6. Progress Totals
    const totalFinancialProgress = Math.round(
      activities.reduce((sum, a) => sum + (Number(a.financialProgress) || 0), 0) * 1000
    ) / 1000;
    const overallFinancialProgressPct = totalEstimatedCost > 0
      ? `${Math.round((totalFinancialProgress / totalEstimatedCost) * 1000) / 10}%`
      : '';

    let physicalProgressSum = 0;
    let physicalProgressCount = 0;
    activities.forEach((a) => {
      if (a.physicalProgressPct) {
        const num = parseFloat(String(a.physicalProgressPct).replace('%', '').trim());
        if (!isNaN(num)) {
          physicalProgressSum += num;
          physicalProgressCount++;
        }
      }
    });
    const overallPhysicalProgressPct = physicalProgressCount > 0
      ? `${Math.round((physicalProgressSum / physicalProgressCount) * 10) / 10}%`
      : '';

    return {
      totalEstimatedCost: Math.round(totalEstimatedCost * 1000) / 1000,
      monthlyFinancial: monthlyFinancial.map((f) => Math.round(f * 1000) / 1000),
      quarterlyFinancial: quarterlyFinancial.map((f) => Math.round(f * 1000) / 1000),
      monthlyPhysical,
      quarterlyPhysical,
      totalFinancialProgress,
      overallFinancialProgressPct,
      totalPhysicalProgress: '',
      overallPhysicalProgressPct,
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
    setFormRemarks('');
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
    setFormPhysicalProgress('');
    setFormPhysicalProgressPct('');
    setFormFinancialProgress('');
    setFormFinancialProgressPct('');
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
    setFormRemarks(act.remarks || '');

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
    setFormPhysicalProgress(act.physicalProgress || '');
    setFormPhysicalProgressPct(act.physicalProgressPct || '');
    setFormFinancialProgress(act.financialProgress !== undefined && act.financialProgress !== null ? String(act.financialProgress) : '');
    setFormFinancialProgressPct(act.financialProgressPct || '');

    setFormError('');
    setIsModalOpen(true);
  };

  // Live calculation of quarters in the form when user updates monthly numbers
  const handleFinancialMonthChange = (monthIdx: number, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    const updated = [...formFinancialMonths];
    updated[monthIdx] = num;
    setFormFinancialMonths(updated);

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
        branchId: branchInfo?.id || selectedBranchId,
        branchName: branchInfo?.name,
        year: selectedYear,
        outputNo: formOutputNo,
        activityCode: formActivityCode || String(activities.length + 1),
        activity: formActivity,
        voteNumber: formVoteNumber,
        estimatedCost: parseFloat(formEstimatedCost) || 0,
        responsibleOfficer: formResponsibleOfficer,
        remarks: formRemarks,
        amendmentNumber: selectedAmendmentNumber,
        amendmentId: currentAmendment?.id,
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
        physicalProgress: formPhysicalProgress,
        physicalProgressPct: formPhysicalProgressPct,
        financialProgress: formFinancialProgress !== '' ? parseFloat(formFinancialProgress) : undefined,
        financialProgressPct: formFinancialProgressPct,
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

  // Open Call for Amendment Modal (Planning Branch)
  const handleOpenCallModal = () => {
    const nextNum = (amendments.length || 0) + 1;
    setCallTitle(`Amendment 0${nextNum} - Budget & Target Revision`);
    setCallCircular('');
    setCallDeadline('');
    setCallNotes('');
    setCallSuccessMsg('');
    setIsCallModalOpen(true);
  };

  // Submit Call for Amendment (Planning Branch)
  const handleCreateAmendmentCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCalling(true);
      const res = await fetch('/api/annual-plan/amendments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          title: callTitle,
          circularRef: callCircular,
          deadline: callDeadline,
          notes: callNotes,
          progressStartDate: callProgressStart,
          progressEndDate: callProgressEnd,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setCallSuccessMsg(json.message || 'Amendment broadcasted successfully!');
        setTimeout(() => {
          setIsCallModalOpen(false);
          setCallSuccessMsg('');
        }, 2000);
        // Refresh and switch to new amendment
        const createdNum = json.amendment?.amendmentNumber || (amendments.length + 1);
        setSelectedAmendmentNumber(createdNum);
        await loadPlanData(undefined, createdNum);
      } else {
        alert(json.error || 'Failed to call amendment');
      }
    } catch (err: any) {
      alert(err.message || 'Error calling amendment');
    } finally {
      setIsCalling(false);
    }
  };

  // Submit Amendment to Planning Branch (Branch Officers)
  const handleSubmitAmendmentToPlanning = async () => {
    if (selectedAmendmentNumber === 0) return;
    try {
      setIsSubmittingAmendment(true);
      const res = await fetch('/api/annual-plan/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan?.id,
          branchId: branchInfo?.id || user?.organizationId,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
          notes: submitNotes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSubmitSuccessMsg(json.message || 'Amendment submitted successfully!');
        setTimeout(() => {
          setIsSubmitModalOpen(false);
          setSubmitSuccessMsg('');
        }, 2000);
        await loadPlanData();
      } else {
        alert(json.error || 'Failed to submit amendment');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting amendment');
    } finally {
      setIsSubmittingAmendment(false);
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
      'Remarks',
      'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
      'Q1 (Cumulative)', 'Q2 (Cumulative)', 'Q3 (Cumulative)', 'Q4 (Cumulative)',
      'Responsibility'
    ];

    const rows: string[][] = [];

    // Header info rows
    rows.push(['3. Implementation Phase']);
    rows.push([`Overall Physical and Financial Targets ${selectedYear} - ${branchInfo?.name || 'MOE Branch'}`]);
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
    link.setAttribute('download', `MOE_${branchInfo?.name?.replace(/\s+/g, '_')}_AIP_${selectedYear}_Official_Matrix.csv`);
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
                <option value="2027">2027</option>
                <option value="2026">2026</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* Version / Amendment Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>Plan / Revision:</span>
              <select
                value={selectedAmendmentNumber}
                onChange={(e) => setSelectedAmendmentNumber(parseInt(e.target.value, 10))}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: selectedAmendmentNumber === 0 ? '#1e293b' : '#b45309',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <option value={0}>📋 Original Plan</option>
                {amendments.map((a) => (
                  <option key={a.id} value={a.amendmentNumber}>
                    🔄 Amendment 0{a.amendmentNumber}: {a.title} {a.deadline ? `(Due ${a.deadline})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Planning Branch / Admin Tools */}
            {(user?.organizationId === 'org-moe-planning' || user?.organizationId === 'org-moe-data' || user?.roleId === 'role-admin') && (
              <>
                <button
                  onClick={handleOpenCallModal}
                  style={{
                    background: '#8D153A',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(141, 21, 58, 0.25)',
                  }}
                  title="Initiate a new amendment cycle and broadcast notification to all branches"
                >
                  <span>📢</span> Call for Amendment
                </button>

                <button
                  onClick={() => setIsTrackerModalOpen(true)}
                  style={{
                    background: '#ffffff',
                    color: '#7a1c2d',
                    border: '1px solid #7a1c2d',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  title="View submission progress of all branches for amendments"
                >
                  <span>📊</span> Submissions Tracker
                </button>
              </>
            )}

            {/* Branch Officer Submit Button (Enabled only when viewing an Amendment) */}
            {selectedAmendmentNumber > 0 && (
              plan?.status === 'Submitted' ? (
                <div style={{
                  background: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #86efac',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <span>✅</span> Submitted to Planning Branch
                </div>
              ) : (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 6px rgba(22, 101, 52, 0.3)',
                  }}
                  title="Submit this amendment to MOE Planning Branch"
                >
                  <span>📤</span> Submit Amendment 0{selectedAmendmentNumber}
                </button>
              )
            )}

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
            <strong style={{ color: '#7a1c2d', fontSize: '0.95rem' }}>
              {branchInfo?.name || user?.organizationName || 'MOE ICT Branch'}
            </strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
            🔒 Branch automatically identified from authenticated account
          </div>
        </div>

{/* ─── Version & Amendment Status Context Banner ─── */}
        {selectedAmendmentNumber > 0 && (
          <div className="no-print" style={{ marginBottom: '1.25rem' }}>
            <div style={{
              background: plan?.status === 'Submitted' ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${plan?.status === 'Submitted' ? '#86efac' : '#fde68a'}`,
              borderRadius: '8px',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.35rem' }}>{plan?.status === 'Submitted' ? '✅' : '🔄'}</span>
                <div>
                  <div style={{ fontWeight: 800, color: plan?.status === 'Submitted' ? '#166534' : '#92400e', fontSize: '0.95rem' }}>
                    {currentAmendment?.title || `Amendment 0${selectedAmendmentNumber}`}
                    {currentAmendment?.deadline && (
                      <span style={{ marginLeft: '0.5rem', fontWeight: 500, fontSize: '0.8rem', color: '#6b7280' }}>
                        (Submission Deadline: {currentAmendment.deadline})
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '2px' }}>
                    {plan?.status === 'Submitted'
                      ? `Submitted to Planning Branch on ${new Date(plan.submittedAt || '').toLocaleString()}. Changes are recorded under this amendment.`
                      : 'Draft revision: Update activities or votes as requested. Once ready, click "Submit Amendment to Planning Branch" to transmit your revision.'}
                  </div>
                  {currentAmendment?.notes && (
                    <div style={{ marginTop: '4px', fontSize: '0.76rem', color: '#78350f', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                      <strong>Planning Note:</strong> {currentAmendment.notes}
                    </div>
                  )}
                </div>
              </div>

              {plan?.status !== 'Submitted' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={handleSaveAllProgress}
                    disabled={isSavingProgress}
                    style={{
                      background: progressSavedSuccess ? '#15803d' : '#ffffff',
                      color: progressSavedSuccess ? '#ffffff' : '#15803d',
                      border: '2px solid #15803d',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Save all actual progress numbers entered in the green and peach columns"
                  >
                    {progressSavedSuccess ? '✅ Progress Saved!' : isSavingProgress ? '⏳ Saving...' : '💾 Save Progress Updates'}
                  </button>

                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    style={{
                      background: '#166534',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1.15rem',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(22, 101, 52, 0.2)',
                    }}
                  >
                    📤 Submit Amendment 0{selectedAmendmentNumber} to Planning Branch
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

                {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            Loading Annual Implementation Plan...
          </div>
        ) : (
          /* ── Official AIP Sheet ── */
          <div className="aip-sheet-card">

            {/* Document Title Banner - Editable */}
            <div style={{
              background: '#7a1c2d',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              textAlign: 'center',
              borderBottom: '2px solid #5a101e',
            }}>
              <input
                value={formPhaseTitle}
                onChange={(e) => setFormPhaseTitle(e.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px dashed rgba(255,255,255,0.5)',
                  color: '#ffffff',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  letterSpacing: '0.025em',
                  textAlign: 'center',
                  outline: 'none',
                  margin: '0 auto',
                  padding: '2px 0',
                  cursor: 'text',
                }}
                placeholder="3. Implementation Phase"
                title="Click to edit phase title"
              />
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
                  {/* Row 1: Super Header Row */}
                  <tr>
                    <th rowSpan={3} style={{ width: '60px' }}>Outcome / Output No</th>
                    <th rowSpan={3} style={{ width: '55px' }}>Activity No</th>
                    <th rowSpan={3} style={{ minWidth: '260px', maxWidth: '360px' }}>Main Activities</th>
                    <th rowSpan={3} style={{ width: '130px' }}>Vote Number</th>
                    <th rowSpan={3} style={{ width: '90px' }}>Allocation / Estimated Cost (Mn)</th>
                    <th rowSpan={3} style={{ width: '75px' }}>Remark</th>
                    <th rowSpan={3} style={{ width: '115px' }}>Indicator</th>
                    <th
                      colSpan={16}
                      style={{
                        background: '#7a1c2d',
                        color: '#ffffff',
                        padding: '6px 10px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        letterSpacing: '0.02em',
                        border: '1px solid #5a101e',
                      }}
                    >
                      <input
                        value={formTargetTitle !== undefined && formTargetTitle !== '' ? formTargetTitle : `Overall Physical and Financial Targets: ${selectedYear}`}
                        onChange={(e) => setFormTargetTitle(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px dashed rgba(255,255,255,0.4)',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                          width: '100%',
                          cursor: 'text',
                        }}
                        title="Click to edit target heading"
                      />
                    </th>
                    <th rowSpan={3} style={{ minWidth: '160px' }}>Responsibility</th>
                    {selectedAmendmentNumber > 0 && (
                      <th
                        colSpan={4}
                        style={{
                          background: '#274e13',
                          color: '#ffffff',
                          padding: '6px 10px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          border: '1px solid #1e3f10',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <span>Progress from</span>
                          <input
                            value={progressRangeStart}
                            onChange={(e) => setProgressRangeStart(e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px dashed rgba(255,255,255,0.7)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              textAlign: 'center',
                              width: '85px',
                              outline: 'none',
                            }}
                            title="Click to edit progress start date"
                          />
                          <span>to</span>
                          <input
                            value={progressRangeEnd}
                            onChange={(e) => setProgressRangeEnd(e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px dashed rgba(255,255,255,0.7)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              textAlign: 'center',
                              width: '85px',
                              outline: 'none',
                            }}
                            title="Click to edit progress end date"
                          />
                        </div>
                      </th>
                    )}
                    <th rowSpan={3} className="no-print" style={{ width: '75px' }}>Actions</th>
                  </tr>

                  {/* Row 2: Monthly & Quarterly Group Headers */}
                  <tr>
                    <th colSpan={12} className="header-sub-group">
                      January to December - Monthly basis (Non-Cumulative)
                    </th>
                    <th colSpan={4} className="header-sub-group" style={{ background: '#fef3c7', color: '#92400e' }}>
                      Q1 to Q4 - Quarterly basis (Cumulative)
                    </th>
                  </tr>

                  {/* Row 3: Sub Header Months & Quarters & 4 Progress Columns */}
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

                    {selectedAmendmentNumber > 0 && (
                      <>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '85px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Physical Progress
                        </th>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '95px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Physical Progress - %
                        </th>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '85px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Financial Progress
                        </th>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '95px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Financial Progress - %
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={selectedAmendmentNumber > 0 ? 29 : 25} style={{ padding: '3.5rem 1rem', color: '#6b7280', fontSize: '0.9rem' }}>
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
                            {/* Column 6: Remark (e.g. CF) */}
                            <td rowSpan={2} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textAlign: 'center', background: '#fafafa' }}>
                              {act.remarks || '-'}
                            </td>

                            {/* Sub-row 1 Indicator: Financial */}
                            <td className="type-financial" style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              Financial (Rs. Mn)
                            </td>

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

                            {/* Responsibility */}
                            <td rowSpan={2} className="text-left" style={{ fontSize: '0.78rem', lineHeight: '1.3' }}>
                              {act.responsibleOfficer || '-'}
                            </td>

                            {/* 4 Progress Columns (Sub-row 1: Financial) - Directly Editable in Amendments */}
                            {selectedAmendmentNumber > 0 && (
                              <>
                                <td style={{ background: '#b6d7a8', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #8cb37d', color: '#6b7280' }}>-</td>
                                <td style={{ background: '#fce5cd', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #e6b8af', color: '#6b7280' }}>-</td>
                                <td style={{ background: '#b6d7a8', padding: '2px 3px', border: '1px solid #8cb37d' }}>
                                  <input
                                    type="number"
                                    step="any"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.financialProgress !== undefined && act.financialProgress !== null ? act.financialProgress : ''}
                                    onChange={(e) => handleProgressChange(act.id, 'financialProgress', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="0.0"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(20, 83, 45, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#14532d',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Financial Progress (Rs. Mn)"
                                  />
                                </td>
                                <td style={{ background: '#fce5cd', padding: '2px 3px', border: '1px solid #e6b8af' }}>
                                  <input
                                    type="text"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.financialProgressPct || ''}
                                    onChange={(e) => handleProgressChange(act.id, 'financialProgressPct', e.target.value)}
                                    placeholder="0%"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(124, 45, 18, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#7c2d12',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Financial Progress %"
                                  />
                                </td>
                              </>
                            )}

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
                            <td className="type-physical" style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              Physical (%)
                            </td>

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

                            {/* 4 Progress Columns (Sub-row 2: Physical) - Directly Editable in Amendments */}
                            {selectedAmendmentNumber > 0 && (
                              <>
                                <td style={{ background: '#b6d7a8', padding: '2px 3px', border: '1px solid #8cb37d' }}>
                                  <input
                                    type="text"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.physicalProgress || ''}
                                    onChange={(e) => handleProgressChange(act.id, 'physicalProgress', e.target.value)}
                                    placeholder="Units / Note"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(20, 83, 45, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#14532d',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Physical Progress (Quantity / description)"
                                  />
                                </td>
                                <td style={{ background: '#fce5cd', padding: '2px 3px', border: '1px solid #e6b8af' }}>
                                  <input
                                    type="text"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.physicalProgressPct || ''}
                                    onChange={(e) => handleProgressChange(act.id, 'physicalProgressPct', e.target.value)}
                                    placeholder="0%"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(124, 45, 18, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#7c2d12',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Physical Progress %"
                                  />
                                </td>
                                <td style={{ background: '#b6d7a8', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #8cb37d', color: '#6b7280' }}>-</td>
                                <td style={{ background: '#fce5cd', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #e6b8af', color: '#6b7280' }}>-</td>
                              </>
                            )}
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
                      <td colSpan={4} rowSpan={2} style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', background: '#f8fafc', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1' }}>
                        Total
                      </td>
                      <td rowSpan={2} className="text-right" style={{ fontWeight: 800, fontSize: '0.9rem', background: '#f8fafc', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1' }}>
                        {totals.totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 })}
                      </td>
                      <td rowSpan={2} style={{ background: '#f8fafc', borderRight: '1px solid #cbd5e1' }}></td>
                      <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Financial (Rs. Mn)</td>

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

                      <td rowSpan={2} style={{ background: '#f8fafc', borderRight: '1px solid #cbd5e1' }}></td>

                      {/* Progress Financial Totals - Only in Amendments */}
                      {selectedAmendmentNumber > 0 && (
                        <>
                          <td style={{ background: '#b6d7a8', border: '1px solid #8cb37d' }}></td>
                          <td style={{ background: '#fce5cd', border: '1px solid #e6b8af' }}></td>
                          <td style={{ background: '#b6d7a8', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#14532d', border: '1px solid #8cb37d' }}>
                            {totals.totalFinancialProgress > 0 ? totals.totalFinancialProgress : ''}
                          </td>
                          <td style={{ background: '#fce5cd', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#7c2d12', border: '1px solid #e6b8af' }}>
                            {totals.overallFinancialProgressPct || ''}
                          </td>
                        </>
                      )}

                      <td rowSpan={2} className="no-print" style={{ background: '#f8fafc' }}></td>
                    </tr>

                    {/* Physical Cumulative Total Row */}
                    <tr className="total-row-phys">
                      <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Physical (%) Cumulative</td>

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

                      {/* Progress Physical Totals - Only in Amendments */}
                      {selectedAmendmentNumber > 0 && (
                        <>
                          <td style={{ background: '#b6d7a8', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#14532d', border: '1px solid #8cb37d' }}>
                            {totals.totalPhysicalProgress || ''}
                          </td>
                          <td style={{ background: '#fce5cd', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#7c2d12', border: '1px solid #e6b8af' }}>
                            {totals.overallPhysicalProgressPct || ''}
                          </td>
                          <td style={{ background: '#b6d7a8', border: '1px solid #8cb37d' }}></td>
                          <td style={{ background: '#fce5cd', border: '1px solid #e6b8af' }}></td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Add / Edit Activity Modal Form ── */}
      {/* Modal: Call for Amendment (Planning Branch) */}
      {isCallModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#8D153A',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                📢 Call for Amendment ({selectedYear})
              </h3>
              <button
                onClick={() => setIsCallModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAmendmentCall} style={{ padding: '1.5rem' }}>
              {callSuccessMsg && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {callSuccessMsg}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Amendment Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={callTitle}
                  onChange={(e) => setCallTitle(e.target.value)}
                  placeholder="e.g. Amendment 01 - Q1 Budget & Target Revision"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Circular / Reference No
                  </label>
                  <input
                    type="text"
                    value={callCircular}
                    onChange={(e) => setCallCircular(e.target.value)}
                    placeholder="e.g. ED/04/2027"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Submission Deadline
                  </label>
                  <input
                    type="date"
                    value={callDeadline}
                    onChange={(e) => setCallDeadline(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    Progress Period: Start Date (YYYY.MM.DD)
                  </label>
                  <input
                    type="text"
                    value={callProgressStart}
                    onChange={(e) => setCallProgressStart(e.target.value)}
                    placeholder="2027.01.01"
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    Progress Period: End Date (YYYY.MM.DD)
                  </label>
                  <input
                    type="text"
                    value={callProgressEnd}
                    onChange={(e) => setCallProgressEnd(e.target.value)}
                    placeholder="2027.10.31"
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Guidance Notes / Instructions to Branches
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Please revise vote numbers according to Circular 04 and update Q2 expenditure forecasts."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem' }}>
                🔔 <strong>Broadcast Notification:</strong> Submitting this will automatically send an in-app notification to all 8+ MOE branches, creating their amendment template so they can fill and submit back.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCallModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCalling}
                  style={{ padding: '0.5rem 1.25rem', background: '#8D153A', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {isCalling ? 'Broadcasting...' : '📢 Broadcast to All Branches'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submissions Tracker (Planning Branch / Admin) */}
      {isTrackerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#7a1c2d',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  📊 Branch Submissions Tracker ({selectedYear})
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                  Tracking live submission progress of all MOE branches for amendments
                </p>
              </div>
              <button
                onClick={() => setIsTrackerModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {amendments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
                  No amendments called yet for year {selectedYear}. Click "Call for Amendment" to initiate the first amendment cycle.
                </div>
              ) : (
                amendments.map((amend) => (
                  <div key={amend.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.25rem', overflow: 'hidden' }}>
                    <div style={{
                      background: '#f8fafc',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      <div>
                        <strong style={{ color: '#7a1c2d', fontSize: '0.95rem' }}>
                          Amendment 0{amend.amendmentNumber}: {amend.title}
                        </strong>
                        {amend.deadline && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                            (Deadline: {amend.deadline})
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534' }}>
                        {amend.submittedBranchesCount || 0} / {amend.totalBranches || moeBranches.length} Branches Submitted
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '6px 10px' }}>Branch Name</th>
                          <th style={{ padding: '6px 10px' }}>Status</th>
                          <th style={{ padding: '6px 10px' }}>Activities</th>
                          <th style={{ padding: '6px 10px' }}>Total Cost (Mn)</th>
                          <th style={{ padding: '6px 10px' }}>Submitted On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(amend.branchSubmissions || []).map((b) => (
                          <tr key={b.branchId} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>{b.branchName}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: b.status === 'Submitted' ? '#dcfce7' : b.status === 'Approved' ? '#e0f2fe' : '#fef3c7',
                                color: b.status === 'Submitted' ? '#166534' : b.status === 'Approved' ? '#0369a1' : '#92400e',
                              }}>
                                {b.status}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px' }}>{b.activityCount} activities</td>
                            <td style={{ padding: '6px 10px', fontWeight: 700 }}>
                              {b.totalCost > 0 ? `Rs. ${b.totalCost} Mn` : '-'}
                            </td>
                            <td style={{ padding: '6px 10px', color: '#64748b' }}>
                              {b.submittedAt ? new Date(b.submittedAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Amendment to Planning Branch */}
      {isSubmitModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#166534',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                📤 Submit Amendment 0{selectedAmendmentNumber} to Planning Branch
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {submitSuccessMsg ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '1rem', borderRadius: '6px', textAlign: 'center', fontWeight: 700 }}>
                  {submitSuccessMsg}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                    You are about to officially submit <strong>Amendment 0{selectedAmendmentNumber}</strong> for <strong>{branchInfo?.name || user?.organizationName}</strong> to MOE Planning Branch.
                  </p>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                    <div>📋 Total Activities: <strong>{activities.length}</strong></div>
                    <div>💰 Total Estimated Cost: <strong>Rs. {totals.totalEstimatedCost} Mn</strong></div>
                    <div>🏛️ Target Year: <strong>{selectedYear}</strong></div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                      Submission Notes / Remarks for Planning Branch (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={submitNotes}
                      onChange={(e) => setSubmitNotes(e.target.value)}
                      placeholder="e.g. Revised laptop procurement timeline and added teacher training vote."
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitAmendmentToPlanning}
                      disabled={isSubmittingAmendment}
                      style={{ padding: '0.5rem 1.25rem', background: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {isSubmittingAmendment ? 'Submitting...' : 'Confirm & Submit to Planning'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                  {selectedYear} Annual Implementation Plan • {branchInfo?.name || 'MOE Branch'}
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
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
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="e.g. Procurement notes, vote details, or special remarks"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
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
                        <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left', width: '140px' }}>Remarks</th>
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

                {/* Section 4: Progress Tracking (Actual Progress) - Only for Amendments */}
                {selectedAmendmentNumber > 0 && (
                  <>
                    <h4 style={{ margin: '1.25rem 0 0.5rem 0', fontSize: '0.9rem', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      4. Progress Tracking (Actual Progress for Amendment 0{selectedAmendmentNumber})
                    </h4>
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Physical Progress (Quantity / Details)
                        </label>
                        <input
                          type="text"
                          value={formPhysicalProgress}
                          onChange={(e) => setFormPhysicalProgress(e.target.value)}
                          placeholder="e.g. Phase 1 Done or 50"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #86efac', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Physical Progress - %
                        </label>
                        <input
                          type="text"
                          value={formPhysicalProgressPct}
                          onChange={(e) => setFormPhysicalProgressPct(e.target.value)}
                          placeholder="e.g. 84%"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #fca5a5', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Financial Progress (Rs. Mn)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formFinancialProgress}
                          onChange={(e) => setFormFinancialProgress(e.target.value)}
                          placeholder="e.g. 42.0"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #86efac', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Financial Progress - %
                        </label>
                        <input
                          type="text"
                          value={formFinancialProgressPct}
                          onChange={(e) => setFormFinancialProgressPct(e.target.value)}
                          placeholder="e.g. 50%"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #fca5a5', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                    </div>
                  </>
                )}

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
