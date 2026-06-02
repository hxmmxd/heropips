import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://finance.yahoo.com/news/rssindex', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch RSS feed, status: ${res.status}`);
    }

    const xmlText = await res.text();
    const items: Array<{ title: string; link: string; pubDate: string; source: string }> = [];

    // Parse XML using regex to avoid extra dependencies
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const content = match[1];
      const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = content.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      if (titleMatch && linkMatch) {
        items.push({
          title: decodeHtml(titleMatch[1].trim()),
          link: linkMatch[1].trim(),
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
          source: sourceMatch ? sourceMatch[1].trim() : 'Yahoo Finance'
        });
      }
      if (items.length >= 10) break; // Limit to 10 stories
    }

    return NextResponse.json({ news: items });
  } catch (error: any) {
    console.error('[News API] Error:', error);
    return NextResponse.json({ news: [], error: error.message }, { status: 500 });
  }
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
