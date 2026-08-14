import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Share2, Link as LinkIcon, Calendar } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import ScrollProgressRail from '@/components/blog/ScrollProgressRail';
import MobileScrollProgressRail from '@/components/blog/MobileScrollProgressRail';
import MarkdownRenderer from '@/components/blog/MarkdownRenderer';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('bento_cards')
    .select('title, description, image_url')
    .eq('slug', params.slug)
    .single();

  if (!post) {
    return {
      title: 'Post Not Found | HeroPips',
    };
  }

  return {
    title: `${post.title} | HeroPips`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  
  const { data: post, error } = await supabase
    .from('bento_cards')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (error || !post) {
    notFound();
  }

  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="w-full min-h-screen relative" style={{ backgroundColor: 'var(--blog-bg)', color: 'var(--blog-text)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
      
      {/* Mobile Top Header Progress Rail */}
      <MobileScrollProgressRail />

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --blog-bg: #FCFCF9;
          --blog-text: #374151;
          --blog-title: #0A0A0A;
          --blog-desc: #4B5563;
          --blog-muted: #6B7280;
          --blog-faint: #9CA3AF;
          --blog-strong: #111827;
          --blog-border: #E5E7EB;
          --blog-surface: #F3F4F6;
          --blog-ambient: rgba(198, 255, 46, 0.08);
          --blog-link: #4d7c0f;
          --blog-link-hover: #3f6212;
          --blog-link-border: rgba(77, 124, 15, 0.3);
          --blog-quote-border: #D1D5DB;
        }

        .dark {
          --blog-bg: #0A0A0A;
          --blog-text: #D1D5DB;
          --blog-title: #F9FAFB;
          --blog-desc: #9CA3AF;
          --blog-muted: #9CA3AF;
          --blog-faint: #4B5563;
          --blog-strong: #F3F4F6;
          --blog-border: #27272A;
          --blog-surface: #18181B;
          --blog-ambient: rgba(198, 255, 46, 0.15);
          --blog-link: #c6ff2e;
          --blog-link-hover: #d9ff66;
          --blog-link-border: rgba(198, 255, 46, 0.3);
          --blog-quote-border: #3F3F46;
        }

        /* Responsive Layout Utilities */
        .blog-wrapper {
          padding-top: 100px;
          padding-bottom: 64px;
        }
        .blog-container {
          max-width: 72rem;
          margin: 0 auto;
          padding: 0 20px;
        }
        .blog-hero {
          margin-bottom: 48px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .blog-tag {
          padding: 4px 12px;
          border-radius: 100px;
          background-color: var(--blog-surface);
          border: 1px solid var(--blog-border);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--blog-text);
          margin-bottom: 24px;
        }
        .blog-title {
          font-size: clamp(2.25rem, 5vw, 4rem);
          font-weight: 700;
          letter-spacing: -0.04em;
          color: var(--blog-title);
          line-height: 1.05;
          margin-bottom: 24px;
          font-family: var(--font-display), 'Inter', sans-serif;
        }
        .blog-description {
          font-size: clamp(1.125rem, 2vw, 1.25rem);
          color: var(--blog-desc);
          font-weight: 400;
          line-height: 1.6;
          max-width: 48rem;
          font-family: var(--font-body), 'Inter', sans-serif;
        }
        .blog-image-wrapper {
          margin-bottom: 48px;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
          border-radius: 12px;
          background-color: var(--blog-surface);
          border: 1px solid var(--blog-border);
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.05);
        }
        .blog-grid {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .blog-sidebar {
          width: 100%;
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--blog-border);
        }
        .blog-sidebar-meta {
          display: flex;
          gap: 32px;
        }
        .share-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: transparent;
          border: 1px solid var(--blog-border);
          color: var(--blog-desc);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .share-btn:hover {
          color: var(--blog-strong);
          border-color: var(--blog-strong);
          transform: translateY(-2px);
          background-color: var(--blog-surface);
        }
        
        @media (min-width: 1024px) {
          .blog-wrapper {
            padding-top: 140px;
            padding-bottom: 128px;
          }
          .blog-container {
            padding: 0 24px;
          }
          .blog-hero {
            margin-bottom: 64px;
          }
          .blog-image-wrapper {
            aspect-ratio: 2.4/1;
            border-radius: 16px;
            margin-bottom: 80px;
          }
          .blog-grid {
            flex-direction: row;
            gap: 64px;
            align-items: flex-start;
          }
          .blog-sidebar {
            width: 200px;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-start;
            position: sticky;
            top: 128px;
            gap: 40px;
            padding-bottom: 0;
            border-bottom: none;
          }
          .blog-sidebar-meta {
            flex-direction: column;
            gap: 32px;
          }
        }

        /* Typography */
        .blog-cinematic-content {
          font-family: var(--font-body), 'Inter', system-ui, sans-serif;
          font-size: 1.125rem;
          line-height: 1.65;
          color: var(--blog-text);
          flex: 1 1 0%;
          max-width: 720px;
          min-width: 0;
        }
        .blog-cinematic-content h2 {
          font-family: var(--font-display), 'Inter', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--blog-title);
          margin-top: 3rem;
          margin-bottom: 1.25rem;
        }
        @media (min-width: 1024px) {
          .blog-cinematic-content h2 {
            font-size: 2.25rem;
            margin-top: 3.5rem;
            margin-bottom: 1.5rem;
          }
        }
        .blog-cinematic-content h3 {
          font-family: var(--font-display), 'Inter', sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--blog-strong);
          margin-top: 2.5rem;
          margin-bottom: 1rem;
        }
        .blog-cinematic-content p {
          margin-bottom: 1.5rem;
          font-weight: 400;
        }
        .blog-cinematic-content a {
          color: var(--blog-link);
          text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid var(--blog-link-border);
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .blog-cinematic-content a:hover {
          color: var(--blog-link-hover);
          border-bottom-color: var(--blog-link-hover);
        }
        .blog-cinematic-content ul, .blog-cinematic-content ol {
          margin-top: 0;
          margin-bottom: 1.75rem;
          padding-left: 1.5rem;
        }
        .blog-cinematic-content li {
          margin-bottom: 0.5rem;
          position: relative;
        }
        .blog-cinematic-content ul li::before {
          content: '•';
          position: absolute;
          left: -1.25rem;
          color: var(--blog-faint);
        }
        .blog-cinematic-content strong {
          font-weight: 600;
          color: var(--blog-strong);
        }
        .blog-cinematic-content blockquote {
          font-style: italic;
          font-weight: 400;
          color: var(--blog-desc);
          border-left: 3px solid var(--blog-quote-border);
          padding-left: 1.25rem;
          margin-top: 2rem;
          margin-bottom: 2rem;
          margin-left: 0;
        }
        @media (min-width: 1024px) {
          .blog-cinematic-content blockquote {
            padding-left: 1.5rem;
            margin-top: 2.5rem;
            margin-bottom: 2.5rem;
          }
        }
        .blog-cinematic-content code {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: 0.875em;
          background-color: var(--blog-surface);
          color: var(--blog-strong);
          padding: 0.2em 0.4em;
          border-radius: 4px;
        }
        
        .share-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          margin: -8px;
          border-radius: 50%;
          transition: background-color 0.2s, color 0.2s;
          color: var(--blog-muted);
        }
        .share-btn:hover {
          color: var(--blog-strong);
          background-color: var(--blog-surface);
        }
      `}} />

      {/* Very subtle ambient glow for the hero area */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '500px', background: 'radial-gradient(ellipse at top left, var(--blog-ambient) 0%, transparent 60%)', pointerEvents: 'none' }}></div>

      <div className="blog-wrapper">
        
        {/* Top Header Row (Breadcrumb & Tag) */}
        <div className="blog-container" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <Link 
            href="/blog" 
            className="group"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blog-muted)', textDecoration: 'none' }}
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" style={{ color: 'var(--blog-faint)' }} />
            <span className="transition-colors duration-300 group-hover:text-black dark:group-hover:text-white">Insights</span>
          </Link>

          <span className="blog-tag" style={{ margin: 0 }}>
            {post.tag_text || 'Research'}
          </span>
        </div>

        {/* Hero Section */}
        <header className="blog-container blog-hero">
          <h1 className="blog-title">
            {post.title}
          </h1>
          
          {post.description && (
            <p className="blog-description">
              {post.description}
            </p>
          )}
        </header>

        {/* Hero Image */}
        {post.image_url && (
          <div className="blog-container">
            <div className="blog-image-wrapper">
              <img 
                src={post.image_url} 
                alt={post.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        )}

        {/* Layout Grid */}
        <div className="blog-container blog-grid">
          
          {/* Sidebar / Metadata */}
          <aside className="blog-sidebar">
            
            {/* Scroll Rail (Hidden on mobile) */}
            <div className="hidden lg:block relative">
              <ScrollProgressRail />
            </div>

            <div className="blog-sidebar-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '24px' }}>
              <div className="blog-sidebar-meta" style={{ display: 'flex', alignItems: 'flex-start', gap: '48px', flexWrap: 'wrap', width: '100%' }}>
                
                {/* Author Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blog-faint)', fontWeight: 700 }}>Author</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(198, 255, 46, 0.15)',
                      borderRadius: '8px'
                    }}>
                      <LogoMark size={28} />
                    </div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--blog-strong)', lineHeight: 1.2 }}>HeroPips<br/><span style={{ fontSize: '0.65rem', color: 'var(--blog-desc)', fontWeight: 500 }}>Intelligence</span></p>
                  </div>
                </div>
                
                {/* Published Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blog-faint)', fontWeight: 700 }}>Published</h4>
                  <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--blog-desc)', display: 'flex', alignItems: 'center', gap: '6px', height: '28px' }}>
                    <Calendar style={{ width: '12px', height: '12px', opacity: 0.8 }} />
                    <time>{formattedDate}</time>
                  </p>
                </div>

                {/* Share Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blog-faint)', fontWeight: 700 }}>Share</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '28px' }}>
                    <button className="share-btn" style={{ width: '28px', height: '28px' }}>
                      <img src="https://www.google.com/s2/favicons?domain=x.com&sz=64" alt="Share on X" style={{ width: '14px', height: '14px', borderRadius: '2px' }} />
                    </button>
                    <button className="share-btn" style={{ width: '28px', height: '28px' }}>
                      <img src="https://www.google.com/s2/favicons?domain=facebook.com&sz=64" alt="Share on Facebook" style={{ width: '14px', height: '14px', borderRadius: '2px' }} />
                    </button>
                    <button className="share-btn" style={{ width: '28px', height: '28px' }}>
                      <img src="https://www.google.com/s2/favicons?domain=threads.net&sz=64" alt="Share on Threads" style={{ width: '14px', height: '14px', borderRadius: '2px' }} />
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </aside>

          {/* Main Content */}
          <article className="blog-cinematic-content">
            <MarkdownRenderer content={(post.content || '').replace(/^#\s+.*\n+/, '')} />

            {/* End Marker */}
            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--blog-border)' }}></div>
            </div>
          </article>
          
        </div>
      </div>
    </main>
  );
}
