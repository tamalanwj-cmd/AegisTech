
import { createClient } from '@supabase/supabase-js';

console.log('SUPABASE CLIENT FILE LOADED');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabasePublishableKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

supabase.auth.getSession().then(({ data, error }) => {
  console.log(
    'Supabase connection:',
    error ? error.message : 'Connected'
  );
});
