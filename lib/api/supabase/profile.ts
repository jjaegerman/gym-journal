import { supabase } from './client';

export interface UnitPreferences {
  weightUnit: 'kg' | 'lbs';
  distanceUnit: 'km' | 'miles';
}

export async function getUserUnitPreferences(): Promise<UnitPreferences> {
  const { data, error } = await supabase.rpc('get_user_unit_preferences');
  if (error) {
    console.error('Error fetching unit preferences:', error);
    throw error;
  }
  const row = data?.[0];
  return {
    weightUnit: (row?.preferred_weight_unit ?? 'lbs') as 'kg' | 'lbs',
    distanceUnit: (row?.preferred_distance_unit ?? 'miles') as 'km' | 'miles',
  };
}

export async function updateUserUnitPreferences(prefs: UnitPreferences): Promise<void> {
  const { error } = await supabase.rpc('update_user_unit_preferences', {
    p_weight_unit: prefs.weightUnit,
    p_distance_unit: prefs.distanceUnit,
  });
  if (error) {
    console.error('Error updating unit preferences:', error);
    throw error;
  }
}
