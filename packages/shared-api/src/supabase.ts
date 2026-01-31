import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
                    process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    process.env.SUPABASE_URL || '';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo: string | null;
          cover: string | null;
          data: any;
          status: string;
          industry_id: string;
          industry_label: string;
          created_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          name: string;
          logo?: string | null;
          cover?: string | null;
          data?: any;
          status?: string;
          industry_id?: string;
          industry_label?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          logo?: string | null;
          cover?: string | null;
          data?: any;
          status?: string;
          industry_id?: string;
          industry_label?: string;
          created_at?: string;
        };
      };
    };
  };
};
