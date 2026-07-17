import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface AnnouncementsTabProps {
  initialAnnouncements: any[];
  onRefresh: () => Promise<void> | void;
}

export default function AnnouncementsTab({
  initialAnnouncements,
  onRefresh
}: AnnouncementsTabProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  const postAnnouncement = async () => {
    if (!newAnnouncement.title) return;
    setLoading(true);
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: newAnnouncement })
    });
    setNewAnnouncement({ title: '', message: '', type: 'info' });
    await onRefresh();
    setLoading(false);
  };

  const deleteAnnouncement = async (id: string) => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: { id, is_active: false } })
    });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Post Board */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Create Announcement</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Title</label>
              <input
                className="adm-edit-input"
                placeholder="e.g., Scheduled Maintenance"
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Severity Type</label>
              <select
                className="adm-select"
                style={{ width: '100%' }}
                value={newAnnouncement.type}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="info">ℹ️ System Information</option>
                <option value="warning">⚠️ High Warning Alert</option>
                <option value="success">✅ Task Completed</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Announcement Content</label>
            <input
              className="adm-edit-input"
              placeholder="Provide notification details here..."
              value={newAnnouncement.message}
              onChange={e => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              className="adm-post-btn"
              disabled={loading || !newAnnouncement.title}
              onClick={postAnnouncement}
            >
              {loading ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Feed */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Active Notifications ({announcements.length})</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--subtext)', fontSize: 13, margin: 0 }}>
              No active announcements broadcasted.
            </p>
          ) : (
            announcements.map(a => {
              const borderColors = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981' };
              const color = borderColors[a.type as 'info' | 'warning' | 'success'] || '#3b82f6';
              return (
                <div
                  key={a.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: 'var(--input-bg)',
                    borderLeft: `4px solid ${color}`,
                    borderTop: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{a.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--subtext)', margin: '0 0 6px' }}>{a.message}</p>
                    <span style={{ fontSize: 10, color: 'var(--subtext)', opacity: 0.6 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    style={{ background: 'transparent', border: 'none', color: 'var(--subtext)', cursor: 'pointer', padding: 2 }}
                    onClick={() => deleteAnnouncement(a.id)}
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
