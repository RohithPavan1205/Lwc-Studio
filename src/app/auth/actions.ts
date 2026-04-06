'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function logout() {
  const supabase = createClient();

  if (!supabase) {
    redirect('/login');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const adminClient = createAdminClient();
    if (adminClient) {
      // Clear Salesforce tokens
      await adminClient.from('salesforce_connections')
        .update({ 
          access_token: null, 
          refresh_token: null, 
          token_expiry: null 
        })
        .eq('user_id', user.id);
    }
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
