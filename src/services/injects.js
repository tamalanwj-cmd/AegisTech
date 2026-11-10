/**
 * Inject management for the Scenario Builder. An inject is one timed prompt
 * released to participants, targeted at the role that should respond to it.
 *
 * `rubric` is the marking guide an administrator sees next to the participant's
 * answer on the Marking page, so marks stay consistent between markers.
 *
 * Columns: scenario_id, title, description, information, sequence,
 *          assigned_role, rubric.
 */

import { supabase } from './supabaseClient';

export const normalizeInject = (row) => ({
  Id: row.id,
  scenarioId: row.scenario_id,
  title: row.title || '',
  description: row.description || '',
  information: row.information || '',
  sequence: row.order_number ?? 0,
});

export async function listInjects(scenarioId) {
  let query = supabase
    .from('injects')
    .select(`
      id,
      scenario_id,
      title,
      description,
      information,
      order_number
    `);

  if (scenarioId) {
    query = query.eq('scenario_id', scenarioId);
  }

  const { data, error } = await query.order('order_number', {
    ascending: true,
  });

  if (error) throw error;

  return (data || [])
    .map(normalizeInject)
    .sort((a, b) => a.sequence - b.sequence || a.Id - b.Id);
}

export async function createInject({
  scenarioId,
  title,
  description,
  information,
  sequence,
}) {
  const cleanTitle = String(title || '').trim();

  if (!cleanTitle) throw new Error('Please enter an inject title');
  if (!scenarioId) throw new Error('Missing scenario');

  const { data, error } = await supabase
    .from('injects')
    .insert({
      scenario_id: scenarioId,
      title: cleanTitle,
      description: String(description || '').trim(),
      information: String(information || '').trim(),
      order_number: Number(sequence) || 0,
    })
    .select('id')
    .single();

  if (error) throw error;

  return { Id: data.id };
}

export async function updateInject(
  id,
  { title, description, information, sequence }
) {
  const cleanTitle = String(title || '').trim();

  if (!cleanTitle) throw new Error('Please enter an inject title');

  const { error } = await supabase
    .from('injects')
    .update({
      title: cleanTitle,
      description: String(description || '').trim(),
      information: String(information || '').trim(),
      order_number: Number(sequence) || 0,
    })
    .eq('id', id);

  if (error) throw error;

  return { Id: id };
}

export async function deleteInject(id) {
  const { error } = await supabase
    .from('injects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
