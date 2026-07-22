import { useState, useEffect, useCallback } from 'react';

export interface ReferralData {
  profileData: any;
  networkMembers: any[];
  ratesData: any;
  analyticsData: any;
  walletStats: any;
  transactions: any[];
  milestones: any[];
  
  // Loader States
  loadingProfile: boolean;
  loadingNetwork: boolean;
  loadingRates: boolean;
  loadingAnalytics: boolean;
  loadingWallet: boolean;
  loadingMilestones: boolean;
  isLoadingAll: boolean;

  // Refresh functions
  refreshWallet: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useReferralData(): ReferralData {
  const [profileData, setProfileData] = useState<any>(null);
  const [networkMembers, setNetworkMembers] = useState<any[]>([]);
  const [ratesData, setRatesData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  // Loaders
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingNetwork, setLoadingNetwork] = useState(true);
  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(true);

  // Chained Milestones Fetcher
  const fetchMilestones = useCallback(async (userId: string) => {
    try {
      setLoadingMilestones(true);
      const res = await fetch(`/api/milestones?userId=${userId}`);
      const data = await res.json();
      console.log('[RH Hook] Milestones API:', data);
      if (data.success) {
        setMilestones(data.milestones || []);
      }
    } catch (e) {
      console.error('[RH Hook] Error fetching milestones:', e);
    } finally {
      setLoadingMilestones(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const res = await fetch('/api/referral/profile');
      const data = await res.json();
      console.log('[RH Hook] Profile API:', data);
      if (data.success || data.referralCode || data.id) {
        setProfileData(data);
        if (data.id) {
          fetchMilestones(data.id);
        } else {
          setLoadingMilestones(false);
        }
      } else {
        setLoadingMilestones(false);
      }
    } catch (e) {
      console.error('[RH Hook] Error fetching profile:', e);
      setLoadingMilestones(false);
    } finally {
      setLoadingProfile(false);
    }
  }, [fetchMilestones]);

  const fetchNetwork = useCallback(async () => {
    try {
      setLoadingNetwork(true);
      const res = await fetch('/api/referral/network');
      const data = await res.json();
      console.log('[RH Hook] Network API:', data);
      if (data.members) {
        setNetworkMembers(data.members);
      }
    } catch (e) {
      console.error('[RH Hook] Error fetching network:', e);
    } finally {
      setLoadingNetwork(false);
    }
  }, []);

  const fetchRates = useCallback(async () => {
    try {
      setLoadingRates(true);
      const res = await fetch('/api/referral/rates');
      const data = await res.json();
      console.log('[RH Hook] Rates API:', data);
      if (data.success || data.levels) {
        setRatesData(data);
      }
    } catch (e) {
      console.error('[RH Hook] Error fetching rates:', e);
    } finally {
      setLoadingRates(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch('/api/referral/analytics');
      const data = await res.json();
      console.log('[RH Hook] Analytics API:', data);
      if (data.success || data.summary) {
        setAnalyticsData(data);
      }
    } catch (e) {
      console.error('[RH Hook] Error fetching analytics:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      setLoadingWallet(true);
      const res = await fetch('/api/wallet');
      const data = await res.json();
      console.log('[RH Hook] Wallet API:', data);
      if (data.success || data.wallet) {
        setWalletStats(data.wallet);
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error('[RH Hook] Error fetching wallet:', e);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchProfile(),
      fetchNetwork(),
      fetchRates(),
      fetchAnalytics(),
      fetchWallet()
    ]);
  }, [fetchProfile, fetchNetwork, fetchRates, fetchAnalytics, fetchWallet]);

  // Initial loading on mount
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const isLoadingAll =
    loadingProfile ||
    loadingNetwork ||
    loadingRates ||
    loadingAnalytics ||
    loadingWallet ||
    loadingMilestones;

  return {
    profileData,
    networkMembers,
    ratesData,
    analyticsData,
    walletStats,
    transactions,
    milestones,
    loadingProfile,
    loadingNetwork,
    loadingRates,
    loadingAnalytics,
    loadingWallet,
    loadingMilestones,
    isLoadingAll,
    refreshWallet: fetchWallet,
    refreshProfile: fetchProfile,
    refreshAll,
  };
}
