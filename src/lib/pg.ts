import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

export function isPostgresConfigured(): boolean {
  return Boolean(
    connectionString ||
    (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER)
  );
}

export function getPoolConfig(): PoolConfig {
  if (connectionString) {
    const isLocalhost =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('::1');

    return {
      connectionString,
      ssl: isLocalhost
        ? false
        : {
            rejectUnauthorized: false,
          },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  const isLocal =
    process.env.PGHOST === 'localhost' ||
    process.env.PGHOST === '127.0.0.1';

  return {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'workshop_ms',
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    const config = getPoolConfig();
    global.__pgPool = new Pool(config);

    global.__pgPool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected error on idle client:', err);
    });
  }
  return global.__pgPool;
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const pool = getPool();
  return pool.query<R>(text, params);
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const pool = getPool();
    const res = await pool.query('SELECT NOW() as current_time, current_database() as database');
    return {
      success: true,
      message: `Connected successfully to database "${res.rows[0].database}" at ${res.rows[0].current_time}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to PostgreSQL',
    };
  }
}
