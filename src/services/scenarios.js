/**
 * Scenario management.
 *
 * A scenario describes one tabletop exercise: its crisis category, the ordered
 * list of injects participants respond to (see injects.js) and the learning
 * objectives shown on the participant page. A course then schedules that
 * scenario for a group of participants, so the hierarchy is
 * crisis category -> scenario -> course.
 *
 * Columns: name, description, objectives, course_id, crisis_type, status,
 *          created_at.
 */
import { supabase } from './supabaseClient';
import { DEFAULT_CATEGORIES } from './categories';

export { DEFAULT_CATEGORIES as CRISIS_TYPES };

export const SCENARIO_STATUSES = ['Draft', 'Published', 'Archived'];

const normalizeScenario = (row) => ({
  Id: row.id,
  name: row.title || '',
  description: row.description || '',
  objectives: String(row.objectives || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean),
  courseId: row.courses?.[0]?.id ?? null,
  crisisType: row.crisis_types?.name || 'Other',
  status: row.status || 'Draft',
  createdAt: row.created_at
    ? new Date(row.created_at).toLocaleDateString()
    : '',
  createdAtISO: row.created_at || null,
});

async function resolveCrisisTypeId(crisisType) {
  const cleanName = String(crisisType || 'Other').trim();

  const { data, error } = await supabase
    .from('crisis_types')
    .select('id, name')
    .ilike('name', cleanName)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(`Crisis category "${cleanName}" was not found.`);
  }

  return data.id;
}

export async function listScenarios() {
  const { data, error } = await supabase
    .from('scenarios')
    .select(`
      id,
      title,
      description,
      objectives,
      status,
      created_at,
      crisis_types (
        name
      ),
      courses (
        id
      )
    `)
    .order('id', { ascending: true });

  if (error) {
    console.error('Failed to retrieve scenarios:', error);
    throw new Error(error.message || 'Could not load scenarios');
  }

  return (data || []).map(normalizeScenario);
}

export async function listScenarioRoles(scenarioId) {
    if (!scenarioId) return [];

    const { data, error } = await supabase
      .from('scenario_roles')
      .select('id, role_name, description, scenario_id')
      .eq('scenario_id', scenarioId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Failed to retrieve scenario roles:', error);
      throw new Error(error.message || 'Could not load scenario roles');
    }

    return data || [];
  }

export async function createScenario({
  name,
  description,
  objectives,
  courseId,
  crisisType,
  status,
}) {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    throw new Error('Please enter a scenario name');
  }

  const crisisTypeId = await resolveCrisisTypeId(crisisType);

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      title: cleanName,
      description: String(description || '').trim(),
      objectives: Array.isArray(objectives)
        ? objectives.join('\n')
        : String(objectives || ''),
      crisis_type_id: crisisTypeId,
      status: status || 'Draft',
    })
    .select('id')
    .single();

  if (error) throw error;

  return {
    Id: data.id,
    id: data.id,
  };
}

export async function updateScenario(
  id,
  { name, description, objectives, courseId, crisisType, status }
) {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    throw new Error('Please enter a scenario name');
  }

  const crisisTypeId = await resolveCrisisTypeId(crisisType);

  const { error } = await supabase
    .from('scenarios')
    .update({
      title: cleanName,
      description: String(description || '').trim(),
      objectives: Array.isArray(objectives)
        ? objectives.join('\n')
        : String(objectives || ''),
      crisis_type_id: crisisTypeId,
      status: status || 'Draft',
    })
    .eq('id', id);

  if (error) throw error;

  return { Id: id };
}

export async function deleteScenario(id) {
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
}