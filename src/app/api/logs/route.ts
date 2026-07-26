import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ADMIN_KEY } from '@/lib/constants';

// GET /api/logs - Fetch all activity logs (Admin-gated)
export async function GET(request: Request) {
  try {
    const adminKeyHeader = request.headers.get('x-admin-key');
    if (adminKeyHeader !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin key' }, { status: 403 });
    }

    const logs = await query('SELECT * FROM FIN_activity_logs ORDER BY timestamp DESC');
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
