'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Coins, FileText, BookOpen, Zap, Clock, CheckCircle2, XCircle, ChevronDown, Copy } from 'lucide-react';
import { generateInvoicePdf } from '@/lib/invoicePdf';

interface InvoiceItem {
  id: string;
  payment_id: string;
  created_at: string;
  type: string;
  category?: string;
  plan_id?: string;
  pay_amount?: number;
  price_amount?: number;
  pay_currency?: string;
  status: string;
}

interface InvoiceHistoryProps {
  history: InvoiceItem[];
  loading: boolean;
  onRefresh: () => void;
  onViewInvoice: (item: any) => void;
  onShowPlans: () => void;
}

export default function InvoiceHistory({ history, loading, onRefresh, onViewInvoice, onShowPlans }: InvoiceHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDescription = (desc: string) => {
    if (!desc) return '—';
    // Remove starting underscores
    let cleaned = desc.replace(/^_+/, '');
    // Replace underscores/hyphens with spaces
    cleaned = cleaned.replace(/[_-]+/g, ' ');
    // Capitalize words
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="invoice-history-section" style={{ marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Coins style={{ width: 22, height: 22, color: 'var(--accent)' }} />
            Billing & Invoice History
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--subtext)' }}>
            Real-time status of your payments. Tap on any invoice row below to expand detail logs or download PDF receipts.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="profile-save-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: 'var(--subtext)' }}>
          <RefreshCw className="animate-spin" style={{ width: 18, height: 18 }} />
          <span>Loading invoice history...</span>
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--subtext)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 16 }}>
          <Coins style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No invoices yet</div>
          <div>Go to <button onClick={onShowPlans} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Subscription Plans</button> to get started.</div>
        </div>
      ) : (
        <div className="invoice-list-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence>
            {history.map((item) => {
              const isCourse = item.type === 'course_purchase';
              const itemId = item.payment_id || item.id;
              const isExpanded = expandedId === itemId;
              
              // Status mapping
              const isCompleted = item.status === 'completed' || item.status === 'finished';
              const isPending = item.status === 'pending' || item.status === 'confirming';
              const isFailed = item.status === 'expired' || item.status === 'failed';

              const title = isCourse 
                ? formatDescription(item.category || item.plan_id || 'Course Purchase')
                : `${formatDescription(item.plan_id || 'Pro')} Plan`;

              return (
                <motion.div
                  key={itemId}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => toggleExpand(itemId)}
                  style={{
                    background: 'var(--sidebar-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '16px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                    transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
                  }}
                  whileHover={{ borderColor: 'var(--accent)' }}
                >
                  {/* Collapsed Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Icon Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isCourse ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                        color: isCourse ? '#f59e0b' : '#818cf8',
                        flexShrink: 0
                      }}>
                        {isCourse ? <BookOpen style={{ width: 18, height: 18 }} /> : <Zap style={{ width: 18, height: 18 }} />}
                      </span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          {title}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--subtext)' }}>
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      {/* Amount */}
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                        ${(Number(item.price_amount) || 0).toFixed(2)}
                      </span>

                      {/* Status Pill */}
                      {isCourse && isCompleted ? (
                        <span className="invoice-status-pill completed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 style={{ width: 11, height: 11 }} />
                          Completed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => !isCourse && onViewInvoice(item)}
                          className={`invoice-status-pill ${item.status}`}
                          style={{
                            border: 'none',
                            cursor: isCourse ? 'default' : 'pointer',
                            transition: 'all 0.15s',
                            outline: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title={isCourse ? '' : 'Click to view payment QR code'}
                        >
                          {isCompleted && <CheckCircle2 style={{ width: 11, height: 11 }} />}
                          {isPending && <Clock style={{ width: 11, height: 11 }} className="animate-pulse" />}
                          {isFailed && <XCircle style={{ width: 11, height: 11 }} />}
                          {isCompleted ? 'Completed' : item.status}
                        </button>
                      )}

                      {/* Chevron Indicator */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <ChevronDown
                          style={{
                            width: 16,
                            height: 16,
                            color: 'var(--subtext)',
                            marginLeft: 4
                          }}
                        />
                      </motion.div>
                    </div>
                  </div>

                  {/* Expanded Details Body */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          style={{
                            marginTop: 16,
                            paddingTop: 16,
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                            {/* Transaction Details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <div>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice ID</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', wordBreak: 'break-all' }}>
                                    {item.payment_id || item.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopy(item.payment_id || item.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 2,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      color: copiedId === (item.payment_id || item.id) ? '#10b981' : 'var(--subtext)',
                                      fontSize: 11,
                                      fontWeight: 600
                                    }}
                                    title="Copy ID"
                                  >
                                    <Copy style={{ width: 12, height: 12 }} />
                                    {copiedId === (item.payment_id || item.id) && <span>Copied!</span>}
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</p>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Coins style={{ width: 14, height: 14, color: 'var(--subtext)' }} />
                                  <span>Crypto Deposit via NOWPayments</span>
                                </p>
                              </div>

                              <div>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Crypto Total</p>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                                  {item.pay_amount ?? item.price_amount ?? '—'}{' '}
                                  <span style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 700 }}>{(item.pay_currency || 'USD').toUpperCase()}</span>
                                </p>
                              </div>
                            </div>

                            {/* Receipt Summary Box */}
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--border)',
                              borderRadius: 12,
                              padding: 16,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              justifyContent: 'center'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--subtext)' }}>Subtotal</span>
                                <span style={{ color: 'var(--text)', fontWeight: 600 }}>${(Number(item.price_amount) || 0).toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--subtext)' }}>Gateway / Network Fee</span>
                                <span style={{ color: 'var(--text)', fontWeight: 600 }}>$0.00</span>
                              </div>
                              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                                <span style={{ color: 'var(--text)' }}>Total Paid</span>
                                <span style={{ color: 'var(--accent)' }}>${(Number(item.price_amount) || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              {isPending && !isCourse && (
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--subtext)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>⚠️</span> Tap the status badge above to view the QR code & complete your deposit.
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const configRes = await fetch('/api/invoice-config');
                                const invoiceCfg = configRes.ok ? await configRes.json() : undefined;
                                await generateInvoicePdf(item as any, invoiceCfg);
                              }}
                              className="pdf-btn"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: '8px 16px',
                                color: 'var(--text)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <FileText style={{ width: 14, height: 14, color: 'var(--subtext)' }} />
                              Download PDF Receipt
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
