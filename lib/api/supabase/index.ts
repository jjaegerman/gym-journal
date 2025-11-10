/**
 * Supabase API
 *
 * Organized Supabase client and operations.
 * Import from here for clean, organized API access.
 *
 * @example
 * // Import specific modules
 * import { signIn, signOut } from '@/lib/api/supabase/auth';
 * import { getUserWorkouts } from '@/lib/api/supabase/workouts';
 *
 * // Or import everything
 * import * as SupabaseAPI from '@/lib/api/supabase';
 */

// Core client
export { supabase } from './client';

// Auth operations
export * from './auth';

// Workout operations
export * from './workouts';

// Edge functions
export * from './functions';
