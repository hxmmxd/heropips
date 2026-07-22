'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Eye, EyeOff, Loader2, ExternalLink, GripVertical, DollarSign } from 'lucide-react';

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
  is_published: boolean;
  created_at: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function AdminCoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formThumb, setFormThumb] = useState('');
  const [formCategory, setFormCategory] = useState('Platform Tutorial');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [formDuration, setFormDuration] = useState('');
  const [formPublished, setFormPublished] = useState(true);

  const previewId = extractYouTubeId(formUrl);
  const previewThumb = formThumb || (previewId ? `https://img.youtube.com/vi/${previewId}/maxresdefault.jpg` : '');

  useEffect(() => { fetchCourses(); fetchPricing(); }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses?all=true');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Category Pricing ──
  const [categoryPricing, setCategoryPricing] = useState<Record<string, string>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      const config = data.config || {};
      const pricing = config.course_category_pricing || {};
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(pricing)) mapped[k] = String(v);
      setCategoryPricing(mapped);
    } catch { /* ok */ }
  };

  const savePricing = async () => {
    setSavingPricing(true);
    setPricingSaved(false);
    try {
      const numericPricing: Record<string, number> = {};
      for (const [k, v] of Object.entries(categoryPricing)) {
        numericPricing[k] = Number(v) || 0;
      }
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configKey: 'course_category_pricing', configValue: numericPricing }),
      });
      setPricingSaved(true);
      setTimeout(() => setPricingSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save pricing:', err);
    } finally {
      setSavingPricing(false);
    }
  };

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormUrl(''); setFormThumb('');
    setFormCategory('Platform Tutorial'); setCustomCategory(''); setIsCustomCategory(false);
    setFormDuration(''); setFormPublished(true);
    setEditingId(null); setShowForm(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formUrl.trim()) return;
    if (!previewId) return;
    const finalCategory = isCustomCategory ? (customCategory.trim() || 'Platform Tutorial') : formCategory;
    setSaving(true);
    try {
      if (editingId) {
        await fetch('/api/courses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId, title: formTitle, description: formDesc,
            youtube_url: formUrl, thumbnail_url: formThumb || undefined,
            category: finalCategory, duration: formDuration, is_published: formPublished,
          }),
        });
      } else {
        await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle, description: formDesc, youtube_url: formUrl,
            thumbnail_url: formThumb || undefined, category: finalCategory,
            duration: formDuration, is_published: formPublished,
          }),
        });
      }
      await fetchCourses();
      resetForm();
    } catch (err) {
      console.error('Failed to save course:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Course) => {
    setFormTitle(c.title); setFormDesc(c.description); setFormUrl(c.youtube_url);
    setFormThumb(c.thumbnail_url); setFormCategory(c.category);
    setCustomCategory(''); setIsCustomCategory(false);
    setFormDuration(c.duration); setFormPublished(c.is_published);
    setEditingId(c.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    await fetch(`/api/courses?id=${id}`, { method: 'DELETE' });
    await fetchCourses();
  };

  const togglePublish = async (c: Course) => {
    await fetch('/api/courses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, is_published: !c.is_published }),
    });
    await fetchCourses();
  };

  const categories = Array.from(new Set(courses.map(c => c.category).concat(['Platform Tutorial', 'Trading Skills', 'Strategy Guide'])));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>🎓 Course Management</h3>
            <p style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
              {courses.length} courses · {courses.filter(c => c.is_published).length} published · {courses.filter(c => !c.is_published).length} drafts
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Add Course
          </button>
        </div>
      </div>

      {/* Category Pricing */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14 }}><DollarSign style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'middle' }} /> Category Pricing</h3>
            <p style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>Set $0 for free, any amount for paid. Users buy entire category at once.</p>
          </div>
          <button
            onClick={savePricing}
            disabled={savingPricing}
            style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: pricingSaved ? '#10b981' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
              opacity: savingPricing ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {pricingSaved ? '✓ Saved' : savingPricing ? 'Saving...' : 'Save Pricing'}
          </button>
        </div>
        <div className="adm-card-body" style={{ padding: 0 }}>
          {categories.map((cat, i) => (
            <div key={cat} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
              borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>{cat}</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--subtext)' }}>
                {courses.filter(c => c.category === cat).length} course{courses.filter(c => c.category === cat).length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={categoryPricing[cat] || '0'}
                  onChange={e => setCategoryPricing(p => ({ ...p, [cat]: e.target.value }))}
                  style={{
                    width: 70, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 700,
                    outline: 'none', textAlign: 'right', fontFamily: 'monospace',
                  }}
                />
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
                background: Number(categoryPricing[cat] || 0) > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: Number(categoryPricing[cat] || 0) > 0 ? '#ef4444' : '#10b981',
              }}>
                {Number(categoryPricing[cat] || 0) > 0 ? 'PAID' : 'FREE'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <h3 style={{ fontSize: 14 }}>{editingId ? '✏️ Edit Course' : '➕ Add New Course'}</h3>
          </div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* YouTube URL + Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>
                  YouTube URL *
                </label>
                <input
                  value={formUrl} onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none',
                  }}
                />
                {formUrl && !previewId && (
                  <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>⚠ Invalid YouTube URL</p>
                )}
              </div>
              {/* Thumbnail Preview */}
              {previewThumb && (
                <div style={{ width: 160, height: 90, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: '#000', flexShrink: 0 }}>
                  <img src={previewThumb} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { if (previewId) (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${previewId}/hqdefault.jpg`; }}
                  />
                </div>
              )}
            </div>

            {/* Title + Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Title *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Course title"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Category</label>
                <select
                  value={isCustomCategory ? '__new' : formCategory}
                  onChange={e => {
                    if (e.target.value === '__new') {
                      setIsCustomCategory(true);
                      setCustomCategory('');
                    } else {
                      setIsCustomCategory(false);
                      setFormCategory(e.target.value);
                    }
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new">+ New Category</option>
                </select>
                {isCustomCategory && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Type new category name..."
                      autoFocus
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #6366f1',
                        background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { setIsCustomCategory(false); setFormCategory(categories[0] || 'Platform Tutorial'); }}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--input-bg)', color: 'var(--subtext)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Description</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Short description..."
                rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Duration + Custom Thumbnail + Published */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 14, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Duration</label>
                <input value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="12:30"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>
                  Custom Thumbnail URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — auto-fetched from YouTube)</span>
                </label>
                <input value={formThumb} onChange={e => setFormThumb(e.target.value)} placeholder="https://..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 0' }}>
                <input type="checkbox" checked={formPublished} onChange={e => setFormPublished(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Published</span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button onClick={resetForm}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--subtext)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >Cancel</button>
              <button onClick={handleSave} disabled={saving || !formTitle.trim() || !previewId}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: (!formTitle.trim() || !previewId) ? 'var(--border)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: (!formTitle.trim() || !previewId) ? 'var(--subtext)' : '#fff', opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : editingId ? 'Update Course' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 }}>
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--subtext)' }}>Loading courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--subtext)' }}>No courses yet</p>
              <p style={{ fontSize: 11, color: 'var(--subtext)', opacity: 0.6 }}>Click "Add Course" to get started</p>
            </div>
          ) : (
            courses.map((course, i) => (
              <div key={course.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                borderBottom: i < courses.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                {/* Grip */}
                <GripVertical style={{ width: 14, height: 14, color: 'var(--subtext)', opacity: 0.3, flexShrink: 0 }} />

                {/* Thumbnail */}
                <div style={{ width: 80, height: 45, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: '#000', flexShrink: 0 }}>
                  <img src={course.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${course.youtube_id}/hqdefault.jpg`; }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: 6 }}>{course.category}</span>
                    {course.duration && <span style={{ fontSize: 10, color: 'var(--subtext)', fontFamily: 'monospace' }}>{course.duration}</span>}
                  </div>
                </div>

                {/* Status */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, flexShrink: 0,
                  background: course.is_published ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                  color: course.is_published ? '#10b981' : '#6b7280',
                }}>{course.is_published ? 'Published' : 'Draft'}</span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => togglePublish(course)} title={course.is_published ? 'Unpublish' : 'Publish'}
                    style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', display: 'flex' }}
                  >
                    {course.is_published ? <EyeOff style={{ width: 12, height: 12, color: 'var(--subtext)' }} /> : <Eye style={{ width: 12, height: 12, color: '#10b981' }} />}
                  </button>
                  <button onClick={() => handleEdit(course)} title="Edit"
                    style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', display: 'flex' }}
                  >
                    <Edit3 style={{ width: 12, height: 12, color: 'var(--subtext)' }} />
                  </button>
                  <a href={course.youtube_url} target="_blank" rel="noopener noreferrer" title="Open on YouTube"
                    style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', display: 'flex' }}
                  >
                    <ExternalLink style={{ width: 12, height: 12, color: 'var(--subtext)' }} />
                  </a>
                  <button onClick={() => handleDelete(course.id)} title="Delete"
                    style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', display: 'flex' }}
                  >
                    <Trash2 style={{ width: 12, height: 12, color: '#ef4444' }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
