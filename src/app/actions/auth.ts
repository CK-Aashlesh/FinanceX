'use server';

import { cookies, headers } from 'next/headers';
import { query, hashPassword } from '@/lib/db';
import crypto from 'crypto';

// Helper to generate a deterministic MAC address from a seed
function getMockMacAddress(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bytes = [];
  for (let i = 0; i < 6; i++) {
    bytes.push(((hash >> (i * 8)) & 0xff).toString(16).padStart(2, '0').toUpperCase());
  }
  // Set locally administered unicast bit
  bytes[0] = ((parseInt(bytes[0], 16) & 0xfe) | 0x02).toString(16).padStart(2, '0').toUpperCase();
  return bytes.join(':');
}

export async function loginSite(emailInput: string, passwordInput: string) {
  // 1. Clean up inactive sessions (older than 10 minutes)
  try {
    await query("DELETE FROM FIN_active_sessions WHERE last_activity < NOW() - INTERVAL 10 MINUTE");
  } catch (e) {
    console.error("Clean active sessions failed:", e);
  }

  const email = String(emailInput).trim().toLowerCase();
  const pass = String(passwordInput);

  // 2. Validate Treasurer credentials in DB
  try {
    const userRows = await query<any[]>(
      "SELECT password_hash FROM FIN_users WHERE email = ? AND role = 'treasurer'",
      [email]
    );

    if (userRows.length === 0 || userRows[0].password_hash !== hashPassword(pass)) {
      return { success: false, error: 'Incorrect email or password' };
    }
  } catch (dbQueryErr) {
    return { success: false, error: 'Database verification failed' };
  }

  // 3. Check for active Treasurer sessions
  try {
    const activeSessions = await query<any[]>(
      "SELECT username FROM FIN_active_sessions WHERE username = ?",
      [email]
    );

    if (activeSessions.length > 0) {
      return { 
        success: false, 
        error: `Account (${email}) is already logged in on another device. Concurrent logins to the same account are not allowed.` 
      };
    }

    // Insert/Update active session
    await query(
      "INSERT INTO FIN_active_sessions (username, role, last_activity) VALUES (?, 'treasurer', CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP",
      [email]
    );
  } catch (dbErr) {
    console.error("Database session lock check failed:", dbErr);
  }

  // 4. Save cookie
  const cookieStore = await cookies();
  cookieStore.set('site_auth', email, {
    httpOnly: false, // Allow client components to read the email for UX greetings
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 2, // 2 hours
    path: '/',
  });

  // 5. Log activity
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const mac = getMockMacAddress(email);
    const logId = crypto.randomUUID();

    await query(
      `INSERT INTO FIN_activity_logs (id, action, username, details)
       VALUES (?, 'LOGIN', ?, ?)`,
      [logId, email, `User logged in from IP: ${ip} (MAC: ${mac})`]
    );
  } catch (logErr) {
    console.error('Failed to log login action:', logErr);
  }

  return { success: true };
}

export async function logoutSite() {
  const cookieStore = await cookies();
  const username = cookieStore.get('site_auth')?.value;
  if (username) {
    try {
      await query("DELETE FROM FIN_active_sessions WHERE username = ?", [username]);
    } catch (e) {}
  }
  cookieStore.delete('site_auth');
  cookieStore.delete('admin_auth');
  cookieStore.delete('admin_user');
  return { success: true };
}

export async function loginAdmin(emailInput: string, passwordInput: string) {
  // 1. Clean up inactive sessions (older than 10 minutes)
  try {
    await query("DELETE FROM FIN_active_sessions WHERE last_activity < NOW() - INTERVAL 10 MINUTE");
  } catch (e) {}

  const email = String(emailInput).trim().toLowerCase();
  const pass = String(passwordInput);

  // 2. Validate Admin credentials in DB
  try {
    const userRows = await query<any[]>(
      "SELECT password_hash FROM FIN_users WHERE email = ? AND role = 'admin'",
      [email]
    );

    if (userRows.length === 0 || userRows[0].password_hash !== hashPassword(pass)) {
      return { success: false, error: 'Incorrect email or password' };
    }
  } catch (dbQueryErr) {
    return { success: false, error: 'Database verification failed' };
  }

  // 3. Check for active Admin sessions
  try {
    const activeSessions = await query<any[]>(
      "SELECT username FROM FIN_active_sessions WHERE username = ?",
      [email]
    );

    if (activeSessions.length > 0) {
      return { 
        success: false, 
        error: `Account (${email}) is already logged in on another device. Concurrent logins to the same account are not allowed.` 
      };
    }

    // Insert/Update active session
    await query(
      "INSERT INTO FIN_active_sessions (username, role, last_activity) VALUES (?, 'admin', CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE last_activity = CURRENT_TIMESTAMP",
      [email]
    );
  } catch (dbErr) {
    console.error("Database admin session check failed:", dbErr);
  }

  // 4. Save cookies
  const cookieStore = await cookies();
  cookieStore.set('admin_auth', 'verified', {
    httpOnly: false, // Allow client components to detect admin status
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 2, // 2 hours admin session
    path: '/',
  });
  cookieStore.set('admin_user', email, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 2,
    path: '/',
  });

  // 5. Log activity
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || '127.0.0.1';
    const mac = getMockMacAddress(email);
    const logId = crypto.randomUUID();

    await query(
      `INSERT INTO FIN_activity_logs (id, action, username, details)
       VALUES (?, 'LOGIN', ?, ?)`,
      [logId, email, `Administrator console unlocked from IP: ${ip} (MAC: ${mac})`]
    );
  } catch (logErr) {
    console.error('Failed to log admin login action:', logErr);
  }

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const username = cookieStore.get('admin_user')?.value;
  if (username) {
    try {
      await query("DELETE FROM FIN_active_sessions WHERE username = ?", [username]);
    } catch (e) {}
  }
  cookieStore.delete('admin_auth');
  cookieStore.delete('admin_user');
  return { success: true };
}

// Session keep-alive heartbeat action
export async function touchSession() {
  try {
    const cookieStore = await cookies();
    const siteAuth = cookieStore.get('site_auth')?.value;
    const adminUser = cookieStore.get('admin_user')?.value;
    const adminAuth = cookieStore.get('admin_auth')?.value;

    if (adminAuth === 'verified' && adminUser) {
      await query(
        "UPDATE FIN_active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE username = ? AND role = 'admin'",
        [adminUser]
      );
    } else if (siteAuth) {
      await query(
        "UPDATE FIN_active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE username = ? AND role = 'treasurer'",
        [siteAuth]
      );
    }
  } catch (e) {
    console.error("Failed to touch active session:", e);
  }
  return { success: true };
}

// Update password action for admin console use
export async function changeUserPassword(targetEmail: string, newPasswordInput: string) {
  try {
    const newHash = hashPassword(newPasswordInput);
    await query("UPDATE FIN_users SET password_hash = ? WHERE email = ?", [newHash, targetEmail]);

    // Log the change
    const cookieStore = await cookies();
    const adminEmail = cookieStore.get('admin_user')?.value || 'admin';
    const logId = crypto.randomUUID();
    await query(
      `INSERT INTO FIN_activity_logs (id, action, username, details)
       VALUES (?, 'UPDATE_PASSWORD', ?, ?)`,
      [logId, adminEmail, `Password changed for user: ${targetEmail}`]
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to change password' };
  }
}
