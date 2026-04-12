'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Logout action - clears Supabase session
 * This is called whenever a user wants to sign out
 */
export async function logout() {
  const supabase = createClient();

  if (!supabase) {
    redirect('/');
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

