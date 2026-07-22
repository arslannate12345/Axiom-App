import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const strategy = searchParams.get('strategy') || 'desktop';

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PSI_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PSI_API_KEY is not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Define categories to fetch
  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  const categoryParams = categories.map(c => `category=${c}`).join('&');

  try {
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&strategy=${strategy}&${categoryParams}&key=${apiKey}`;

    const response = await fetch(psiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Important: don't cache this request at the Next.js level so users can run fresh audits
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PSI API Error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch audit from PageSpeed Insights' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching PSI data:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching audit' },
      { status: 500 }
    );
  }
}
