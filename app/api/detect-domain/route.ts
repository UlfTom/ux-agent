// app/api/detect-domain/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request: NextRequest) {
    const { url } = await request.json();

    if (!url) {
        return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    let browser = null;

    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Quick load
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        // Extract meta info
        const pageInfo = await page.evaluate(() => {
            // Get title
            const title = document.title || '';

            // Get meta description
            const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            // Get meta keywords
            const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';

            // Get Open Graph type
            const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content') || '';

            // Get some body text
            const bodyText = document.body?.innerText.substring(0, 500) || '';

            // Check for common indicators
            const hasCart = !!document.querySelector('[class*="cart"], [id*="cart"], [href*="cart"]');
            const hasCheckout = !!document.querySelector('[href*="checkout"], [href*="kasse"]');
            const hasLogin = !!document.querySelector('[href*="login"], [href*="anmelden"]');
            const hasSearch = !!document.querySelector('input[type="search"], [role="search"]');

            return {
                title,
                metaDesc,
                metaKeywords,
                ogType,
                bodyText,
                hasCart,
                hasCheckout,
                hasLogin,
                hasSearch
            };
        });

        await browser.close();

        // Analyze with simple heuristics
        const domain = detectDomain(pageInfo, url);

        return NextResponse.json({ domain });

    } catch (error) {
        if (browser) await browser.close();

        return NextResponse.json({
            domain: 'Unknown Website',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

function detectDomain(info: any, url: string): string {
    const combined = `${info.title} ${info.metaDesc} ${info.metaKeywords} ${info.bodyText}`.toLowerCase();

    // E-Commerce
    if (info.hasCart || info.hasCheckout ||
        combined.includes('shop') ||
        combined.includes('produkt') ||
        combined.includes('warenkorb') ||
        combined.includes('kaufen') ||
        combined.includes('bestellen')) {
        return 'E-Commerce';
    }

    // Travel
    if (combined.includes('hotel') ||
        combined.includes('flug') ||
        combined.includes('reise') ||
        combined.includes('buchung') ||
        combined.includes('urlaub')) {
        return 'Travel & Booking';
    }

    // Finance
    if (combined.includes('bank') ||
        combined.includes('kredit') ||
        combined.includes('versicherung') ||
        combined.includes('finanz') ||
        combined.includes('konto')) {
        return 'Finance';
    }

    // SaaS
    if (combined.includes('software') ||
        combined.includes('dashboard') ||
        combined.includes('platform') ||
        combined.includes('app') ||
        info.ogType === 'product.app') {
        return 'SaaS Platform';
    }

    // News/Media
    if (combined.includes('nachrichten') ||
        combined.includes('news') ||
        combined.includes('artikel') ||
        combined.includes('magazin')) {
        return 'News & Media';
    }

    // Job Portal
    if (combined.includes('job') ||
        combined.includes('karriere') ||
        combined.includes('stellenangebot') ||
        combined.includes('bewerbung')) {
        return 'Job Portal';
    }

    // Education
    if (combined.includes('kurs') ||
        combined.includes('lernen') ||
        combined.includes('universität') ||
        combined.includes('education')) {
        return 'Education';
    }

    // Healthcare
    if (combined.includes('arzt') ||
        combined.includes('gesundheit') ||
        combined.includes('termin') ||
        combined.includes('praxis')) {
        return 'Healthcare';
    }

    // Real Estate
    if (combined.includes('immobilie') ||
        combined.includes('wohnung') ||
        combined.includes('haus kaufen') ||
        combined.includes('mieten')) {
        return 'Real Estate';
    }

    // Default
    return 'General Website';
}
