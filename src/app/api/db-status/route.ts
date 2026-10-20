import { NextResponse } from 'next/server';
import { isPostgresConfigured, testConnection, query } from '@/lib/pg';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isPgConfigured = isPostgresConfigured();

  if (!isPgConfigured) {
    const data = await getDb();
    return NextResponse.json({
      status: 'active',
      backend: 'json_fallback',
      message: 'Running with local JSON database fallback. Configure DATABASE_URL to connect to PostgreSQL.',
      counts: {
        organizations: data.organizations.length,
        users: data.users.length,
        workshops: data.workshops.length,
        trainees: data.trainees.length,
        resourcePersons: data.resourcePersons.length,
        notifications: data.notifications.length,
      },
    });
  }

  const connTest = await testConnection();

  if (!connTest.success) {
    return NextResponse.json(
      {
        status: 'degraded',
        backend: 'postgresql_error_fallback_json',
        error: connTest.message,
        tip: 'Check your DATABASE_URL in .env or .env.local to ensure host, port, credentials, and SSL settings are correct.',
      },
      { status: 500 }
    );
  }

  try {
    const [orgs, users, workshops, trainees, rps, notifs] = await Promise.all([
      query('SELECT COUNT(*) as count FROM organizations'),
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM workshops'),
      query('SELECT COUNT(*) as count FROM trainees'),
      query('SELECT COUNT(*) as count FROM resource_persons'),
      query('SELECT COUNT(*) as count FROM notifications'),
    ]);

    return NextResponse.json({
      status: 'healthy',
      backend: 'postgresql',
      connection: connTest.message,
      counts: {
        organizations: parseInt(orgs.rows[0].count, 10),
        users: parseInt(users.rows[0].count, 10),
        workshops: parseInt(workshops.rows[0].count, 10),
        trainees: parseInt(trainees.rows[0].count, 10),
        resourcePersons: parseInt(rps.rows[0].count, 10),
        notifications: parseInt(notifs.rows[0].count, 10),
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'connected_but_query_failed',
      backend: 'postgresql',
      error: err.message,
      tip: 'Run "npm run db:init" to create and seed required PostgreSQL tables.',
    }, { status: 500 });
  }
}
