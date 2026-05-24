'use client';

import React from 'react';
import { Server, Plus } from 'lucide-react';
import { Broker } from '../types';

interface BrokersTabProps {
  brokers: Broker[];
  onOpenModal: () => void;
}

export default function BrokersTab({ brokers, onOpenModal }: BrokersTabProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-8">
      <h2 className="text-lg font-medium text-[var(--subtext)] px-2">
        Broker Infrastructure
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {brokers.map((b) => (
          <div
            key={b.acc}
            className="border border-[var(--border)] p-6 rounded-[1.5rem] bg-[var(--sidebar-bg)] flex justify-between items-center"
          >
            <div className="flex items-center space-x-4">
              <Server className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <p className="font-bold text-sm">{b.name}</p>
                <p className="text-[10px] text-[var(--subtext)] font-mono uppercase">
                  Account #{b.acc}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full uppercase shrink-0">
              Connected
            </span>
          </div>
        ))}

        {/* Connect Broker Button Card */}
        <button
          onClick={onOpenModal}
          className="border-2 border-dashed border-[var(--border)] p-6 rounded-[1.5rem] flex items-center justify-center text-[var(--subtext)] hover:text-blue-500 hover:border-blue-500/50 transition duration-200 group text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform shrink-0" />
          Connect Broker Node
        </button>
      </div>
    </div>
  );
}
