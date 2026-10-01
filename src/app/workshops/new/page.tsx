'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';
import { formatWorkshopId, getNextSequenceForBranch } from '@/lib/workshopId';

const DEFAULT_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

const DEFAULT_SUBJECTS = [
  'Information & Communication Technology',
  'Mathematics',
  'Science & Technology',
  'English Language',
  'Sinhala Language & Literature',
  'Tamil Language & Literature',
  'STEM Education',
  'Commerce & Accounting',
  'Educational Leadership & Administration',
  'Special Needs Education',
  'Health & Physical Education',
  'Aesthetic Studies (Art / Music / Dance)',
];

interface HierarchyOrg {
  id: string;
  name: string;
  code: string;
  typeId: string;
  typeName: string;
  level: number;
  parentId: string | null;
  unitType: string;
  childrenCount: number;
  branchCount: number;
  hasChildren: boolean;
  hasBranches: boolean;
  branches?: HierarchyOrg[];
}

interface HostAssignment {
  orgId: string;
  orgName: string;
  branchId: string;
  branchName: string;
  targetPath: string[];
  availableBranches: HierarchyOrg[];
}

type TargetLevel = 'national' | 'province' | 'zone' | 'school';

const LEVEL_INFO: Record<TargetLevel, { title: string; subtitle: string; icon: string; badge: string }> = {
  national: { title: 'MOE / NIE', subtitle: 'Ministry or NIE level branches', icon: '🏛️', badge: 'Level 1' },
  province: { title: 'Province', subtitle: 'Provincial Education Departments', icon: '🏢', badge: 'Level 2' },
  zone: { title: 'Zone', subtitle: 'Zonal Education Offices across Sri Lanka', icon: '📍', badge: 'Level 3' },
  school: { title: 'School', subtitle: 'Schools & Educational Institutions', icon: '🏫', badge: 'Level 4' },
};

export default function NewWorkshopPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  // Metadata
  const [organizingBranches, setOrganizingBranches] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>(DEFAULT_SUBJECTS);
  const [yearsList, setYearsList] = useState<string[]>(DEFAULT_YEARS);
  const [existingWsNumbers, setExistingWsNumbers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // ── Core Form State ──────────────────────────────────────────────────
  const currentYear = new Date().getFullYear().toString();
  const [year, setYear] = useState(currentYear || '2026');
  const [branch, setBranch] = useState('MOE - ICT Branch');
  const [subject, setSubject] = useState('Information & Communication Technology');
  const [customSubject, setCustomSubject] = useState('');
  const [workshopTitle, setWorkshopTitle] = useState('');
  const [objectives, setObjectives] = useState<string[]>(['']);
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [daysHeld, setDaysHeld] = useState('3');
  const [startDate, setStartDate] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState<'Confirmed' | 'Tentative'>('Confirmed');

  // ── Host Organization Type: Internal vs External ──────────────────────
  const [selfOrganize, setSelfOrganize] = useState(false);

  // ── Hierarchical Step-by-Step State ───────────────────────────────────
  // Step 1: Target Level
  const [targetLevel, setTargetLevel] = useState<TargetLevel | ''>('zone');

  // Master Data Cache
  const [allNationalOrgs, setAllNationalOrgs] = useState<HierarchyOrg[]>([]);
  const [allProvinces, setAllProvinces] = useState<HierarchyOrg[]>([]);
  const [allZones, setAllZones] = useState<HierarchyOrg[]>([]);
  const [allSchools, setAllSchools] = useState<HierarchyOrg[]>([]);
  const [branchesCache, setBranchesCache] = useState<Record<string, HierarchyOrg[]>>({});
  const [loadingData, setLoadingData] = useState(false);

  // Step 2 Filters & Selections
  // Level: MOE / NIE
  const [selectedNationalOrgId, setSelectedNationalOrgId] = useState('');

  // Level: Province
  const [provinceScope, setProvinceScope] = useState<'all' | 'selected'>('all');
  const [selectedProvinceId, setSelectedProvinceId] = useState('');

  // Level: Zone
  const [zoneProvinceFilter, setZoneProvinceFilter] = useState<string>('all');
  const [zoneScope, setZoneScope] = useState<'all' | 'selected'>('all');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');

  // Level: School
  const [schoolProvinceId, setSchoolProvinceId] = useState('');
  const [schoolZoneId, setSchoolZoneId] = useState('');
  const [schoolScope, setSchoolScope] = useState<'all' | 'selected'>('selected');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

  // Step 3: Default Branch to apply to batch
  const [defaultBranchName, setDefaultBranchName] = useState('Zonal IT Branch');

  // Step 4: Final Host Assignments Table
  const [hostAssignments, setHostAssignments] = useState<HostAssignment[]>([]);

  // ── Load hierarchy summary on mount ──────────────────────────────────
  useEffect(() => {
    async function loadHierarchy() {
      setLoadingData(true);
      try {
        const res = await fetch('/api/organizations/hierarchy');
        if (res.ok) {
          const data = await res.json();
          setAllNationalOrgs(data.summary?.national || []);
          setAllProvinces(data.summary?.provinces || []);
          setAllZones(data.summary?.zones || []);
          setAllSchools(data.summary?.schools || []);

          if (data.summary?.national?.length > 0) {
            setSelectedNationalOrgId(data.summary.national[0].id);
          }
          if (data.summary?.provinces?.length > 0) {
            setSchoolProvinceId(data.summary.provinces[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load hierarchy:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadHierarchy();
  }, []);

  // ── Load organization metadata for form fields ────────────────────────
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const data = await res.json();
          if (data.organizingBranches) setOrganizingBranches(data.organizingBranches);
          if (data.subjects && data.subjects.length > 0) setSubjectsList(data.subjects);
          if (data.years && data.years.length > 0) {
            setYearsList(Array.from(new Set([...DEFAULT_YEARS, ...data.years])).sort());
          }
          if (data.existingWorkshopNumbers) setExistingWsNumbers(data.existingWorkshopNumbers);
          if (user?.organizationName) setBranch(user.organizationName);
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, [user]);

  // ── Fetch branches helper ─────────────────────────────────────────────
  const fetchBranchesForOrgs = useCallback(async (orgIds: string[]) => {
    const missing = orgIds.filter((id) => !branchesCache[id]);
    if (missing.length === 0) return branchesCache;

    try {
      const res = await fetch(`/api/organizations/hierarchy?parentIds=${missing.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        const updated = { ...branchesCache, ...(data.branchesByParent || {}) };
        setBranchesCache(updated);
        return updated;
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
    return branchesCache;
  }, [branchesCache]);

  // ── Compute Zones available based on Province filter ──────────────────
  const visibleZones = useMemo(() => {
    let list = allZones;
    if (zoneProvinceFilter !== 'all') {
      list = list.filter((z) => z.parentId === zoneProvinceFilter);
    }
    if (zoneSearchQuery.trim()) {
      const q = zoneSearchQuery.toLowerCase();
      list = list.filter((z) => z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q));
    }
    return list;
  }, [allZones, zoneProvinceFilter, zoneSearchQuery]);

  // ── Compute Zones for School step ─────────────────────────────────────
  const schoolAvailableZones = useMemo(() => {
    if (!schoolProvinceId) return [];
    return allZones.filter((z) => z.parentId === schoolProvinceId);
  }, [allZones, schoolProvinceId]);

  // Set default school zone when province changes
  useEffect(() => {
    if (schoolAvailableZones.length > 0 && !schoolAvailableZones.some((z) => z.id === schoolZoneId)) {
      setSchoolZoneId(schoolAvailableZones[0].id);
    }
  }, [schoolAvailableZones, schoolZoneId]);

  // ── Compute Schools available based on selected Zone ──────────────────
  const visibleSchools = useMemo(() => {
    let list = allSchools;
    if (schoolZoneId) {
      list = list.filter((s) => s.parentId === schoolZoneId);
    }
    if (schoolSearchQuery.trim()) {
      const q = schoolSearchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    return list;
  }, [allSchools, schoolZoneId, schoolSearchQuery]);

  // ── Automatically update Host Assignments when selection changes ──────
  useEffect(() => {
    if (selfOrganize) return;

    let isMounted = true;

    async function syncAssignments() {
      let targetOrgs: HierarchyOrg[] = [];
      let parentPathMap: Record<string, string[]> = {};

      if (targetLevel === 'national') {
        const org = allNationalOrgs.find((o) => o.id === selectedNationalOrgId);
        if (org) {
          targetOrgs = [org];
          parentPathMap[org.id] = [org.id];
        }
      } else if (targetLevel === 'province') {
        if (provinceScope === 'all') {
          targetOrgs = allProvinces;
          allProvinces.forEach((p) => { parentPathMap[p.id] = [p.id]; });
        } else {
          const prov = allProvinces.find((p) => p.id === selectedProvinceId);
          if (prov) {
            targetOrgs = [prov];
            parentPathMap[prov.id] = [prov.id];
          }
        }
      } else if (targetLevel === 'zone') {
        if (zoneScope === 'all') {
          targetOrgs = visibleZones;
        } else {
          targetOrgs = allZones.filter((z) => selectedZoneIds.includes(z.id));
        }
        targetOrgs.forEach((z) => {
          parentPathMap[z.id] = [z.parentId || '', z.id].filter(Boolean);
        });
      } else if (targetLevel === 'school') {
        if (schoolScope === 'all') {
          targetOrgs = visibleSchools;
        } else {
          targetOrgs = allSchools.filter((s) => selectedSchoolIds.includes(s.id));
        }
        targetOrgs.forEach((s) => {
          parentPathMap[s.id] = [schoolProvinceId, schoolZoneId, s.id].filter(Boolean);
        });
      }

      if (targetOrgs.length === 0) {
        if (isMounted) setHostAssignments([]);
        return;
      }

      // Fetch branches for target orgs
      const orgIds = targetOrgs.map((o) => o.id);
      const cache = await fetchBranchesForOrgs(orgIds);

      if (!isMounted) return;

      // Construct assignments
      const assignments: HostAssignment[] = targetOrgs.map((org) => {
        const branches = cache[org.id] || [];

        // Pick branch matching defaultBranchName using robust semantic matching
        const def = defaultBranchName.toLowerCase();
        let selectedBranch = branches.find((b: HierarchyOrg) =>
          b.name.toLowerCase() === def || b.name.toLowerCase().includes(def)
        );

        if (!selectedBranch) {
          if (def.includes('it') || def.includes('ict')) {
            selectedBranch = branches.find((b: HierarchyOrg) => /\b(it|ict)\b/i.test(b.name));
          } else if (def.includes('plan')) {
            selectedBranch = branches.find((b: HierarchyOrg) => /plan/i.test(b.name));
          } else if (def.includes('educat')) {
            selectedBranch = branches.find((b: HierarchyOrg) => /educat/i.test(b.name));
          } else if (def.includes('admin')) {
            selectedBranch = branches.find((b: HierarchyOrg) => /admin/i.test(b.name));
          } else if (def.includes('train')) {
            selectedBranch = branches.find((b: HierarchyOrg) => /train/i.test(b.name));
          }
        }

        const shortOrg = org.name.replace(/ Zonal Education Office| Education Department/g, '').trim();
        const branchId = selectedBranch?.id || org.id;
        const branchName = selectedBranch ? selectedBranch.name : `${shortOrg} ${defaultBranchName}`;
        const targetPath = [...(parentPathMap[org.id] || []), branchId !== org.id ? branchId : ''].filter(Boolean);

        return {
          orgId: org.id,
          orgName: org.name,
          branchId,
          branchName,
          targetPath,
          availableBranches: branches,
        };
      });

      setHostAssignments(assignments);
    }

    syncAssignments();

    return () => {
      isMounted = false;
    };
  }, [
    selfOrganize,
    targetLevel,
    selectedNationalOrgId,
    provinceScope,
    selectedProvinceId,
    zoneScope,
    selectedZoneIds,
    zoneProvinceFilter,
    visibleZones,
    schoolScope,
    selectedSchoolIds,
    schoolProvinceId,
    schoolZoneId,
    visibleSchools,
    defaultBranchName,
  ]);

  // ── Handler for updating single host assignment branch ────────────────
  const handleUpdateAssignmentBranch = (orgId: string, branchId: string) => {
    setHostAssignments((prev) =>
      prev.map((a) => {
        if (a.orgId !== orgId) return a;
        const br = a.availableBranches.find((b) => b.id === branchId);
        const branchName = br ? `${a.orgName} → ${br.name}` : a.orgName;
        const targetPath = [...a.targetPath.slice(0, -1), branchId];
        return {
          ...a,
          branchId,
          branchName,
          targetPath,
        };
      })
    );
  };

  // ── Handler to remove an assignment ───────────────────────────────────
  const handleRemoveAssignment = (orgId: string) => {
    setHostAssignments((prev) => prev.filter((a) => a.orgId !== orgId));
    if (targetLevel === 'zone') {
      setSelectedZoneIds((prev) => prev.filter((id) => id !== orgId));
    } else if (targetLevel === 'school') {
      setSelectedSchoolIds((prev) => prev.filter((id) => id !== orgId));
    }
  };

  // ── Checkbox helpers ──────────────────────────────────────────────────
  const handleToggleZone = (zoneId: string) => {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleSelectAllVisibleZones = () => {
    const ids = visibleZones.map((z) => z.id);
    setSelectedZoneIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearAllZones = () => {
    setSelectedZoneIds([]);
  };

  const handleToggleSchool = (schoolId: string) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  };

  const handleSelectAllVisibleSchools = () => {
    const ids = visibleSchools.map((s) => s.id);
    setSelectedSchoolIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleClearAllSchools = () => {
    setSelectedSchoolIds([]);
  };

  // ── Objectives / Outcomes handlers ───────────────────────────────────
  const handleAddObjective = () => setObjectives((prev) => [...prev, '']);
  const handleRemoveObjective = (index: number) => {
    setObjectives((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  };
  const handleObjectiveChange = (index: number, val: string) => {
    setObjectives((prev) => { const copy = [...prev]; copy[index] = val; return copy; });
  };
  const handleAddOutcome = () => setOutcomes((prev) => [...prev, '']);
  const handleRemoveOutcome = (index: number) => {
    setOutcomes((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  };
  const handleOutcomeChange = (index: number, val: string) => {
    setOutcomes((prev) => { const copy = [...prev]; copy[index] = val; return copy; });
  };

  // ── Live Workshop ID Preview ──────────────────────────────────────────
  const workshopIdPreview = useMemo(() => {
    const seq = getNextSequenceForBranch(branch, existingWsNumbers);
    return formatWorkshopId(branch, startDate, seq);
  }, [branch, startDate, existingWsNumbers]);

  // ── Submit Handler ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessBanner('');

    const finalSubject = subject === 'Other' ? customSubject.trim() : subject;

    if (!year) { setError('Please select the Year.'); return; }
    if (!branch.trim()) { setError('Please provide the Organizing Branch.'); return; }
    if (!finalSubject) { setError('Please specify the Subject.'); return; }
    if (!workshopTitle.trim()) { setError('Please provide the Workshop title / name.'); return; }

    const validObjectives = objectives.map((o) => o.trim()).filter(Boolean);
    if (validObjectives.length === 0) { setError('Please provide at least one Objective of the workshop.'); return; }

    const validOutcomes = outcomes.map((o) => o.trim()).filter(Boolean);
    if (validOutcomes.length === 0) { setError('Please provide at least one Expected Outcome.'); return; }

    const days = parseInt(daysHeld, 10);
    if (!days || days < 1) { setError('Please specify how many days the workshop will be held.'); return; }

    if (!selfOrganize && hostAssignments.length === 0) {
      setError('Please select at least one Host Organization / Branch to conduct the workshop.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        year,
        branch,
        subject: finalSubject,
        workshop: workshopTitle,
        aim: validObjectives.join('\n'),
        expectedOutput: validOutcomes.join('\n'),
        daysHeld: days,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        confirmationStatus,
        selfOrganize,
      };

      if (selfOrganize) {
        payload.placeId = user?.organizationId;
        payload.placeName = user?.organizationName || 'Internal';
      } else {
        payload.targetLevel = targetLevel;
        payload.hostAssignments = hostAssignments.map((a) => ({
          placeId: a.branchId,
          placeName: a.branchName,
          targetPath: a.targetPath,
        }));
      }

      const res = await fetch('/api/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to create workshop');
        setSubmitting(false);
        return;
      }

      if (json.batch && json.count > 1) {
        setSuccessBanner(`🎉 Successfully created ${json.count} workshops across selected hosts! Redirecting...`);
        setTimeout(() => {
          router.push('/workshops');
        }, 1500);
      } else if (json.workshop?.id) {
        router.push(`/workshops/${json.workshop.id}`);
      } else {
        router.push('/workshops');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setSubmitting(false);
    }
  };

  // ── Render Step 1: Target Level ──────────────────────────────────────
  const renderStep1TargetLevel = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)',
            color: '#fff', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
          }}>1</span>
          <span>Target Level: Who should conduct this workshop?</span>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {(Object.keys(LEVEL_INFO) as TargetLevel[]).map((lvl) => {
          const info = LEVEL_INFO[lvl];
          const isSelected = targetLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setTargetLevel(lvl);
                if (lvl === 'zone') setDefaultBranchName('Zonal IT Branch');
                else if (lvl === 'school') setDefaultBranchName('ICT Unit');
                else if (lvl === 'province') setDefaultBranchName('Provincial IT Branch');
                else setDefaultBranchName('ICT Branch');
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)',
                border: '2px solid',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border-default)',
                background: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--white)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{info.icon}</span>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                  borderRadius: '10px', background: isSelected ? 'var(--primary)' : 'var(--border-light)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                }}>
                  {info.badge}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                {info.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                {info.subtitle}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Render Step 2: Select Organization(s) ────────────────────────────
  const renderStep2Organizations = () => {
    if (!targetLevel) return null;

    return (
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)',
              color: '#fff', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
            }}>2</span>
            <span>Select Organization(s)</span>
          </label>
        </div>

        {/* Level: MOE / NIE */}
        {targetLevel === 'national' && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {allNationalOrgs.map((org) => {
              const isSelected = selectedNationalOrgId === org.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedNationalOrgId(org.id)}
                  style={{
                    padding: '0.65rem 1.2rem', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-default)',
                    background: isSelected ? 'var(--primary-10)' : 'var(--white)',
                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  🏛️ {org.name} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        )}

        {/* Level: Province */}
        {targetLevel === 'province' && (
          <div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.85rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="radio" name="provinceScope" value="all"
                  checked={provinceScope === 'all'} onChange={() => setProvinceScope('all')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>All Provinces ({allProvinces.length} Provinces)</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                <input
                  type="radio" name="provinceScope" value="selected"
                  checked={provinceScope === 'selected'} onChange={() => setProvinceScope('selected')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>Single Province</span>
              </label>
            </div>

            {provinceScope === 'selected' && (
              <select
                className="form-select"
                value={selectedProvinceId}
                onChange={(e) => setSelectedProvinceId(e.target.value)}
                style={{ maxWidth: '400px' }}
              >
                <option value="">-- Select Province --</option>
                {allProvinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Level: Zone */}
        {targetLevel === 'zone' && (
          <div>
            {/* Province Filter & Scope Radio */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Province:</span>
                <select
                  className="form-select"
                  value={zoneProvinceFilter}
                  onChange={(e) => setZoneProvinceFilter(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', width: 'auto' }}
                >
                  <option value="all">All Provinces (Nationwide - {allZones.length} Zones)</option>
                  {allProvinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="radio" name="zoneScope" value="all"
                    checked={zoneScope === 'all'} onChange={() => setZoneScope('all')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>All Zones ({visibleZones.length})</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="radio" name="zoneScope" value="selected"
                    checked={zoneScope === 'selected'} onChange={() => setZoneScope('selected')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Selected Zones ({selectedZoneIds.length} chosen)</span>
                </label>
              </div>
            </div>

            {/* Checkbox grid if "Selected Zones" */}
            {zoneScope === 'selected' && (
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                padding: '0.85rem', border: '1px solid var(--border-default)', marginTop: '0.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Search zones..."
                    value={zoneSearchQuery}
                    onChange={(e) => setZoneSearchQuery(e.target.value)}
                    style={{ maxWidth: '260px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={handleSelectAllVisibleZones} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                      ☑ Select All ({visibleZones.length})
                    </button>
                    <button type="button" onClick={handleClearAllZones} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                      ☐ Clear All
                    </button>
                  </div>
                </div>

                <div style={{
                  maxHeight: '220px', overflowY: 'auto', display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.45rem',
                }}>
                  {visibleZones.map((z) => {
                    const isChecked = selectedZoneIds.includes(z.id);
                    return (
                      <label
                        key={z.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)',
                          background: isChecked ? 'var(--primary-10)' : 'var(--white)',
                          border: '1px solid',
                          borderColor: isChecked ? 'var(--primary)' : 'var(--border-light)',
                          cursor: 'pointer', fontSize: '0.8rem', fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleZone(z.id)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          📍 {z.name.replace(' Zonal Education Office', '')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Level: School */}
        {targetLevel === 'school' && (
          <div>
            {/* Cascading selectors: Province -> Zone */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Province:</span>
                <select
                  className="form-select"
                  value={schoolProvinceId}
                  onChange={(e) => setSchoolProvinceId(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', width: 'auto' }}
                >
                  {allProvinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Zone:</span>
                <select
                  className="form-select"
                  value={schoolZoneId}
                  onChange={(e) => setSchoolZoneId(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', width: 'auto' }}
                >
                  {schoolAvailableZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name.replace(' Zonal Education Office', '')}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="radio" name="schoolScope" value="all"
                    checked={schoolScope === 'all'} onChange={() => setSchoolScope('all')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>All Schools ({visibleSchools.length})</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                  <input
                    type="radio" name="schoolScope" value="selected"
                    checked={schoolScope === 'selected'} onChange={() => setSchoolScope('selected')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Selected Schools ({selectedSchoolIds.length} chosen)</span>
                </label>
              </div>
            </div>

            {/* Checkbox grid for schools */}
            {schoolScope === 'selected' && (
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                padding: '0.85rem', border: '1px solid var(--border-default)', marginTop: '0.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Search schools..."
                    value={schoolSearchQuery}
                    onChange={(e) => setSchoolSearchQuery(e.target.value)}
                    style={{ maxWidth: '260px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={handleSelectAllVisibleSchools} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                      ☑ Select All ({visibleSchools.length})
                    </button>
                    <button type="button" onClick={handleClearAllSchools} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                      ☐ Clear All
                    </button>
                  </div>
                </div>

                <div style={{
                  maxHeight: '220px', overflowY: 'auto', display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.45rem',
                }}>
                  {visibleSchools.map((s) => {
                    const isChecked = selectedSchoolIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)',
                          background: isChecked ? 'var(--primary-10)' : 'var(--white)',
                          border: '1px solid',
                          borderColor: isChecked ? 'var(--primary)' : 'var(--border-light)',
                          cursor: 'pointer', fontSize: '0.8rem', fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSchool(s.id)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          🏫 {s.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render Step 3: Branch / Division Selection ────────────────────────
  const renderStep3BranchSelection = () => {
    if (hostAssignments.length === 0) return null;

    return (
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)',
              color: '#fff', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
            }}>3</span>
            <span>Select Responsible Branch / Division / Unit</span>
          </label>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)',
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
          flexWrap: 'wrap',
        }}>
          <select
            className="form-select"
            value={defaultBranchName}
            onChange={(e) => setDefaultBranchName(e.target.value)}
            style={{ maxWidth: '280px', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            {targetLevel === 'zone' && (
              <>
                <option value="Zonal IT Branch">Zonal IT Branch</option>
                <option value="Zonal Education Branch">Zonal Education Branch</option>
                <option value="Planning Branch">Planning Branch</option>
              </>
            )}
            {targetLevel === 'school' && (
              <>
                <option value="ICT Unit">School ICT Unit</option>
                <option value="Administration">Administration Unit</option>
              </>
            )}
            {targetLevel === 'province' && (
              <>
                <option value="Provincial IT Branch">Provincial IT Branch</option>
                <option value="Education Branch">Education Branch</option>
              </>
            )}
            {targetLevel === 'national' && (
              <>
                <option value="ICT Branch">ICT Branch</option>
                <option value="Planning Branch">Planning Branch</option>
                <option value="Training Branch">Training Branch</option>
              </>
            )}
          </select>
        </div>
      </div>
    );
  };

  // ── Render Step 4: Host Assignments Table ─────────────────────────────
  const renderStep4HostAssignments = () => {
    if (hostAssignments.length === 0) return null;

    return (
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)',
              color: '#fff', fontWeight: 700, fontSize: '0.75rem', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
            }}>4</span>
            <span>Host Assignment(s) ({hostAssignments.length} scheduled)</span>
          </label>

          <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px',
            background: hostAssignments.length > 1 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: hostAssignments.length > 1 ? 'var(--primary)' : 'var(--success)',
          }}>
            {hostAssignments.length === 1 ? '1 Host Assignment' : `Batch: ${hostAssignments.length} Host Assignments`}
          </span>
        </div>

        {/* Assignments Table */}
        <div style={{
          maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', background: 'var(--white)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>#</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {targetLevel === 'zone' ? 'Zone' : targetLevel === 'school' ? 'School' : targetLevel === 'province' ? 'Province' : 'Organization'}
                </th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Responsible Host Branch / Unit</th>
                <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {hostAssignments.map((assignment, index) => (
                <tr
                  key={assignment.orgId}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    background: index % 2 === 0 ? 'var(--white)' : 'rgba(0,0,0,0.01)',
                  }}
                >
                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {assignment.orgName}
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                      {assignment.availableBranches.find((b) => b.id === assignment.branchId)?.name || assignment.branchName}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(assignment.orgId)}
                      className="btn btn-ghost btn-sm"
                      title="Remove this host assignment"
                      style={{ color: 'var(--error)', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Confirmation Banner */}
        <div style={{
          marginTop: '0.85rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.08)', border: '1.5px solid rgba(16, 185, 129, 0.25)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.3rem' }}>📢</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Ready to dispatch {hostAssignments.length} workshop notification{hostAssignments.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              Each selected host branch will automatically receive their official notification and have this workshop added to their schedule.
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Schedule New Educational Workshop</h1>
            <p className="page-subtitle">
              Fill the details below to schedule the workshop and automatically dispatch notifications across the hierarchy
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            ⚠️ {error}
          </div>
        )}

        {successBanner && (
          <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
            {successBanner}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Workshop ID (Auto-generated) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  🆔 Workshop ID <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontWeight: 500 }}>(Auto-generated sequence)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={workshopIdPreview}
                  readOnly
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--primary-10)',
                    border: '1.5px solid var(--primary-20)',
                    letterSpacing: '0.03em',
                    cursor: 'default',
                  }}
                />
              </div>

              {/* 1. Year & 2. Organizing Branch */}
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    📅 Year <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    🏢 Organizing Branch <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. MOE - ICT Branch"
                    list="branches-list"
                    required
                  />
                  <datalist id="branches-list">
                    {organizingBranches.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                    <option value="MOE - ICT Branch" />
                    <option value="MOE - Planning Branch" />
                    <option value="MOE - Curriculum Development Branch" />
                    <option value="MOE - Quality Assurance Branch" />
                    <option value="National Institute of Education" />
                  </datalist>
                </div>
              </div>

              {/* 3. Subject */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  📚 Subject <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                >
                  {subjectsList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="Other">Other (Type custom subject)...</option>
                </select>

                {subject === 'Other' && (
                  <input
                    type="text"
                    className="form-input"
                    style={{ marginTop: '0.5rem' }}
                    placeholder="Enter custom subject name..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* 4. Workshop Name / Title */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  🎓 Workshop (Title / Name) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Practical Web Development & Cloud Pedagogy Workshop"
                  value={workshopTitle}
                  onChange={(e) => setWorkshopTitle(e.target.value)}
                  required
                />
              </div>

              {/* 5. Objectives */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  🎯 Objectives of the Workshop <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                  {objectives.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'var(--primary-10)', color: 'var(--primary)',
                        fontWeight: 700, fontSize: '0.8rem', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: '1.5px solid var(--primary-20)',
                      }}>
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Objective #${idx + 1} (e.g. Equip teachers with advanced tools for digital pedagogy)`}
                        value={item}
                        onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                        required={idx === 0}
                        style={{ flex: 1 }}
                      />
                      {objectives.length > 1 && (
                        <button type="button" onClick={() => handleRemoveObjective(idx)} className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)', padding: '0.4rem 0.65rem', fontSize: '0.85rem', fontWeight: 700 }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.65rem' }}>
                  <button type="button" onClick={handleAddObjective} className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    ➕ Add more objectives
                  </button>
                </div>
              </div>

              {/* Expected Outcomes */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  📦 Expected Outcomes <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                  {outcomes.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'var(--primary-10)', color: 'var(--primary)',
                        fontWeight: 700, fontSize: '0.8rem', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: '1.5px solid var(--primary-20)',
                      }}>
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Expected Outcome #${idx + 1} (e.g. 50 Teachers certified in Python programming pedagogy)`}
                        value={item}
                        onChange={(e) => handleOutcomeChange(idx, e.target.value)}
                        required={idx === 0}
                        style={{ flex: 1 }}
                      />
                      {outcomes.length > 1 && (
                        <button type="button" onClick={() => handleRemoveOutcome(idx)} className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)', padding: '0.4rem 0.65rem', fontSize: '0.85rem', fontWeight: 700 }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.65rem' }}>
                  <button type="button" onClick={handleAddOutcome} className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    ➕ Add more outcomes
                  </button>
                </div>
              </div>

              {/* 6. Host Branch Selection: Internal vs External Hierarchical Cascade */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  📍 Host Branch Selection <span className="required">*</span>
                </label>

                {/* Choice Buttons: Internal vs External */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelfOrganize(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.55rem',
                      padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)',
                      border: '2px solid',
                      borderColor: selfOrganize ? 'var(--primary)' : 'var(--border-default)',
                      background: selfOrganize ? 'var(--primary-10)' : 'var(--white)',
                      color: selfOrganize ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                      transition: 'all var(--ease)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🏠</span>
                    <span>Internal</span>
                    {selfOrganize && <span style={{ fontSize: '0.85rem', marginLeft: '0.2rem' }}>✓</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelfOrganize(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.55rem',
                      padding: '0.65rem 1.25rem', borderRadius: 'var(--radius-md)',
                      border: '2px solid',
                      borderColor: !selfOrganize ? 'var(--primary)' : 'var(--border-default)',
                      background: !selfOrganize ? 'var(--primary-10)' : 'var(--white)',
                      color: !selfOrganize ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                      transition: 'all var(--ease)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🏢</span>
                    <span>External</span>
                    {!selfOrganize && <span style={{ fontSize: '0.85rem', marginLeft: '0.2rem' }}>✓</span>}
                  </button>
                </div>

                {selfOrganize ? (
                  <div style={{
                    padding: '0.9rem 1.2rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(37, 99, 235, 0.05)', border: '1.5px solid rgba(37, 99, 235, 0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.85rem',
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>🏛️</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                        {user?.organizationName || 'Internal Branch'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        This workshop will be conducted internally at your own branch.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '1.25rem', borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-secondary)', border: '1.5px solid var(--border-light)',
                  }}>
                    {renderStep1TargetLevel()}
                    {renderStep2Organizations()}
                    {renderStep3BranchSelection()}
                    {renderStep4HostAssignments()}
                  </div>
                )}
              </div>

              {/* 7. How many days & Start Date */}
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    ⏳ How Many Days It Held <span className="required">*</span>
                  </label>
                  <input
                    type="number" min="1" max="30" className="form-input"
                    placeholder="e.g. 3" value={daysHeld}
                    onChange={(e) => setDaysHeld(e.target.value)} required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', display: 'block' }}>
                    Total duration in days (e.g. 2, 3, or 5 days)
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">🗓️ Start Date</label>
                  <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>

              {/* 8. Schedule Status */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Schedule Status <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginTop: '0.4rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <input type="radio" name="confirmationStatus" value="Confirmed"
                      checked={confirmationStatus === 'Confirmed'} onChange={() => setConfirmationStatus('Confirmed')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <span>Confirmed</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <input type="radio" name="confirmationStatus" value="Tentative"
                      checked={confirmationStatus === 'Tentative'} onChange={() => setConfirmationStatus('Tentative')}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <span>Tentative</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Submit Action */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)',
              flexWrap: 'wrap', gap: '1rem',
            }}>
              <button type="button" className="btn btn-ghost" onClick={() => router.back()} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting
                  ? 'Scheduling & Notifying...'
                  : selfOrganize
                    ? '🚀 Schedule Internal Workshop'
                    : hostAssignments.length > 1
                      ? `🚀 Submit & Dispatch to ${hostAssignments.length} Hosts`
                      : '🚀 Submit & Send Notification to Host Branch'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </AppShell>
  );
}
