import { supabase } from './supabase';
import type { KesfetOrder } from '@tikprofil/shared-types';

export async function getUserOrders(userId: string, status?: KesfetOrder['status']): Promise<KesfetOrder[]> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getUserOrders] Error:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    businessId: row.business_id,
    businessName: row.business_name,
    businessLogo: row.business_logo,
    businessSlug: row.business_slug,
    items: row.items || [],
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getOrderById(orderId: string): Promise<KesfetOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    businessId: data.business_id,
    businessName: data.business_name,
    businessLogo: data.business_logo,
    businessSlug: data.business_slug,
    items: data.items || [],
    total: data.total,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function subscribeToOrders(userId: string, callback: (order: KesfetOrder) => void) {
  return supabase
    .channel('orders-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          const order: KesfetOrder = {
            id: payload.new.id,
            userId: payload.new.user_id,
            businessId: payload.new.business_id,
            businessName: payload.new.business_name,
            businessLogo: payload.new.business_logo,
            businessSlug: payload.new.business_slug,
            items: payload.new.items || [],
            total: payload.new.total,
            status: payload.new.status,
            createdAt: payload.new.created_at,
            updatedAt: payload.new.updated_at,
          };
          callback(order);
        }
      }
    )
    .subscribe();
}
