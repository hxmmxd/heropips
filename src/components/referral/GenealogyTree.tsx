'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getMemojiForName } from '@/lib/avatar';

interface Member {
  userId: string;
  referredBy: string | null;
  displayName: string | null;
  plan: string | null;
  level: number;
  tradeCount: number;
  totalVolume: number;
  earnedFromThem: number;
}

interface GenealogyTreeProps {
  networkMembers: Member[];
  profileData: any;
  walletStats: any;
}

const getLevelColor = (level: any) => {
  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
  const idx = Math.max(0, (Number(level) || 1) - 1);
  return colors[idx % colors.length];
};

export default function GenealogyTree({ networkMembers, profileData, walletStats }: GenealogyTreeProps) {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [expandedDetailsNodes, setExpandedDetailsNodes] = useState<Record<string, boolean>>({});
  const treeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Genealogy Tree Constructor
  const buildGenealogyTree = useCallback(() => {
    if (!networkMembers || networkMembers.length === 0) return [];
    const rootUserId = profileData?.id;

    // Create node mapping
    const nodeMap: Record<string, any> = {};
    networkMembers.forEach(m => {
      nodeMap[m.userId] = { ...m, children: [] };
    });

    const treeRoots: any[] = [];
    networkMembers.forEach(m => {
      const node = nodeMap[m.userId];
      const parentId = m.referredBy;

      // If the parent is root user, or the parent is not in our downline list
      if (!parentId || parentId === rootUserId || !nodeMap[parentId]) {
        node.level = node.level || 1;
        treeRoots.push(node);
      } else {
        nodeMap[parentId].children.push(node);
      }
    });

    // Sort by level asc, then by volume desc
    treeRoots.sort((a, b) => a.level - b.level || (b.totalVolume || 0) - (a.totalVolume || 0));
    return treeRoots;
  }, [networkMembers, profileData]);

  // Helper: collect all node IDs grouped by level
  const collectNodeIdsByLevel = (node: any, result: Record<number, string[]> = {}) => {
    const lvl = node.level || 0;
    if (!result[lvl]) result[lvl] = [];
    result[lvl].push(node.userId);
    if (node.children) {
      node.children.forEach((c: any) => collectNodeIdsByLevel(c, result));
    }
    return result;
  };

  // Explode-expand: progressively uncollapse levels
  const triggerExplodeExpand = useCallback(() => {
    // Clear any previous timers
    treeTimersRef.current.forEach(t => clearTimeout(t));
    treeTimersRef.current = [];

    const roots = buildGenealogyTree();
    const virtualRoot = {
      userId: profileData?.id || 'root',
      level: 0,
      children: roots
    };

    const byLevel = collectNodeIdsByLevel(virtualRoot);
    const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

    // First: collapse ALL nodes with children
    const allCollapsed: Record<string, boolean> = {};
    levels.forEach(lvl => {
      byLevel[lvl].forEach(id => { allCollapsed[id] = true; });
    });
    setCollapsedNodes(allCollapsed);

    // Then: uncollapse each level with staggered delay
    levels.forEach((lvl, idx) => {
      const timer = setTimeout(() => {
        setCollapsedNodes(prev => {
          const next = { ...prev };
          byLevel[lvl].forEach(id => { next[id] = false; });
          return next;
        });
      }, 300 + idx * 400); // root at 300ms, L1 at 700ms, L2 at 1100ms...
      treeTimersRef.current.push(timer);
    });
  }, [buildGenealogyTree, profileData]);

  // Trigger explode expand on mount
  useEffect(() => {
    triggerExplodeExpand();
    return () => {
      treeTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, [triggerExplodeExpand]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: any) => {
    const isCollapsed = !!collapsedNodes[node.userId];
    const isDetailsExpanded = !!expandedDetailsNodes[node.userId];
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = node.level === 0;

    const toggleCollapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCollapsedNodes(prev => ({
        ...prev,
        [node.userId]: !prev[node.userId]
      }));
    };

    const toggleDetails = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedDetailsNodes(prev => ({
        ...prev,
        [node.userId]: !prev[node.userId]
      }));
    };

    const animDelay = `${(node.level || 0) * 120}ms`;

    return (
      <li key={node.userId} className="rh-tree-li rh-tree-anim" style={{ animationDelay: animDelay }}>
        {isDetailsExpanded ? (
          /* EXPANDED DETAILS CARD */
          <div 
            className={`rh-tree-card rh-tree-level-${node.level || 0} expanded`}
            onClick={toggleDetails}
          >
            <div className="rh-tree-card-header">
              <span className={`rh-tree-badge-tier tier-${node.plan || 'free'}`}>
                {(node.plan || 'free').toUpperCase()}
              </span>
              <span className="rh-tree-card-level">
                {isRoot ? 'YOU' : `L${node.level}`}
              </span>
            </div>

            <div className="rh-tree-card-body">
              <img 
                src={getMemojiForName(node.displayName || node.userId)}
                alt=""
                className="rh-tree-card-avatar"
                style={{ background: getLevelColor(node.level || 1) }}
              />
              <div className="rh-tree-card-details">
                <div className="rh-tree-card-name" title={node.displayName || 'Trader'}>
                  {node.displayName || 'Trader'}
                </div>
                <div className="rh-tree-card-stats">
                  <span>{node.tradeCount || 0} trades</span>
                  <span>·</span>
                  <span>{(Number(node.totalVolume) || 0).toFixed(1)} lots</span>
                </div>
              </div>
            </div>

            <div className="rh-tree-card-footer">
              <span className="rh-tree-card-label">{isRoot ? 'Total Earned' : 'Earned From Them'}</span>
              <span className="rh-tree-card-value">${(Number(node.earnedFromThem) || 0).toFixed(2)}</span>
            </div>

            <span className="rh-tree-card-info-tip">Click to hide details</span>

            {hasChildren && (
              <div className="rh-tree-collapse-indicator" onClick={toggleCollapse}>
                {isCollapsed ? '+' : '-'}
              </div>
            )}
          </div>
        ) : (
          /* COMPACT PILL */
          <div 
            className={`rh-tree-pill rh-tree-level-${node.level || 0} ${isCollapsed ? 'collapsed' : ''}`}
            onClick={toggleDetails}
          >
            <span className="rh-tree-pill-level" style={{ background: getLevelColor(node.level || 1) }}>
              {isRoot ? 'YOU' : `L${node.level}`}
            </span>
            <span className="rh-tree-pill-name">
              {node.displayName || 'Trader'}
            </span>
            
            {hasChildren && (
              <button 
                className="rh-tree-pill-toggle-btn"
                onClick={toggleCollapse}
              >
                {isCollapsed ? '▼' : '▲'}
              </button>
            )}
          </div>
        )}

        {hasChildren && !isCollapsed && (
          <ul>
            {node.children.map((child: any) => renderTreeNode(child))}
          </ul>
        )}
      </li>
    );
  };

  const roots = buildGenealogyTree();
  const virtualRoot = {
    userId: profileData?.id || 'root',
    displayName: profileData?.displayName || 'You',
    plan: profileData?.plan || 'free',
    level: 0,
    tradeCount: walletStats?.totalLots || 0,
    earnedFromThem: walletStats?.lifetime || 0,
    totalVolume: walletStats?.totalLots || 0,
    children: roots
  };

  return (
    <div className="rh-tree-container">
      <ul className="rh-tree-root">
        {renderTreeNode(virtualRoot)}
      </ul>
    </div>
  );
}
