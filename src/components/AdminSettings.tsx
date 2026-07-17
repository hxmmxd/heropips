'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Crown, Rocket, Loader2, Play, Copy, Shield, Settings, Activity, Send, Trash2, Key, Terminal, FileText, Mail, Receipt, Cpu, Eye, EyeOff, CheckCircle2, Percent, Clock, RefreshCw, AlertTriangle, XCircle, GraduationCap, MessageSquare
} from 'lucide-react';
import SystemApisTab from './SystemApisTab';
import AdminCoursesTab from './AdminCoursesTab';
import PlatformTab from './admin/PlatformTab';
import ReferralTab from './admin/ReferralTab';
import PricingTab from './admin/PricingTab';
import AnnouncementsTab from './admin/AnnouncementsTab';
import PaymentsTab from './admin/PaymentsTab';
import SmtpTab from './admin/SmtpTab';
import InvoiceConfigTab from './admin/InvoiceConfigTab';
import ApiIntegrationsTab from './admin/ApiIntegrationsTab';
import RebatesTab from './admin/RebatesTab';
import CronJobsTab from './admin/CronJobsTab';
import TelegramConfigTab from './admin/TelegramConfigTab';

interface AdminSettingsProps {
  initialConfig: Record<string, any>;
  initialAnnouncements: any[];
  onRefresh: () => Promise<void> | void;
  apiStats?: any[];
}

export default function AdminSettings({
  initialConfig,
  initialAnnouncements,
  onRefresh,
  apiStats = [],
}: AdminSettingsProps) {
  const [settingsSubPage, setSettingsSubPage] = useState<'main' | 'referral' | 'pricing' | 'announcements' | 'payments' | 'smtp' | 'invoice' | 'integrations' | 'rebates' | 'cron' | 'courses' | 'apis' | 'telegram'>('main');

  return (
    <div style={{ display: 'flex', gap: 24, width: '100%' }}>
      {/* ── Sub Navigation (Matches Admin Sidebar Theme) ── */}
      <div className="adm-nav" style={{ border: '1px solid var(--border)', borderRadius: 14, height: 'fit-content' }}>
        {[
          { id: 'main', label: 'Platform Controls', icon: Settings },
          { id: 'referral', label: 'Referral Program', icon: Crown },
          { id: 'pricing', label: 'Plan Pricing', icon: Zap },
          { id: 'announcements', label: 'Announcements', icon: Send },
          { id: 'payments', label: 'Payments Gateway', icon: Shield },
          { id: 'smtp', label: 'SMTP Mailer', icon: Mail },
          { id: 'invoice', label: 'Invoice Branding', icon: Receipt },
          { id: 'integrations', label: 'API Integrations', icon: Cpu },
          { id: 'rebates', label: 'Rebate Controls', icon: Percent },
          { id: 'cron', label: 'Cron Jobs', icon: Clock },
          { id: 'courses', label: 'Courses', icon: GraduationCap },
          { id: 'telegram', label: 'Telegram & Alerts', icon: MessageSquare },
          { id: 'apis', label: 'System APIs', icon: Terminal },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSettingsSubPage(tab.id as any)}
              className={`adm-nav-item ${settingsSubPage === tab.id ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Settings Sections ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {settingsSubPage === 'main' && (
          <PlatformTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'referral' && (
          <ReferralTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'pricing' && (
          <PricingTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'announcements' && (
          <AnnouncementsTab initialAnnouncements={initialAnnouncements} onRefresh={onRefresh} />
        )}
        {settingsSubPage === 'payments' && (
          <PaymentsTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'smtp' && (
          <SmtpTab initialConfig={initialConfig} />
        )}
        {settingsSubPage === 'invoice' && (
          <InvoiceConfigTab />
        )}
        {settingsSubPage === 'integrations' && (
          <ApiIntegrationsTab initialConfig={initialConfig} apiStats={apiStats} />
        )}
        {settingsSubPage === 'rebates' && (
          <RebatesTab />
        )}
        {settingsSubPage === 'cron' && (
          <CronJobsTab />
        )}
        {settingsSubPage === 'apis' && (
          <SystemApisTab />
        )}
        {settingsSubPage === 'courses' && (
          <AdminCoursesTab />
        )}
        {settingsSubPage === 'telegram' && (
          <TelegramConfigTab />
        )}
      </div>
    </div>
  );
}






