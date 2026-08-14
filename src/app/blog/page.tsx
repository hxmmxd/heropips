import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata = {
  title: 'Blog | HeroPips',
  description: 'Read the latest insights and educational articles from HeroPips.',
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const supabase = createClient();
  
  // Fetch only published cards that have a slug and content
  const { data: cards, error } = await supabase
    .from('bento_cards')
    .select('*')
    .eq('is_published', true)
    .not('slug', 'is', null)
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching blog posts:', error);
  }

  return (
    <main style={{ paddingBottom: '120px' }}>
      <section className="lp-bento-wrap" style={{ minHeight: '80vh', paddingTop: '160px' }}>
        <div className="lp-struct-container">
          {/* Horizontal Bounding Lines */}
          <div className="lp-struct-h-line top" />
          <div className="lp-struct-h-line bottom" />
          <div className="lp-struct-v-line left" />
          <div className="lp-struct-v-line right" />
          <div className="lp-struct-crosshair top left" />
          <div className="lp-struct-crosshair top right" />
          <div className="lp-struct-crosshair bottom left" />
          <div className="lp-struct-crosshair bottom right" />

          <div className="lp-bento-inner">
            <div className="lp-bento-header" style={{ marginBottom: '60px' }}>
              <h2 className="lp-bento-title">HeroPips Insights</h2>
              <p style={{ marginTop: '16px', color: 'var(--text-mid)', fontSize: '18px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                Deep dives into market structure, AI trading, and institutional-grade strategies.
              </p>
            </div>

            {(!cards || cards.length === 0) ? (
              <div className="p-10 text-center" style={{ color: 'var(--text-low)' }}>
                No published articles yet. Check back soon!
              </div>
            ) : (
              <div className="lp-bento-grid">
                {cards.map((card) => {
                  let sizeClass = 'bento-square';
                  if (card.bento_size === 'tall') sizeClass = 'bento-tall';
                  if (card.bento_size === 'wide') sizeClass = 'bento-wide';
                  if (card.bento_size === 'large') sizeClass = 'bento-large';
                  
                  const postUrl = `/blog/${card.slug}`;

                  if (card.card_type === 'split') {
                    return (
                      <Link key={card.id} href={postUrl} className={`lp-bento-card ${sizeClass} hover:border-[var(--volt-400)] transition-colors duration-300 block`}>
                        <div className="lp-bento-content-split flex w-full h-full">
                          <div className="lp-bento-text">
                            <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                            <h3 className="lp-bento-card-title">{card.title}</h3>
                            {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                            <span className="lp-bento-link mt-auto inline-block">Read Article →</span>
                          </div>
                          <div className="lp-bento-img-side">
                            {card.image_url && <img src={card.image_url} alt={card.title} className="lp-bento-img group-hover:scale-105 transition-transform duration-500" />}
                          </div>
                        </div>
                      </Link>
                    );
                  }

                  if (card.card_type === 'video') {
                    return (
                      <Link key={card.id} href={postUrl} className={`lp-bento-card ${sizeClass} card-type-video hover:border-[var(--volt-400)] transition-colors duration-300 block group`}>
                        {card.image_url && (
                          <div className="lp-bento-img-wrap-full overflow-hidden">
                            <img src={card.image_url} alt={card.title} className="lp-bento-img group-hover:scale-105 transition-transform duration-700" />
                            <div className="lp-bento-livestream-overlay"></div>
                          </div>
                        )}
                        <div className="lp-bento-content-overlay relative z-10">
                          <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                          <h3 className="lp-bento-card-title">{card.title}</h3>
                          {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                          <span className="lp-bento-link mt-auto inline-block">Read Article →</span>
                        </div>
                      </Link>
                    );
                  }

                  if (card.card_type === 'abstract') {
                    return (
                      <Link key={card.id} href={postUrl} className={`lp-bento-card ${sizeClass} card-type-abstract hover:border-[var(--volt-400)] transition-colors duration-300 block group`}>
                        <div className="lp-bento-abstract-bg">
                           <div className="abstract-glow"></div>
                        </div>
                        <div className="abstract-code">
                          {`import { quant } from '@heropips/core';\n\nawait quant.analyze({\n  target: '${card.slug.substring(0, 15)}',\n  mode: 'institutional'\n});`}
                        </div>
                        <div className="lp-bento-content-overlay">
                          <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                          <h3 className="lp-bento-card-title">{card.title}</h3>
                          {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                          <span className="lp-bento-link mt-auto inline-block">Read Research →</span>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <Link key={card.id} href={postUrl} className={`lp-bento-card ${sizeClass} hover:border-[var(--volt-400)] transition-colors duration-300 block group`}>
                      {card.image_url && (
                        <div className="lp-bento-img-wrap overflow-hidden">
                          <img src={card.image_url} alt={card.title} className="lp-bento-img group-hover:scale-105 transition-transform duration-700" />
                        </div>
                      )}
                      <div className="lp-bento-content">
                        <span className={`lp-bento-tag tag-${card.tag_color}`}>{card.tag_text}</span>
                        <h3 className="lp-bento-card-title">{card.title}</h3>
                        {card.description && <p className="lp-bento-card-desc">{card.description}</p>}
                        <span className="lp-bento-link mt-auto inline-block">Read Article →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
