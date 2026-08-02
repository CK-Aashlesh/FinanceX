import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

// GET /api/logs - Fetch all activity logs (Admin-gated)
export async function GET(request: Request) {
  try {
    const adminKeyHeader = request.headers.get('x-admin-key');
    if (!adminKeyHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing Admin key' }, { status: 403 });
    }

    const hashed = crypto.createHash('sha256').update(adminKeyHeader).digest('hex');
    const adminUsers = await query<any[]>('SELECT email FROM FIN_users WHERE password_hash = ? AND role = \'admin\'', [hashed]);
    if (adminUsers.length === 0) {
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
