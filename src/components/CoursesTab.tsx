'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, X, Lock, Wallet, Bitcoin, LayoutGrid, Zap, BarChart3 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_id: string;
  thumbnail_url: string;
  category: string;
  duration: string;
  order_index: number;
}

export default function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingVideo, setPlayingVideo] = useState<Course | null>(null);

  // Paid courses state
  const [categoryPricing, setCategoryPricing] = useState<Record<string, number>>({});
  const [purchasedCategories, setPurchasedCategories] = useState<string[]>([]);
  const [purchaseModal, setPurchaseModal] = useState<{ category: string; price: number; count: number } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  useEffect(() => {
    fetchCourses();
    fetchWallet();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.courses || []);
      setCategoryPricing(data.categoryPricing || {});
      setPurchasedCategories(data.purchasedCategories || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.wallet) setWalletBalance(data.wallet.available || 0);
    } catch { /* ok */ }
  };

  const isCategoryPaid = (cat: string) => {
    const price = categoryPricing[cat];
    return price !== undefined && price > 0;
  };

  const isCategoryUnlocked = (cat: string) => {
    return !isCategoryPaid(cat) || purchasedCategories.includes(cat);
  };

  const handlePurchase = async (method: 'wallet' | 'crypto') => {
    if (!purchaseModal) return;
    setPurchasing(true);
    setPurchaseError('');
    try {
      const res = await fetch('/api/courses/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: purchaseModal.category,
          method,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (method === 'wallet') {
          setPurchasedCategories(prev => [...prev, purchaseModal.category]);
          setWalletBalance(data.new_balance ?? walletBalance - purchaseModal.price);
          setPurchaseModal(null);
        } else if (data.invoice_url) {
          // Open NOWPayments hosted invoice page (multi-currency selector)
          window.open(data.invoice_url, '_blank');
          setPurchaseModal(null);
        }
      } else {
        setPurchaseError(data.error || 'Purchase failed');
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(courses.map(c => c.category)))];

  const filtered = courses.filter(c => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = activeCategory === 'all'
    ? categories.filter(c => c !== 'all').map(cat => ({
        category: cat,
        items: filtered.filter(c => c.category === cat),
      })).filter(g => g.items.length > 0)
    : [{ category: activeCategory, items: filtered }];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .course-card {
          animation: fadeInUp 0.4s ease-out both;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
        }
        .course-card.locked:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }
        .course-thumb-wrap:hover .course-play-overlay {
          opacity: 1;
        }
        .course-play-overlay {
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .locked-thumb {
          filter: blur(8px) grayscale(0.5);
          transform: scale(1.1);
        }
        .video-modal-backdrop, .purchase-modal-backdrop {
          animation: fadeIn 0.2s ease;
        }
        .video-modal-content, .purchase-modal-content {
          animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(180,145,108,0.3); }
          50% { box-shadow: 0 0 20px rgba(180,145,108,0.5); }
        }
        .courses-floating-dock {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 8px;
          border-radius: 999px;
          background: var(--sidebar-bg);
          border: 1px solid var(--border);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          backdrop-filter: blur(16px);
          animation: dock-slide-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes dock-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .dock-item {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--subtext);
          position: relative;
        }
        .dock-item:hover {
          color: var(--text);
          background: var(--input-bg);
        }
        .dock-item.active {
          background: var(--accent);
          color: #fff;
          box-shadow: 0 2px 12px rgba(180,145,108,0.35);
        }
        .dock-divider {
          width: 1px;
          height: 24px;
          background: var(--border);
          margin: 0 4px;
        }
      `}</style>

      <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar">

        {/* Search + Category Filters */}
        <div className="max-w-6xl mx-auto mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--subtext)]" />
            <input
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--sidebar-bg)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)]/50 transition"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map(c => {
              const paid = c !== 'all' && isCategoryPaid(c);
              const unlocked = c === 'all' || isCategoryUnlocked(c);
              return (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
                  style={{
                    background: activeCategory === c ? 'var(--accent)' : 'var(--sidebar-bg)',
                    color: activeCategory === c ? '#fff' : 'var(--subtext)',
                    border: `1px solid ${activeCategory === c ? 'transparent' : 'var(--border)'}`,
                    boxShadow: activeCategory === c ? '0 4px 15px rgba(180,145,108,0.3)' : 'none',
                  }}
                >
                  {paid && !unlocked && <Lock className="w-3 h-3" />}
                  {c === 'all' ? `All (${courses.length})` : c}
                  {paid && (
                    <span style={{
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 6,
                      background: unlocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: unlocked ? '#10b981' : '#ef4444',
                      fontWeight: 800,
                    }}>
                      {unlocked ? '✓' : `$${categoryPricing[c]}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
              <p className="text-sm text-[var(--subtext)]">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-3xl bg-[var(--sidebar-bg)] border border-[var(--border)] flex items-center justify-center">
                <Lock className="w-7 h-7 text-[var(--subtext)]" />
              </div>
              <p className="text-sm text-[var(--subtext)] font-medium">No courses available yet</p>
              <p className="text-xs text-[var(--subtext)] opacity-60">Check back soon for tutorials and guides</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-[var(--subtext)]">No courses match your search</p>
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map(group => {
                const locked = !isCategoryUnlocked(group.category);
                const price = categoryPricing[group.category] || 0;

                return (
                  <div key={group.category}>
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-1 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <h2 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider">{group.category}</h2>
                      <span className="text-[10px] font-bold text-[var(--subtext)] bg-[var(--sidebar-bg)] px-2 py-0.5 rounded-lg">{group.items.length}</span>
                      {locked && (
                        <button
                          onClick={() => setPurchaseModal({ category: group.category, price, count: group.items.length })}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white transition-all hover:scale-105 active:scale-95"
                          style={{ background: 'var(--accent)', animation: 'pulse-glow 2s ease-in-out infinite' }}
                        >
                          <Lock className="w-3 h-3" /> Unlock for ${price}
                        </button>
                      )}
                      {!locked && isCategoryPaid(group.category) && (
                        <span className="ml-auto text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg">✓ Purchased</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {group.items.map((course, i) => (
                        <div
                          key={course.id}
                          className={`course-card rounded-2xl border border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden cursor-pointer ${locked ? 'locked' : ''}`}
                          style={{ animationDelay: `${i * 0.06}s` }}
                          onClick={() => {
                            if (locked) {
                              setPurchaseModal({ category: group.category, price, count: group.items.length });
                            } else {
                              setPlayingVideo(course);
                            }
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="course-thumb-wrap relative aspect-video bg-black/5 overflow-hidden">
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className={`w-full h-full object-cover ${locked ? 'locked-thumb' : ''}`}
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${course.youtube_id}/hqdefault.jpg`;
                              }}
                            />
                            {/* Play overlay (unlocked only) */}
                            {!locked && (
                              <div className="course-play-overlay absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-xl">
                                  <Play className="w-6 h-6 ml-0.5" fill="currentColor" style={{ color: 'var(--accent)' }} />
                                </div>
                              </div>
                            )}
                            {/* Lock overlay (locked) */}
                            {locked && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                                  <Lock className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[11px] font-bold text-white/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                  ${price} · Unlock
                                </span>
                              </div>
                            )}
                            {/* Duration badge */}
                            {course.duration && !locked && (
                              <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/80 text-white px-2 py-0.5 rounded-md font-mono">
                                {course.duration}
                              </span>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--accent)' }}>{course.category}</span>
                            <h3 className={`text-sm font-bold text-[var(--text)] leading-snug mb-1.5 line-clamp-2 ${locked ? 'select-none' : ''}`}>
                              {course.title}
                            </h3>
                            {course.description && (
                              <p className={`text-[11px] text-[var(--subtext)] leading-relaxed line-clamp-2 ${locked ? 'select-none' : ''}`}>
                                {locked ? '●●●●● ●●●● ●●●●●●● ●●●● ●●●' : course.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <div
          className="video-modal-backdrop fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="video-modal-content relative w-full max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="absolute -top-10 left-0 text-white/80 text-sm font-semibold truncate max-w-[80%]">
              {playingVideo.title}
            </p>
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${playingVideo.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
                title={playingVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {purchaseModal && (
        <div
          className="purchase-modal-backdrop fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => { setPurchaseModal(null); setPurchaseError(''); }}
        >
          <div
            className="purchase-modal-content bg-[var(--sidebar-bg)] rounded-3xl border border-[var(--border)] shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">Unlock "{purchaseModal.category}"</h3>
                  <p className="text-[11px] text-[var(--subtext)]">{purchaseModal.count} video tutorial{purchaseModal.count !== 1 ? 's' : ''} included</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[var(--text)]">${purchaseModal.price}</span>
                <span className="text-xs text-[var(--subtext)] font-medium">one-time</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="p-6 space-y-3">
              {/* Wallet */}
              <button
                onClick={() => handlePurchase('wallet')}
                disabled={purchasing || walletBalance < purchaseModal.price}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text)]">Pay from Wallet</p>
                  <p className="text-[11px] text-[var(--subtext)]">
                    Balance: <span className={walletBalance >= purchaseModal.price ? 'text-emerald-500' : 'text-red-500'}>
                      ${walletBalance.toFixed(2)}
                    </span>
                    {walletBalance < purchaseModal.price && ' · Insufficient'}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0">Instant</span>
              </button>

              {/* Crypto */}
              <button
                onClick={() => handlePurchase('crypto')}
                disabled={purchasing}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 active:scale-[0.98] disabled:opacity-50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                  <Bitcoin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text)]">Pay with Crypto</p>
                  <p className="text-[11px] text-[var(--subtext)]">200+ cryptos · Hosted checkout page</p>
                </div>
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg shrink-0">Secure</span>
              </button>

              {/* Error */}
              {purchaseError && (
                <p className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                  ⚠ {purchaseError}
                </p>
              )}

              {/* Loading */}
              {purchasing && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
                  <span className="text-xs text-[var(--subtext)]">Processing payment...</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => { setPurchaseModal(null); setPurchaseError(''); }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-[var(--subtext)] hover:text-[var(--text)] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dock */}
      {!playingVideo && !purchaseModal && courses.length > 0 && (
        <div className="courses-floating-dock">
          <button
            className={`dock-item ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
            title="All Courses"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <div className="dock-divider" />
          {categories.filter(c => c !== 'all').slice(0, 3).map((cat) => (
            <button
              key={cat}
              className={`dock-item ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              title={cat}
            >
              <Zap className="w-5 h-5" />
            </button>
          ))}
          {categories.filter(c => c !== 'all').length > 3 && (
            <>
              <div className="dock-divider" />
              <button
                className="dock-item"
                onClick={() => {
                  const cats = categories.filter(c => c !== 'all');
                  const nextIdx = cats.indexOf(activeCategory);
                  setActiveCategory(cats[(nextIdx + 1) % cats.length]);
                }}
                title="More Categories"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
