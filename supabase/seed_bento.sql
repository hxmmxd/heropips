-- 1. Create the bento_cards table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS bento_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    tag_text text,
    tag_color text DEFAULT 'purple',
    link_text text,
    link_url text,
    image_url text,
    card_type text DEFAULT 'standard',
    bento_size text DEFAULT 'square',
    order_index integer DEFAULT 0,
    is_published boolean DEFAULT false,
    slug text UNIQUE,
    content text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE bento_cards ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow anyone to read published cards
DROP POLICY IF EXISTS "Allow public read access to published bento cards" ON bento_cards;
CREATE POLICY "Allow public read access to published bento cards" 
ON bento_cards FOR SELECT 
USING (is_published = true);

-- Allow authenticated admins to do everything (assuming admins have 'service_role' or specific auth)
-- Since it's a CMS, you might want to allow authenticated users to manage it. 
-- For simplicity, this policy allows all operations if the user is authenticated.
DROP POLICY IF EXISTS "Allow authenticated full access" ON bento_cards;
CREATE POLICY "Allow authenticated full access" 
ON bento_cards FOR ALL 
USING (auth.role() = 'authenticated');

-- 4. Truncate old data and Insert the Seed Data
TRUNCATE TABLE bento_cards;

INSERT INTO bento_cards (
  title, description, tag_text, tag_color, link_text, link_url, image_url, card_type, bento_size, order_index, is_published, slug, content
) VALUES 
(
  'Welcome to HeroPips', 
  'The ultimate ecosystem for modern traders. Get access to top-tier education, AI tools, and a thriving community.', 
  'OUR PLATFORM', 
  'volt', 
  'Discover the ecosystem →', 
  '/blog/welcome-to-heropips', 
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop', 
  'split', 
  'wide', 
  1, 
  true,
  'welcome-to-heropips',
  '# Welcome to HeroPips
HeroPips is designed to give you the ultimate edge in the markets. 

We provide an all-in-one ecosystem for institutional-grade analytics, educational resources, and a thriving community of dedicated traders. 

## What to expect?
- **World-Class Education:** Our curriculum takes you from absolute basics to advanced institutional order flow.
- **AI-Powered Tools:** Leverage our proprietary AI scanners and market insights.
- **Community:** Connect with like-minded traders in our Discord server.'
),
(
  'AI Trading Systems', 
  'Leverage cutting-edge algorithmic models and machine learning to find high-probability setups in real-time.', 
  'TECHNOLOGY', 
  'purple', 
  'Explore AI Tools →', 
  '/blog/ai-trading-systems', 
  'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?q=80&w=800&auto=format&fit=crop', 
  'standard', 
  'tall', 
  2, 
  true,
  'ai-trading-systems',
  '# The Future of Trading is AI

Algorithms and Machine Learning are no longer just for Wall Street hedge funds. 

At HeroPips, we are democratizing access to institutional-grade technology. 

## Our AI Scanners
Our deep-learning models scan thousands of forex and crypto pairs across multiple timeframes to identify:
1. **Liquidity Grabs**
2. **Order Block Formations**
3. **Imbalance Fills**

Stop staring at charts all day. Let the machine do the heavy lifting.'
),
(
  'Mastering Forex', 
  'Learn the intricacies of currency pairs, global macros, and technical analysis from veteran institutional traders.', 
  'FX MARKETS', 
  'blue', 
  'Start learning FX →', 
  '/blog/mastering-forex', 
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=800&auto=format&fit=crop', 
  'standard', 
  'tall', 
  3, 
  true,
  'mastering-forex',
  '# Conquer the Foreign Exchange Market

The Forex market moves $6.6 trillion a day. To capture your piece of the pie, you need a deep understanding of macroeconomic drivers and strict risk management.

## Key Concepts We Cover
- **Central Bank Policies:** How interest rates dictate currency strength.
- **Market Structure:** Identifying institutional market cycles (Accumulation, Manipulation, Distribution).
- **Risk Management:** Why capital preservation is your only edge.

Join our live sessions to see how we navigate the FX markets every single day.'
),
(
  'Trading Education', 
  'From beginner basics to advanced order block theory. We provide a structured curriculum to elevate your trading.', 
  'ACADEMY', 
  'green', 
  'View Curriculum →', 
  '/blog/trading-education', 
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800&auto=format&fit=crop', 
  'video', 
  'wide', 
  4, 
  true,
  'trading-education',
  '# The HeroPips Academy

Education is the cornerstone of a successful trading career. We have built a comprehensive curriculum that leaves no stone unturned.

### Beginner Phase
Learn the basics of price action, candlesticks, and how to use a broker.

### Intermediate Phase
Dive into Fibonacci retracements, market structure, and liquidity concepts.

### Advanced Phase
Master Institutional Order Flow (ICT/SMC concepts), Wyckoff schematics, and advanced trade management techniques.'
),
(
  'Crypto Trading', 
  'Navigate the volatile 24/7 digital asset markets with our comprehensive crypto trading strategies and insights.', 
  'CRYPTO', 
  'orange', 
  'Trade Crypto →', 
  '/blog/crypto-trading', 
  'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=800&auto=format&fit=crop', 
  'standard', 
  'square', 
  5, 
  true,
  'crypto-trading',
  '# Navigating the Crypto Wild West

Cryptocurrency markets are highly volatile, 24/7, and deeply narrative-driven. 

## How We Trade Crypto
- **Spot Accumulation:** Building long-term portfolios using Dollar Cost Averaging on major pullbacks.
- **Perp Futures:** Capitalizing on short-term volatility with strict stop-losses.
- **On-Chain Analysis:** Following the smart money and whale movements.

Our community is always on top of the latest narratives.'
),
(
  'Join the Community', 
  'Trade alongside thousands of like-minded individuals in our exclusive Discord server. Live sessions daily.', 
  'COMMUNITY', 
  'white', 
  'Join Discord →', 
  '/discord', 
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop', 
  'standard', 
  'square', 
  6, 
  true,
  'join-the-community',
  '# We Are Stronger Together

Trading can be a lonely journey. It doesn''t have to be.

The HeroPips Discord is the heart of our operations. 

- **Daily Live Streams:** Watch our analysts break down the markets live every morning (NY & London sessions).
- **Setup Sharing:** Discuss trade ideas with peers.
- **Psychology Support:** Keep your mindset in check with community accountability.

[Click here to join the Discord today!](/discord)'
);
