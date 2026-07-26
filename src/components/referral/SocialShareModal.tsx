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

  const shareItems = [
    {
      name: 'Telegram',
      domain: 'telegram.org',
      shareUrl: `https://t.me/share/url?url=${url}&text=${text}`,
    },
    {
      name: 'WhatsApp',
      domain: 'whatsapp.com',
      shareUrl: `https://api.whatsapp.com/send?text=${text}%20${url}`,
    },
    {
      name: 'X (Twitter)',
      domain: 'x.com',
      shareUrl: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
    },
    {
      name: 'LinkedIn',
      domain: 'linkedin.com',
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    },
    {
      name: 'Facebook',
      domain: 'facebook.com',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
    {
      name: 'Reddit',
      domain: 'reddit.com',
      shareUrl: `https://www.reddit.com/submit?url=${url}&title=${text}`,
    },
  ];

  return (
    <div className="rh-modal-overlay" onClick={onClose}>
      <div className="rh-modal" onClick={e => e.stopPropagation()}>
        <div className="rh-modal-header">
          <div>
            <span className="rh-modal-title">Share Invite Link</span>
            <span className="rh-modal-sub">Earn up to 5 tiers deep on team volume</span>
          </div>
          <button className="rh-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="rh-share-grid">
          {shareItems.map((item) => (
            <a
              key={item.name}
              href={item.shareUrl}
              target="_blank"
              rel="noreferrer"
              className="rh-share-btn"
            >
              <div className="rh-share-icon-wrapper">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`}
                  alt={item.name}
                  className="rh-share-favicon"
                  loading="lazy"
                />
              </div>
              <span className="rh-share-label">{item.name}</span>
            </a>
          ))}
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
