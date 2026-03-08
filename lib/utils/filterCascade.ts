import { FilterRelationship } from '@/lib/api/supabase/stats';

export interface CascadedOptions {
  exercise_kinds: string[];
  equipment: string[];
  modifiers: string[];
}

export function computeCascadedOptions(
  relationships: FilterRelationship[],
  selectedExerciseKinds?: string[],
  selectedEquipment?: string[],
  selectedModifiers?: string[]
): CascadedOptions {
  // Exercise kinds: narrow based on equipment + modifiers selections
  const exercise_kinds = [...new Set(
    relationships
      .filter(r => !selectedEquipment?.length || (r.equipment !== null && selectedEquipment.includes(r.equipment)))
      .filter(r => !selectedModifiers?.length || selectedModifiers.some(m => r.modifiers.includes(m)))
      .map(r => r.exercise_kind)
  )].sort();

  // Equipment: narrow based on exercise_kinds + modifiers selections
  const equipment = [...new Set(
    relationships
      .filter(r => r.equipment !== null)
      .filter(r => !selectedExerciseKinds?.length || selectedExerciseKinds.includes(r.exercise_kind))
      .filter(r => !selectedModifiers?.length || selectedModifiers.some(m => r.modifiers.includes(m)))
      .map(r => r.equipment!)
  )].sort();

  // Modifiers: narrow based on exercise_kinds + equipment selections
  const modifiers = [...new Set(
    relationships
      .filter(r => !selectedExerciseKinds?.length || selectedExerciseKinds.includes(r.exercise_kind))
      .filter(r => !selectedEquipment?.length || (r.equipment !== null && selectedEquipment.includes(r.equipment)))
      .flatMap(r => r.modifiers)
  )].sort();

  return { exercise_kinds, equipment, modifiers };
}
