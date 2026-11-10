'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut, signIn } from 'next-auth/react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const user = session?.user as any;

  const demoUsers = [
    { username: 'planning.officer',  label: 'MOE Planning Branch', level: 'Level 1 - Organizing Branch' },
    { username: 'admin',             label: 'MOE Data Management Branch', level: 'Level 1 - National Administration' },
    { username: 'ict.officer',       label: 'MOE ICT Branch', level: 'Level 1 - Organizing Branch' },
    { username: 'piriven.officer',   label: 'Piriven division', level: 'Level 1 - Organizing Branch' },
    { username: 'reforms.officer',   label: 'Education Reforms', level: 'Level 1 - Organizing Branch' },
    { username: 'ncoe.officer',      label: 'National College of Education', level: 'Level 1 - Organizing Branch' },
    { username: 'agri.officer',      label: 'Agriculture and Environmental', level: 'Level 1 - Organizing Branch' },
    { username: 'digital.infra',     label: 'Digital Education Infrastructure Development', level: 'Level 1 - Organizing Branch' },
    { username: 'maths.officer',     label: 'Mathematics', level: 'Level 1 - Organizing Branch' },
    { username: 'health.officer',    label: 'School Health and Nutrition', level: 'Level 1 - Organizing Branch' },
    { username: 'galle.it',          label: 'Galle Zone IT Branch', level: 'Target Place Branch' },
    { username: 'galle.coordinator', label: 'Galle Zone Planning Branch', level: 'Level 3 - Zonal Planning Branch' },
    { username: 'southern.it',       label: 'Southern Province IT Branch', level: 'Level 2 - Provincial IT Branch' },
    { username: 'colombo.it',        label: 'Colombo Zone IT Branch', level: 'Target Place Branch' },
  ];

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleQuickSwitch = async (username: string) => {
    setIsSwitching(true);
    setShowSwitchMenu(false);
    await signIn('credentials', { username, password: 'password123', redirect: false });
    setIsSwitching(false);
    window.location.reload();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    setShowNotifMenu(false);
    if (!notif.isRead) {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notif.id }),
      });
      fetchNotifications();
    }
    if (notif.workshopId === 'aip-amendment') {
      // AIP amendment notification: open the annual plan in a new window
      const amendmentMatch = notif.message?.match(/Amendment\s+(\d+)/i);
      const amendmentNumber = amendmentMatch ? parseInt(amendmentMatch[1], 10) : 1;
      window.open(`/annual-plan?amendmentNumber=${amendmentNumber}`, '_blank', 'noopener,noreferrer');
    } else if (notif.workshopId) {
      router.push(`/workshops/${notif.workshopId}`);
    }
  };

  const primaryNavItems = [
    { href: '/dashboard', label: 'Dashboard.' },
    { href: '/budget-forecasting', label: 'Budget Forecasting' },
    { href: '/annual-plan', label: 'Annual Implementation.' },
    { href: '/reports', label: 'Monitoring.' },
  ];

  const shortcutNavItems = [
    { href: '/workshops', icon: '📋', label: 'Workshops Directory' },
    { href: '/resource-persons', icon: '👥', label: 'Resource Persons Directory' },
    { href: '/workshops/new', icon: '➕', label: 'Schedule New Workshop' },
    { href: '/resource-persons/new', icon: '👤', label: 'Register Resource Person' },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    if (href === '/workshops') return pathname.startsWith('/workshops') && pathname !== '/workshops/new';
    if (href === '/annual-plan') return pathname.startsWith('/annual-plan');
    if (href === '/budget-forecasting') return pathname.startsWith('/budget-forecasting');
    if (href === '/reports') return pathname.startsWith('/reports') || pathname.startsWith('/monitoring');
    if (href === '/resource-persons') return pathname.startsWith('/resource-persons') && pathname !== '/resource-persons/new';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="app-layout">

      {/* Hamburger Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ───── Hamburger Menu Drawer ───── */}
      <aside className={`app-sidebar ${mobileNavOpen ? 'mobile-open menu-open' : ''}`}>

        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1.1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.16)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}>
              🎓
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff', lineHeight: 1.25 }}>
                Workshop Management.
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Ministry of Education
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        {/* Navigation List matching sketch */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Primary Nav Links */}
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            {primaryNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`hamburger-nav-item ${active ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '1rem', fontWeight: active ? 700 : 500 }}>
                    {item.label}
                  </span>
                  {active && (
                    <span style={{ color: '#FFBE29', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Workshop Operations / Shortcuts */}
          <div style={{ padding: '1.25rem 1.15rem 0.5rem', marginTop: '0.5rem' }}>
            <div style={{
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              Workshop Operations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {shortcutNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      color: active ? '#FFBE29' : 'rgba(255,255,255,0.85)',
                      background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
                      fontSize: '0.84rem',
                      fontWeight: active ? 600 : 400,
                      textDecoration: 'none',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                      }
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom User Profile & Logout matching sketch */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {/* User Circle Avatar and Branch Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              color: '#fff',
              flexShrink: 0,
            }}>
              👤
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontWeight: 700,
                fontSize: '0.88rem',
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.name || 'MOE Planning branch.'}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.6)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user?.organizationName || 'Level 1 - Organizing Branch'}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.9)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.4)';
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.6)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>logout</span>
          </button>
        </div>
      </aside>

      {/* ───── Main Content ───── */}
      <div className="app-main">

        {/* Top Header Bar */}
        <header className="app-header">
          {/* Left: Hamburger Button & Page Breadcrumb Context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button
              type="button"
              className="hamburger-menu-btn mobile-hamburger-btn"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Open Navigation Menu"
              title="Toggle Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <div className="header-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span className="header-breadcrumb-root" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                Workshop Management System
              </span>
              <span className="header-breadcrumb-root" style={{ color: 'var(--border-medium)' }}>/</span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                {pathname === '/dashboard' ? 'Dashboard.'
                  : pathname === '/budget-forecasting' ? 'Budget Forecasting.'
                  : pathname.startsWith('/annual-plan') ? 'Annual Implementation.'
                  : pathname === '/reports' || pathname === '/monitoring' ? 'Monitoring.'
                  : pathname === '/workshops' ? 'Workshops.'
                  : pathname === '/workshops/new' ? 'Schedule New Workshop.'
                  : pathname === '/resource-persons/new' ? 'Register Resource Person.'
                  : pathname.startsWith('/resource-persons') ? 'Resource Persons.'
                  : pathname === '/organizations' ? 'Organizations.'
                  : pathname.startsWith('/workshops/') ? 'Workshop Details.'
                  : 'Overview.'}
              </span>
            </div>
          </div>

          {/* Right side actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

            {/* 🔔 Notifications Bell with Live Badge */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{
                  position: 'relative',
                  padding: '0.45rem 0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
                title="Notifications from scheduled workshops"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    lineHeight: 1.2,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                    onClick={() => setShowNotifMenu(false)}
                  />
                  <div className="header-dropdown-menu" style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    width: '360px',
                    maxWidth: 'calc(100vw - 1.5rem)',
                    background: 'var(--white)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 150,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--gray-100)',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Notifications ({notifications.length})
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--accent)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid var(--border-light)',
                              background: n.isRead ? 'var(--white)' : 'var(--accent-10)',
                              cursor: 'pointer',
                              transition: 'background var(--ease)',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-100)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = n.isRead ? 'var(--white)' : 'var(--accent-10)'; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {n.title}
                              </div>
                              {!n.isRead && (
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.35rem' }}>
                              {n.message}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                {n.workshopId === 'aip-amendment' ? 'Open & Fill AIP →' : 'View & Assign Participants →'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                          No notifications received yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Test Persona Switcher */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                style={{ fontSize: '0.78rem' }}
              >
                🔄 Switch Persona ▾
              </button>

              {showSwitchMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 149 }}
                    onClick={() => setShowSwitchMenu(false)}
                  />
                  <div className="header-dropdown-menu" style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    width: '320px',
                    maxWidth: 'calc(100vw - 1.5rem)',
                    background: 'var(--white)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 150,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '0.625rem 1rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: 'var(--gray-100)',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      Switch User Role / Place
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {demoUsers.map((u) => (
                        <button
                          key={u.username}
                          type="button"
                          onClick={() => handleQuickSwitch(u.username)}
                          disabled={isSwitching}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.625rem 1rem',
                            background: user?.username === u.username ? 'var(--primary-10)' : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--border-light)',
                            color: user?.username === u.username ? 'var(--primary)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            fontFamily: 'var(--font)',
                          }}
                          onMouseEnter={e => { if (user?.username !== u.username) e.currentTarget.style.background = 'var(--gray-100)'; }}
                          onMouseLeave={e => { if (user?.username !== u.username) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {u.label} {user?.username === u.username && '✓'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{u.level}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>

        {/* ───── Mobile Bottom Navigation Bar ───── */}
        <nav className="mobile-bottom-nav">
          <Link
            href="/dashboard"
            className={`mobile-bottom-nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <span className="icon">📊</span>
            <span>Dashboard</span>
          </Link>
          <Link
            href="/workshops"
            className={`mobile-bottom-nav-item ${isActive('/workshops') ? 'active' : ''}`}
          >
            <span className="icon">📋</span>
            <span>Workshops</span>
          </Link>
          <Link
            href="/workshops/new"
            className={`mobile-bottom-nav-item ${isActive('/workshops/new', true) ? 'active' : ''}`}
            style={{
              transform: 'translateY(-6px)',
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 8px rgba(141, 21, 58, 0.35)',
              fontSize: '1.25rem',
            }}>
              ➕
            </div>
            <span style={{ marginTop: '2px', fontWeight: 600 }}>Schedule</span>
          </Link>
          <Link
            href="/reports"
            className={`mobile-bottom-nav-item ${isActive('/reports') ? 'active' : ''}`}
          >
            <span className="icon">📈</span>
            <span>Reports</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
