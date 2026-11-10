
import { supabase } from './supabaseClient';

const normalizeGroup = (row) => ({
  Id: row.id,
  name: row.group_name || '',
  description: row.description || '',
  members: (row.group_members || []).map(
    (member) => member.account_id
  ),
  createdAt: row.created_at
    ? new Date(row.created_at).toLocaleDateString()
    : '',
});

export async function listGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id,
      group_name,
      description,
      created_at,
      group_members (
        account_id
      )
    `)
    .order('id', { ascending: true });

  if (error) throw error;

  return (data || []).map(normalizeGroup);
}

export async function createGroup({ name, description, members }) {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    throw new Error('Please enter a group name');
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      group_name: cleanName,
      description: String(description || '').trim(),
    })
    .select('id')
    .single();

  if (error) throw error;

  const memberIds = [...new Set(members || [])];

  if (memberIds.length > 0) {
    const { error: memberError } = await supabase
      .from('group_members')
      .insert(
        memberIds.map((accountId) => ({
          group_id: data.id,
          account_id: accountId,
        }))
      );

    if (memberError) {
      await supabase.from('groups').delete().eq('id', data.id);
      throw memberError;
    }
  }

  return data;
}

export async function updateGroup(id, { name, description, members }) {
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    throw new Error('Please enter a group name');
  }

  const { error } = await supabase
    .from('groups')
    .update({
      group_name: cleanName,
      description: String(description || '').trim(),
    })
    .eq('id', id);

  if (error) throw error;

  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', id);

  if (deleteError) throw deleteError;

  const memberIds = [...new Set(members || [])];

  if (memberIds.length > 0) {
    const { error: insertError } = await supabase
      .from('group_members')
      .insert(
        memberIds.map((accountId) => ({
          group_id: id,
          account_id: accountId,
        }))
      );

    if (insertError) throw insertError;
  }
}

export async function deleteGroup(id) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
