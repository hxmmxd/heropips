'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function InstitutionalPieChart({ dataStr, title }: { dataStr: string, title?: string }) {
  const data = useMemo(() => {
    try {
      return JSON.parse(dataStr.replace(/&quot;/g, '"'));
    } catch { return []; }
  }, [dataStr]);

  const COLORS = ['#C6FF2E', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <div className="w-full my-8 p-6 bg-[#0A0A0A] border border-[#27272A] rounded-xl shadow-lg">
      {title && <h3 style={{ color: '#F9FAFB', fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>{title}</h3>}
      <div style={{ width: '100%', height: '350px' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px', color: '#F9FAFB' }}
              itemStyle={{ color: '#F9FAFB' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
        {data.map((entry: any, index: number) => (
          <div key={`legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
            <span style={{ color: '#D1D5DB', fontSize: '13px', fontWeight: 500 }}>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
