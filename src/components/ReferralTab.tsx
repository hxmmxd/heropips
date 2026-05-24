'use client';

import React, { useState } from 'react';
import { Link as LinkIcon, ChevronDown } from 'lucide-react';
import { Partner } from '../types';

interface ReferralTabProps {
  partners: Partner[];
}

export default function ReferralTab({ partners }: ReferralTabProps) {
  const [openPartnerIndex, setOpenPartnerIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('tradegpt.ai/r/u82910');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePartner = (index: number) => {
    setOpenPartnerIndex(openPartnerIndex === index ? null : index);
  };

  return (
    <div className="p-6 lg:p-12 max-w-5xl mx-auto w-full space-y-10">
      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-[var(--border)] p-6 rounded-3xl bg-[var(--sidebar-bg)] shadow-sm">
          <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-2 leading-none">
            Total Rebate
          </p>
          <p className="text-2xl font-bold text-green-500 font-mono leading-none mt-1">
            $4,820.50
          </p>
        </div>
        <div className="border border-[var(--border)] p-6 rounded-3xl bg-[var(--sidebar-bg)] shadow-sm">
          <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-2 leading-none">
            Commission
          </p>
          <p className="text-2xl font-bold font-mono leading-none mt-1">
            $1,240.20
          </p>
        </div>
        <div className="border border-[var(--border)] p-6 rounded-3xl bg-[var(--sidebar-bg)] shadow-sm">
          <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-2 leading-none">
            Active Partners
          </p>
          <p className="text-2xl font-bold font-mono leading-none mt-1">
            142
          </p>
        </div>
        <div className="border border-[var(--border)] p-6 rounded-3xl bg-[var(--sidebar-bg)] shadow-sm">
          <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-2 leading-none">
            Network Portfolio
          </p>
          <p className="text-2xl font-bold text-blue-500 font-mono leading-none mt-1">
            $1.2M
          </p>
        </div>
      </div>

      {/* Invite Link Card */}
      <div className="border border-blue-500/10 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-center bg-blue-500/5 gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-500 uppercase leading-none mb-1">
              Institutional Invite Link
            </p>
            <code className="text-xs font-bold font-mono">tradegpt.ai/r/u82910</code>
          </div>
        </div>
        <button
          onClick={handleCopyLink}
          className="w-full md:w-auto bg-[var(--text)] text-[var(--bg)] px-8 py-2.5 rounded-2xl text-[10px] font-bold uppercase active:scale-95 transition-all hover:opacity-90"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Partners Accordion */}
      <div className="space-y-3 pb-10">
        {partners.map((p, idx) => {
          const isOpen = openPartnerIndex === idx;
          return (
            <div
              key={p.name}
              className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg)] shadow-sm"
            >
              <button
                onClick={() => togglePartner(idx)}
                className="w-full p-5 flex flex-col hover:bg-[var(--sidebar-bg)] transition duration-200"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4 text-left">
                    <img
                      src={`https://ui-avatars.com/api/?name=${p.name}&background=random&color=fff`}
                      alt={p.name}
                      className="w-7 h-7 rounded-lg"
                    />
                    <div>
                      <p className="text-sm font-bold">{p.name}</p>
                      <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest leading-none mt-1">
                        Verified
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <span className="text-[10px] font-bold text-green-500 uppercase">
                      {p.status}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[var(--subtext)] transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </div>
                </div>
              </button>

              {/* Accordion Expand Area */}
              {isOpen && (
                <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">
                        Portfolio
                      </p>
                      <p className="text-sm font-bold font-mono">${p.portfolio}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">
                        Rebate
                      </p>
                      <p className="text-sm font-bold font-mono text-green-500">
                        +${p.rebate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-[var(--subtext)] uppercase mb-1">
                        Commission
                      </p>
                      <p className="text-sm font-bold font-mono text-blue-500">
                        ${p.commission}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
