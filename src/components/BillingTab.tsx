'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import InvoiceHistory from './subscription/InvoiceHistory';
import CheckoutModal from './subscription/CheckoutModal';
import { AnimatePresence } from 'framer-motion';

interface BillingTabProps {
  switchTab?: (tab: string) => void;
}

export default function BillingTab({ switchTab }: BillingTabProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // NOWPayments checkout modal states
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const supabase = createClient();

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/subscriptions/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewInvoice = async (item: any) => {
    setCheckoutPlan(item.plan_id);
    setPaymentStatus(item.status);

    if (item.pay_address) {
      setInvoice({
        payment_id: item.payment_id,
        pay_address: item.pay_address,
        pay_amount: item.pay_amount,
        pay_currency: item.pay_currency
      });
    } else {
      setCreatingInvoice(true);
      try {
        const res = await fetch(`/api/subscriptions/status?paymentId=${item.payment_id}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch invoice details');
        
        setInvoice({
          payment_id: item.payment_id,
          pay_address: data.pay_address || '',
          pay_amount: data.pay_amount || item.pay_amount,
          pay_currency: data.pay_currency || item.pay_currency
        });
        setPaymentStatus(data.status);
      } catch (e) {
        console.error(e);
      } finally {
        setCreatingInvoice(false);
      }
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="sub-page">
      <div className="sub-container" style={{ marginTop: 12 }}>
        <InvoiceHistory
          history={history}
          loading={loadingHistory}
          onRefresh={fetchHistory}
          onViewInvoice={handleViewInvoice}
          onShowPlans={() => switchTab?.('subscription')}
        />
      </div>

      {/* Checkout Modal Overlay for viewing QR codes */}
      <AnimatePresence>
        {checkoutPlan && (
          <CheckoutModal
            isOpen={!!checkoutPlan}
            onClose={() => {
              setCheckoutPlan(null);
              setInvoice(null);
              setPaymentStatus(null);
            }}
            planId={checkoutPlan}
            planName={checkoutPlan === 'pro' ? 'Paid' : 'Free'}
            planPrice={checkoutPlan === 'pro' ? 50 : 0}
            initialInvoice={invoice}
            initialStatus={paymentStatus}
            onSuccess={() => {
              fetchHistory();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
