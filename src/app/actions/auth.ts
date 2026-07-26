'use server';

import { cookies } from 'next/headers';
import { SITE_PASSWORDS, ADMIN_KEY } from '@/lib/constants';

export async function loginSite(password: string) {
  const matchedUser = SITE_PASSWORDS.find(u => u === password);
  if (matchedUser) {
    const cookieStore = await cookies();
    cookieStore.set('site_auth', matchedUser, {
      httpOnly: false, // Allow client components to read the username for UX greetings
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return { success: true };
  }
  return { success: false, error: 'Incorrect password' };
}

export async function logoutSite() {
  const cookieStore = await cookies();
  cookieStore.delete('site_auth');
  cookieStore.delete('admin_auth'); // Also clear admin session on site logout
  return { success: true };
}

export async function loginAdmin(adminKey: string) {
  if (adminKey === ADMIN_KEY) {
    const cookieStore = await cookies();
    cookieStore.set('admin_auth', 'verified', {
      httpOnly: false, // Allow client components to detect admin status
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 2, // 2 hours admin session
      path: '/',
    });
    return { success: true };
  }
  return { success: false, error: 'Invalid admin key' };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_auth');
  return { success: true };
}
