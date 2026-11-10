import { supabase } from './supabaseClient';

export async function listScenarioRoles(scenarioId) {
  const { data, error } = await supabase
    .from('scenario_roles')
    .select('id, scenario_id, role_name, description')
    .eq('scenario_id', scenarioId)
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    Id: row.id,
    scenarioId: row.scenario_id,
    name: row.role_name || '',
    description: row.description || '',
  }));
}

export async function createScenarioRole(scenarioId, name, description = '') {
  const cleanName = String(name || '').trim();

  if (!cleanName) throw new Error('Please enter a role name');

  const { data, error } = await supabase
    .from('scenario_roles')
    .insert({
      scenario_id: scenarioId,
      role_name: cleanName,
      description: String(description || '').trim(),
    })
    .select('id, scenario_id, role_name, description')
    .single();

  if (error) throw error;

  return {
    Id: data.id,
    scenarioId: data.scenario_id,
    name: data.role_name,
    description: data.description || '',
  };
}

export async function updateScenarioRole(id, name, description = '') {
  const cleanName = String(name || '').trim();

  if (!cleanName) throw new Error('Please enter a role name');

  const { error } = await supabase
    .from('scenario_roles')
    .update({
      role_name: cleanName,
      description: String(description || '').trim(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteScenarioRole(id) {
  const { error } = await supabase
    .from('scenario_roles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}