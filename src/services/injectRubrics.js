
import { supabase } from './supabaseClient';

// Retrieve all rubrics belonging to an Inject
export async function listInjectRubrics(injectId) {
  const { data, error } = await supabase
    .from('inject_rubrics')
    .select('id, inject_id, scenario_role_id, rubric')
    .eq('inject_id', injectId);

  if (error) throw error;

  return (data || []).map((row) => ({
    Id: row.id,
    injectId: row.inject_id,
    scenarioRoleId: row.scenario_role_id,
    rubric: row.rubric || '',
  }));
}

// Save or update a rubric for a particular Inject and Role

export async function saveInjectRubrics(injectId, roleRubrics) {
  const existing = await listInjectRubrics(injectId);
  const entries = Object.entries(roleRubrics || {});

  const currentRoleIds = new Set(
    entries.map(([roleId]) => Number(roleId))
  );

  // Remove rubrics belonging to roles that no longer exist.
  for (const item of existing) {
    if (!currentRoleIds.has(item.scenarioRoleId)) {
      await deleteInjectRubric(injectId, item.scenarioRoleId);
    }
  }

  // Save non-empty rubrics and remove cleared ones.
  for (const [roleId, rubric] of entries) {
    const cleanRubric = String(rubric || '').trim();

    if (!cleanRubric) {
      await deleteInjectRubric(injectId, Number(roleId));
      continue;
    }

    const { error } = await supabase
      .from('inject_rubrics')
      .upsert(
        {
          inject_id: injectId,
          scenario_role_id: Number(roleId),
          rubric: cleanRubric,
        },
        { onConflict: 'inject_id,scenario_role_id' }
      );

    if (error) throw error;
  }
}


// Delete a rubric for a particular Inject and Role
export async function deleteInjectRubric(injectId, roleId) {
  const { error } = await supabase
    .from('inject_rubrics')
    .delete()
    .eq('inject_id', injectId)
    .eq('scenario_role_id', roleId);

  if (error) throw error;
  
}


/**
 * Retrieve the rubric for one Inject and one Scenario Role.
 */
export async function getInjectRubric(injectId, scenarioRoleId) {
  if (!injectId || !scenarioRoleId) return '';

  const { data, error } = await supabase
    .from('inject_rubrics')
    .select('rubric')
    .eq('inject_id', injectId)
    .eq('scenario_role_id', scenarioRoleId)
    .maybeSingle();

  if (error) throw error;

  return data?.rubric || '';
}

