'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Save, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface BentoCard {
  id: string;
  title: string;
  description: string;
  tag_text: string;
  tag_color: string;
  link_text: string;
  link_url: string;
  image_url: string;
  card_type: string;
  bento_size: string;
  order_index: number;
  is_published: boolean;
  slug?: string;
  content?: string;
  created_at: string;
}

export default function BentoCmsTab() {
  const supabase = createClient();
  const [cards, setCards] = useState<BentoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<BentoCard>>({
    title: '',
    description: '',
    tag_text: '',
    tag_color: 'purple',
    link_text: '',
    link_url: '',
    image_url: '',
    card_type: 'standard',
    bento_size: 'square',
    order_index: 0,
    is_published: false,
    slug: '',
    content: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('bento_cards')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCards(data || []);
    } catch (err: any) {
      console.error('Error fetching bento cards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (card?: BentoCard) => {
    if (card) {
      setFormData(card);
    } else {
      setFormData({
        title: '',
        description: '',
        tag_text: '',
        tag_color: 'purple',
        link_text: '',
        link_url: '',
        image_url: '',
        card_type: 'standard',
        bento_size: 'square',
        order_index: cards.length,
        is_published: false,
        slug: '',
        content: ''
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      if (formData.id) {
        const { error: updateError } = await supabase
          .from('bento_cards')
          .update({
            title: formData.title,
            description: formData.description,
            tag_text: formData.tag_text,
            tag_color: formData.tag_color,
            link_text: formData.link_text,
            link_url: formData.link_url,
            image_url: formData.image_url,
            card_type: formData.card_type,
            bento_size: formData.bento_size,
            order_index: formData.order_index,
            is_published: formData.is_published,
            slug: formData.slug || null,
            content: formData.content || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id);
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('bento_cards')
          .insert([{
            title: formData.title,
            description: formData.description,
            tag_text: formData.tag_text,
            tag_color: formData.tag_color,
            link_text: formData.link_text,
            link_url: formData.link_url,
            image_url: formData.image_url,
            card_type: formData.card_type,
            bento_size: formData.bento_size,
            order_index: formData.order_index,
            is_published: formData.is_published,
            slug: formData.slug || null,
            content: formData.content || null
          }]);
          
        if (insertError) throw insertError;
      }
      
      setIsEditing(false);
      fetchCards();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;
    try {
      const { error: delError } = await supabase
        .from('bento_cards')
        .delete()
        .eq('id', id);
      if (delError) throw delError;
      fetchCards();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('bento_images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('bento_images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--subtext)' }}>Loading Bento CMS...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{formData.id ? 'Edit Card' : 'New Card'}</h3>
            <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--subtext)', cursor: 'pointer' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Title & Tag */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Title</label>
                  <input 
                    className="adm-edit-input"
                    value={formData.title || ''}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Sculpt Conference"
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Description (Optional)</label>
                  <textarea 
                    className="adm-edit-input"
                    style={{ minHeight: 80, resize: 'vertical' }}
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Short description text..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Tag Text</label>
                    <input 
                      className="adm-edit-input"
                      value={formData.tag_text || ''}
                      onChange={e => setFormData({...formData, tag_text: e.target.value})}
                      placeholder="e.g. CONFERENCE"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Tag Color</label>
                    <select 
                      className="adm-edit-input"
                      value={formData.tag_color || 'purple'}
                      onChange={e => setFormData({...formData, tag_color: e.target.value})}
                    >
                      <option value="purple">Purple</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="orange">Orange</option>
                      <option value="white">White</option>
                      <option value="volt">Volt Green</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Layout & Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Grid Size</label>
                    <select 
                      className="adm-edit-input"
                      value={formData.bento_size || 'square'}
                      onChange={e => setFormData({...formData, bento_size: e.target.value})}
                    >
                      <option value="square">Square (1x1)</option>
                      <option value="tall">Tall (1x2)</option>
                      <option value="wide">Wide (2x1)</option>
                      <option value="large">Large (2x2)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Card Type</label>
                    <select 
                      className="adm-edit-input"
                      value={formData.card_type || 'standard'}
                      onChange={e => setFormData({...formData, card_type: e.target.value})}
                    >
                      <option value="standard">Standard (Image top, text bottom)</option>
                      <option value="split">Split (Text left, Image right)</option>
                      <option value="text_only">Text Only</option>
                      <option value="video">Video / Stream</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Link Text</label>
                    <input 
                      className="adm-edit-input"
                      value={formData.link_text || ''}
                      onChange={e => setFormData({...formData, link_text: e.target.value})}
                      placeholder="e.g. Read story →"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Link URL</label>
                    <input 
                      className="adm-edit-input"
                      value={formData.link_url || ''}
                      onChange={e => setFormData({...formData, link_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Image / Asset</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input 
                        className="adm-edit-input"
                        style={{ paddingRight: 40, width: '100%' }}
                        value={formData.image_url || ''}
                        onChange={e => setFormData({...formData, image_url: e.target.value})}
                        placeholder="Image URL or upload..."
                      />
                      <label style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--subtext)' }}>
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        <input type="file" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                    </div>
                    {formData.image_url && (
                      <img src={formData.image_url} alt="Preview" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Slug (URL)</label>
                  <input 
                    className="adm-edit-input"
                    value={formData.slug || ''}
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    placeholder="e.g. ai-trading-systems"
                  />
                  <span style={{ fontSize: 10, color: 'var(--subtext)' }}>Leave blank to auto-generate or customize it for SEO.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Blog Content (Markdown)</label>
                  <textarea 
                    className="adm-edit-input"
                    style={{ minHeight: 180, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                    value={formData.content || ''}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    placeholder="# Main Title\n\nWrite your blog post here using Markdown..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Order Index</label>
                    <input 
                      type="number" 
                      className="adm-edit-input"
                      value={formData.order_index || 0}
                      onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.is_published || false}
                        onChange={e => setFormData({...formData, is_published: e.target.checked})}
                        style={{ cursor: 'pointer' }}
                      />
                      Published
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
              <button 
                onClick={() => setIsEditing(false)}
                className="adm-btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="adm-btn-primary"
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Card
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Bento Grid Blog</h3>
              <p style={{ fontSize: 12, color: 'var(--subtext)', margin: '4px 0 0 0' }}>Manage content for the landing page grid section</p>
            </div>
            <button 
              onClick={() => handleEdit()}
              className="adm-btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus className="w-4 h-4" />
              Add Card
            </button>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>ORDER</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>CARD</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>SIZE & TYPE</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, color: 'var(--subtext)', fontWeight: 600, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {cards.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--subtext)', fontSize: 13 }}>
                      No Bento Cards found. Create one!
                    </td>
                  </tr>
                ) : (
                  cards.map(card => (
                    <tr key={card.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--subtext)', fontSize: 13, fontFamily: 'monospace' }}>
                        {card.order_index}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {card.image_url ? (
                            <img src={card.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--subtext)' }}>
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{card.title}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--subtext)' }}>{card.tag_text}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'var(--input-bg)', color: 'var(--subtext)', border: '1px solid var(--border)' }}>
                            {card.bento_size}
                          </span>
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'var(--input-bg)', color: 'var(--subtext)', border: '1px solid var(--border)' }}>
                            {card.card_type}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {card.is_published ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <CheckCircle style={{ width: 12, height: 12 }} /> Published
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'var(--input-bg)', color: 'var(--subtext)', border: '1px solid var(--border)' }}>
                            <XCircle style={{ width: 12, height: 12 }} /> Draft
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button 
                            onClick={() => handleEdit(card)}
                            style={{ padding: 6, background: 'transparent', border: 'none', color: 'var(--subtext)', cursor: 'pointer' }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(card.id)}
                            style={{ padding: 6, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
