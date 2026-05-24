import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from './useAdmin';

interface RevenueTransaction {
  id: string;
  transaction_id: string;
  created_at: string;
  amount_nzd: number;
  payment_type: string;
  subscription_tier: string | null;
  business_id: string | null;
  business_name: string;
  business_email: string | null;
  stripe_invoice_id: string | null;
  stripe_customer_id: string | null;
  payment_status: string;
  is_manual: boolean;
  manual_notes: string | null;
  gst_amount: number;
  metadata: any;
}

interface FinancialMetrics {
  totalRevenue: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
  averageRevenuePerBusiness: number;
  premiumCount: number;
  eliteCount: number;
  spotlightCount: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export function useFinancialData() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  const fetchTransactions = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('revenue_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateRange.startDate) {
        query = query.gte('created_at', dateRange.startDate.toISOString());
      }
      if (dateRange.endDate) {
        query = query.lte('created_at', dateRange.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, dateRange]);

  const calculateMetrics = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Fetch all transactions for metrics
      const { data: allTransactions } = await supabase
        .from('revenue_transactions')
        .select('*')
        .eq('payment_status', 'paid');

      if (!allTransactions) return;

      const totalRevenue = allTransactions.reduce((sum, t) => sum + Number(t.amount_nzd), 0);
      
      const revenueThisWeek = allTransactions
        .filter(t => new Date(t.created_at) >= startOfWeek)
        .reduce((sum, t) => sum + Number(t.amount_nzd), 0);

      const revenueThisMonth = allTransactions
        .filter(t => new Date(t.created_at) >= startOfMonth)
        .reduce((sum, t) => sum + Number(t.amount_nzd), 0);

      const revenueThisYear = allTransactions
        .filter(t => new Date(t.created_at) >= startOfYear)
        .reduce((sum, t) => sum + Number(t.amount_nzd), 0);

      // Get subscription counts from businesses table
      const { data: businesses } = await supabase
        .from('businesses')
        .select('subscription_plan, status');

      const activeBusinesses = businesses?.filter(b => b.status === 'approved') || [];
      const premiumCount = activeBusinesses.filter(b => b.subscription_plan === 'premium').length;
      const eliteCount = activeBusinesses.filter(b => b.subscription_plan === 'elite').length;
      const spotlightCount = allTransactions.filter(t => t.subscription_tier === 'spotlight').length;

      const activeSubscriptions = premiumCount + eliteCount;
      const churnedSubscriptions = allTransactions.filter(t => t.payment_status === 'refunded').length;

      const uniqueBusinesses = new Set(allTransactions.map(t => t.business_id).filter(Boolean));
      const averageRevenuePerBusiness = uniqueBusinesses.size > 0 ? totalRevenue / uniqueBusinesses.size : 0;

      setMetrics({
        totalRevenue,
        revenueThisWeek,
        revenueThisMonth,
        revenueThisYear,
        activeSubscriptions,
        churnedSubscriptions,
        averageRevenuePerBusiness,
        premiumCount,
        eliteCount,
        spotlightCount
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  }, [isAdmin]);

  const syncStripeData = async () => {
    if (!isAdmin) return;
    
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('sync-stripe-revenue', {
        body: { 
          startDate: dateRange.startDate?.toISOString(),
          endDate: dateRange.endDate?.toISOString()
        }
      });

      if (response.error) throw response.error;
      
      // Refresh data after sync
      await fetchTransactions();
      await calculateMetrics();
      
      return response.data;
    } catch (error) {
      console.error('Error syncing Stripe data:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const addManualEntry = async (entry: {
    amount_nzd: number;
    payment_type: string;
    business_name: string;
    business_email?: string;
    notes?: string;
  }) => {
    if (!isAdmin) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('revenue_transactions').insert({
        transaction_id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount_nzd: entry.amount_nzd,
        payment_type: entry.payment_type,
        business_name: entry.business_name,
        business_email: entry.business_email || null,
        payment_status: 'paid',
        is_manual: true,
        manual_notes: entry.notes || null,
        gst_amount: entry.amount_nzd * 0.15 / 1.15,
        recorded_by: userData.user?.id
      });

      if (error) throw error;

      // Log the action
      await supabase.from('financial_audit_logs').insert({
        admin_id: userData.user?.id,
        action: 'manual_entry',
        details: { entry }
      });

      // Refresh data
      await fetchTransactions();
      await calculateMetrics();
    } catch (error) {
      console.error('Error adding manual entry:', error);
      throw error;
    }
  };

  const logAuditAction = async (action: string, details: Record<string, any>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from('financial_audit_logs').insert({
        admin_id: userData.user.id,
        action,
        details
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!isAdmin) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get transaction details for audit log before deleting
      const transaction = transactions.find(t => t.id === transactionId);
      
      // Log the deletion action first (keep immutable record)
      await supabase.from('financial_audit_logs').insert({
        admin_id: userData.user?.id,
        action: 'delete_transaction',
        details: { 
          transaction_id: transaction?.transaction_id,
          business_name: transaction?.business_name,
          amount: transaction?.amount_nzd,
          deleted_at: new Date().toISOString()
        }
      });

      // Delete the record
      const { error } = await supabase
        .from('revenue_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Refresh data
      await fetchTransactions();
      await calculateMetrics();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      fetchTransactions();
      calculateMetrics();
    }
  }, [adminLoading, isAdmin, fetchTransactions, calculateMetrics]);

  return {
    transactions,
    metrics,
    loading: loading || adminLoading,
    syncing,
    dateRange,
    setDateRange,
    syncStripeData,
    addManualEntry,
    deleteTransaction,
    logAuditAction,
    refreshData: () => {
      fetchTransactions();
      calculateMetrics();
    }
  };
}
