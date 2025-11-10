import { supabase } from './client';

/**
 * Authentication API
 * All auth-related operations in one place
 */

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, emailRedirectTo?: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
}

/**
 * Sign out the current user
 */
export async function signOut() {
  return supabase.auth.signOut();
}

/**
 * Update the current user's password
 */
export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({
    password: newPassword,
  });
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(email: string, redirectTo?: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
}

/**
 * Get the current session
 */
export async function getSession() {
  return supabase.auth.getSession();
}

/**
 * Set session from access and refresh tokens
 */
export async function setSession(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Start auto-refresh (for app state management)
 */
export function startAutoRefresh() {
  return supabase.auth.startAutoRefresh();
}

/**
 * Stop auto-refresh (for app state management)
 */
export function stopAutoRefresh() {
  return supabase.auth.stopAutoRefresh();
}
