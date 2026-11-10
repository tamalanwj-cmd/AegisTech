/**
 * Crisis categories — the "crisis type" that classifies a scenario.
 *
 * The five built-in types always exist. Administrators can add more from the
 * Scenarios page ("+ Category") or inline in the Add Scenario dialog; custom
 * categories live in the `categories` table so every administrator sees them
 * and they survive a reload.
 *
 * The table is optional: on an installation that has not run the updated setup
 * script, listCategories() silently falls back to the built-in list and
 * createCategory() explains how to provision it. That keeps an older database
 * fully usable.
 */
import { supabase } from './supabaseClient';

export const DEFAULT_CATEGORIES = [
  'Public Health',
  'Infrastructure',
  'Natural Disaster',
  'Cybersecurity',
  'Other',
];

export const DEFAULT_CATEGORY_SLUG = 'other';

export const CATEGORIES_TABLE_HINT =
  'Could not access the crisis_types table. Please check your Supabase configuration and permissions.';

export const normalizeCategory = (row) => ({
  Id: row.id,
  name: String(row.name || '').trim(),
  createdAt: row.created_at
    ? new Date(row.created_at).toLocaleDateString()
    : '',
});

export async function listCategories() {
  const { data, error } = await supabase
    .from('crisis_types')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to retrieve categories:', error);
    throw new Error(error.message || CATEGORIES_TABLE_HINT);
  }

  const names = new Set(DEFAULT_CATEGORIES);

  (data || [])
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)
    .forEach((name) => names.add(name));

  const custom = [...names]
    .filter((name) => !DEFAULT_CATEGORIES.includes(name))
    .sort((a, b) => a.localeCompare(b));

  return [...DEFAULT_CATEGORIES, ...custom];
}

export async function createCategory(name) {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    throw new Error('Please enter a category name');
  }

  if (cleanName.length > 60) {
    throw new Error('Category names are limited to 60 characters');
  }

  const existing = await listCategories();

  const clash = existing.find(
    (category) => category.toLowerCase() === cleanName.toLowerCase()
  );

  if (clash) {
    throw new Error(`The category "${clash}" already exists`);
  }

  const { data, error } = await supabase
    .from('crisis_types')
    .insert({
      name: cleanName,
      description: '',
    })
    .select('id, name')
    .single();

  if (error) {
    console.error('Failed to create category:', error);
    throw new Error(error.message || 'Could not create category');
  }

  return {
    Id: data.id,
    name: data.name,
  };
}