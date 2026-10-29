'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('ict.officer');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid username or password.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const quickLogin = async (user: string) => {
    setUsername(user);
    setPassword('password123');
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      username: user,
      password: 'password123',
      redirect: false,
    });

    if (res?.error) {
      setError('Login failed.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

    const demoAccounts = [
    {
      level: 'Level 1 – Organizing Branch',
      name: 'MOE Planning Branch',
      role: 'Planning & Statistics Branch',
      username: 'planning.officer',
      desc: 'Plans educational census and statistical training workshops for zonal offices.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – National Administration',
      name: 'MOE Data Management Branch',
      role: 'National Data Management & System Administration',
      username: 'admin',
      desc: 'Full national oversight, user role administration, and national reporting.',
      badgeColor: '#C96200',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'MOE ICT Branch',
      role: 'ICT Education Branch',
      username: 'ict.officer',
      desc: 'Schedules workshops: Year, Branch, Subject, Title, Objectives, Host Branch, Days.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'Piriven division',
      role: 'Piriven Education Branch',
      username: 'piriven.officer',
      desc: 'Monastic education institutions, piriven teacher training and development.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'Education Reforms',
      role: 'Education Reforms Branch',
      username: 'reforms.officer',
      desc: 'National educational restructuring, new curriculum frameworks and modernizations.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'National College of Education',
      role: 'NCOE Coordinating Branch',
      username: 'ncoe.officer',
      desc: 'Pre-service teacher training, college administration, and admission coordination.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'Agriculture and Environmental',
      role: 'Agriculture & Environmental Branch',
      username: 'agri.officer',
      desc: 'School agricultural clubs, green school projects, and environmental sustainability.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'Digital Education Infrastructure Development',
      role: 'Digital Infrastructure Branch',
      username: 'digital.infra',
      desc: 'National smart classroom rollouts, school IT infrastructure and network development.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'Mathematics',
      role: 'Mathematics Branch',
      username: 'maths.officer',
      desc: 'National mathematics education, Olympiad preparation, and teacher subject competency.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Level 1 – Organizing Branch',
      name: 'School Health and Nutrition',
      role: 'School Health & Nutrition Branch',
      username: 'health.officer',
      desc: 'School meal programs, adolescent health assessments, and sanitation standards.',
      badgeColor: '#8D153A',
    },
    {
      level: 'Target Place Branch',
      name: 'Galle Zone IT Branch',
      role: 'Zonal IT Branch (Place Coordinator)',
      username: 'galle.it',
      desc: 'Receives notification of scheduled workshop, adds trainees & resource persons, exports Excel.',
      badgeColor: '#00534E',
    },
    {
      level: 'Level 3 – Zonal Branch',
      name: 'Galle Zone Planning Branch',
      role: 'Zonal Planning Branch Coordinator',
      username: 'galle.coordinator',
      desc: 'Zonal coordinator managing regional educational events and teacher registries.',
      badgeColor: '#00534E',
    },
    {
      level: 'Level 2 – Provincial Branch',
      name: 'Southern Province IT Branch',
      role: 'Provincial IT Branch Coordinator',
      username: 'southern.it',
      desc: 'Provincial level coordination, participant management, and oversight.',
      badgeColor: '#00534E',
    },
    {
      level: 'Target Place Branch',
      name: 'Colombo Zone IT Branch',
      role: 'Zonal IT Branch (Place Coordinator)',
      username: 'colombo.it',
      desc: 'Receives workshop notifications, manages regional participant rosters.',
      badgeColor: '#00534E',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #F8F9FA 0%, #EDEFEF 100%)',
        padding: '2.5rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '1060px' }}>
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1rem auto',
              borderRadius: '12px',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(141, 21, 58, 0.25)',
            }}
          >
            🎓
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
            }}
          >
            Ministry of Education • Sri Lanka
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Workshop Management System
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.92rem' }}>
            National Education Planning • Provincial & Zonal Hierarchy Module
          </p>
        </div>

        {/* 2-Column Grid: Left Login Form, Right Hierarchy Fast-Login */}
        <div
          className="login-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 380px) 1fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Form */}
          <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
              Sign In
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter your organizational credentials
            </p>

            {error && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error)',
                  color: 'var(--error)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. ict.officer"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.35rem', display: 'block' }}>
                  Default demo password: <code>password123</code>
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '0.75rem' }}
              >
                {loading ? <div className="spinner" /> : 'Log In to System'}
              </button>
            </form>

            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-light)',
                fontSize: '0.78rem',
                color: 'var(--text-tertiary)',
                lineHeight: 1.5,
              }}
            >
              🔒 <strong>Hierarchy Access Control Enforced</strong>: Workshop planning target selections and approval rights depend on your branch & level.
            </div>
          </div>

          {/* Right Column: Fast Hierarchy Selectors */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>1-Click Hierarchy Test Login</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Click any profile below to instantly log in as that organizational unit:
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-10)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  border: '1px solid var(--accent)',
                }}
              >
                Instant Access
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '0.875rem',
                maxHeight: '620px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {demoAccounts.map((account) => (
                <div
                  key={account.username}
                  onClick={() => quickLogin(account.username)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--white)',
                    border: '1px solid var(--border-light)',
                    borderLeft: `4px solid ${account.badgeColor}`,
                    cursor: 'pointer',
                    transition: 'all var(--ease)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = account.badgeColor;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.borderLeftColor = account.badgeColor;
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: account.badgeColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {account.level}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                      Log In →
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {account.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {account.role}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                    {account.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
