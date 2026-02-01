import { FilterRelationship } from '@/lib/api/supabase/stats';

export interface CascadedOptions {
  categories: string[];
  equipment: string[];
  modifiers: string[];
}

export function computeCascadedOptions(
  relationships: FilterRelationship[],
  selectedCategories?: string[],
  selectedEquipment?: string[],
  selectedModifiers?: string[]
): CascadedOptions {
  // Categories: narrow based on equipment + modifiers selections
  const categories = [...new Set(
    relationships
      .filter(r => !selectedEquipment?.length || (r.equipment !== null && selectedEquipment.includes(r.equipment)))
      .filter(r => !selectedModifiers?.length || selectedModifiers.some(m => r.modifiers.includes(m)))
      .map(r => r.category)
  )].sort();

  // Equipment: narrow based on categories + modifiers selections
  const equipment = [...new Set(
    relationships
      .filter(r => r.equipment !== null)
      .filter(r => !selectedCategories?.length || selectedCategories.includes(r.category))
      .filter(r => !selectedModifiers?.length || selectedModifiers.some(m => r.modifiers.includes(m)))
      .map(r => r.equipment!)
  )].sort();

  // Modifiers: narrow based on categories + equipment selections
  const modifiers = [...new Set(
    relationships
      .filter(r => !selectedCategories?.length || selectedCategories.includes(r.category))
      .filter(r => !selectedEquipment?.length || (r.equipment !== null && selectedEquipment.includes(r.equipment)))
      .flatMap(r => r.modifiers)
  )].sort();

  return { categories, equipment, modifiers };
}
