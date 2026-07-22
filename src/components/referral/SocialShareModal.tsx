'use client';

import React, { useState } from 'react';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink: string;
}

export default function SocialShareModal({ isOpen, onClose, referralLink }: SocialShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const text = encodeURIComponent("Join me on TradeGPT, the best-in-class AI-powered trading platform! Sign up using my referral link:");
  const url = encodeURIComponent(referralLink);
  const telegramUrl = `https://t.me/share/url?url=${url}&text=${text}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;

  return (
    <div className="rh-modal-overlay" onClick={onClose}>
      <div className="rh-modal" onClick={e => e.stopPropagation()}>
        <div className="rh-modal-header">
          <div>
            <span className="rh-modal-title">Share Invite Link</span>
            <span className="rh-modal-sub">Earn up to 5 tiers deep</span>
          </div>
          <button className="rh-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="rh-share-grid">
          <a 
            href={telegramUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="rh-share-btn"
          >
            <span className="rh-share-icon">✈️</span>
            <span className="rh-share-label">Telegram</span>
          </a>

          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="rh-share-btn"
          >
            <span className="rh-share-icon">💬</span>
            <span className="rh-share-label">WhatsApp</span>
          </a>

          <a 
            href={twitterUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="rh-share-btn"
          >
            <span className="rh-share-icon">🐦</span>
            <span className="rh-share-label">Twitter</span>
          </a>
        </div>

        <div className="rh-share-url">
          {referralLink}
        </div>

        <button 
          className="rh-btn rh-btn-secondary"
          onClick={copyToClipboard}
        >
          {copied ? '✓ Copied!' : 'Copy to clipboard'}
        </button>
      </div>
    </div>
  );
}
