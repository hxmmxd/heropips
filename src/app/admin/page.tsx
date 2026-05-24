'use client';

import React, { useState, useEffect } from 'react';
import { Users, Server, TrendingUp, DollarSign, Shield, ShieldOff, ArrowLeft, Search, Crown, Zap, Rocket, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  freeUsers: number;
  totalBrokers: number;
  activeBrokers: number;
  totalTrades: number;
  openTrades: number;
  revenue: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  is_admin: boolean;
  avatar_url: string;
  created_at: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const res = await fetch('/api/admin');
      if (res.status === 403) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users);
      setIsAdmin(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan }),
    });
    setUsers(users.map(u => u.id === userId ? { ...u, plan } : u));
    setEditingUser(null);
  };

  const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_admin: !currentAdmin }),
    });
    setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentAdmin } : u));
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="auth-spinner" style={{ width: 28, height: 28, borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'var(--subtext)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <ShieldOff className="admin-denied-icon" />
          <h2>Access Denied</h2>
          <p>{error}</p>
          <a href="/" className="admin-back-link">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Header */}
        <div className="admin-header">
          <a href="/" className="admin-back-btn">
            <ArrowLeft className="admin-back-icon" />
          </a>
          <div>
            <h1 className="admin-title">Admin Panel</h1>
            <p className="admin-subtitle">Manage users, subscriptions, and platform data</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="admin-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-blue">
                <Users className="admin-stat-svg" />
              </div>
              <div>
                <p className="admin-stat-value">{stats.totalUsers}</p>
                <p className="admin-stat-label">Total Users</p>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-purple">
                <Crown className="admin-stat-svg" />
              </div>
              <div>
                <p className="admin-stat-value">{stats.proUsers + stats.enterpriseUsers}</p>
                <p className="admin-stat-label">Paid Users</p>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-green">
                <DollarSign className="admin-stat-svg" />
              </div>
              <div>
                <p className="admin-stat-value">${stats.revenue}</p>
                <p className="admin-stat-label">MRR</p>
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-icon admin-stat-amber">
                <TrendingUp className="admin-stat-svg" />
              </div>
              <div>
                <p className="admin-stat-value">{stats.totalTrades}</p>
                <p className="admin-stat-label">Total Trades</p>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="admin-section">
          <div className="admin-section-head">
            <h3 className="admin-section-title">Users ({filteredUsers.length})</h3>
            <div className="admin-search">
              <Search className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        <img
                          src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=10a37f&color=fff&size=32`}
                          alt=""
                          className="admin-user-avatar"
                        />
                        <div>
                          <p className="admin-user-name">{u.full_name || '—'}</p>
                          <p className="admin-user-email">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {editingUser === u.id ? (
                        <div className="admin-plan-dropdown">
                          {['free', 'pro', 'enterprise'].map(p => (
                            <button
                              key={p}
                              className={`admin-plan-opt ${u.plan === p ? 'active' : ''}`}
                              onClick={() => handleUpdatePlan(u.id, p)}
                            >
                              {p === 'free' && <Zap className="admin-plan-icon" />}
                              {p === 'pro' && <Crown className="admin-plan-icon" />}
                              {p === 'enterprise' && <Rocket className="admin-plan-icon" />}
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          className={`admin-plan-badge admin-plan-${u.plan || 'free'}`}
                          onClick={() => setEditingUser(u.id)}
                        >
                          {(u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1)}
                          <ChevronDown className="admin-plan-chevron" />
                        </button>
                      )}
                    </td>
                    <td>
                      <span className={`admin-role-badge ${u.is_admin ? 'admin-role-admin' : ''}`}>
                        {u.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="admin-date">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <button
                        className="admin-action-btn"
                        onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                        title={u.is_admin ? 'Remove admin' : 'Make admin'}
                      >
                        {u.is_admin ? <ShieldOff className="admin-action-icon" /> : <Shield className="admin-action-icon" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
