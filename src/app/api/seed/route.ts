import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const cards = [
    {
      title: 'Welcome to HeroPips', 
      description: 'The ultimate ecosystem for modern traders. Get access to top-tier education, AI tools, and a thriving community.', 
      tag_text: 'OUR PLATFORM', 
      tag_color: 'volt', 
      link_text: 'Discover the ecosystem →', 
      link_url: '/about', 
      image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop', 
      card_type: 'split', 
      bento_size: 'wide', 
      order_index: 1, 
      is_published: true
    },
    {
      title: 'AI Trading Systems', 
      description: 'Leverage cutting-edge algorithmic models and machine learning to find high-probability setups in real-time.', 
      tag_text: 'TECHNOLOGY', 
      tag_color: 'purple', 
      link_text: 'Explore AI Tools →', 
      link_url: '/ai-trading', 
      image_url: 'https://images.unsplash.com/photo-1620825937374-87fc7d620984?q=80&w=800&auto=format&fit=crop', 
      card_type: 'standard', 
      bento_size: 'tall', 
      order_index: 2, 
      is_published: true
    },
    {
      title: 'Mastering Forex', 
      description: 'Learn the intricacies of currency pairs, global macros, and technical analysis from veteran institutional traders.', 
      tag_text: 'FX MARKETS', 
      tag_color: 'blue', 
      link_text: 'Start learning FX →', 
      link_url: '/education/forex', 
      image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop', 
      card_type: 'standard', 
      bento_size: 'tall', 
      order_index: 3, 
      is_published: true
    },
    {
      title: 'Trading Education', 
      description: 'From beginner basics to advanced order block theory. We provide a structured curriculum to elevate your trading.', 
      tag_text: 'ACADEMY', 
      tag_color: 'green', 
      link_text: 'View Curriculum →', 
      link_url: '/education', 
      image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800&auto=format&fit=crop', 
      card_type: 'video', 
      bento_size: 'wide', 
      order_index: 4, 
      is_published: true
    },
    {
      title: 'Crypto Trading', 
      description: 'Navigate the volatile 24/7 digital asset markets with our comprehensive crypto trading strategies and insights.', 
      tag_text: 'CRYPTO', 
      tag_color: 'orange', 
      link_text: 'Trade Crypto →', 
      link_url: '/education/crypto', 
      image_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=800&auto=format&fit=crop', 
      card_type: 'standard', 
      bento_size: 'square', 
      order_index: 5, 
      is_published: true
    },
    {
      title: 'Join the Community', 
      description: 'Trade alongside thousands of like-minded individuals in our exclusive Discord server. Live sessions daily.', 
      tag_text: 'COMMUNITY', 
      tag_color: 'white', 
      link_text: 'Join Discord →', 
      link_url: '/discord', 
      image_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?q=80&w=800&auto=format&fit=crop', 
      card_type: 'standard', 
      bento_size: 'square', 
      order_index: 6, 
      is_published: true
    }
  ];

  const { data, error } = await supabase.from('bento_cards').insert(cards);
  
  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, message: 'Inserted 6 cards!' });
}
