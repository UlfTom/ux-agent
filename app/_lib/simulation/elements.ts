// app/_lib/simulation/elements.ts
// FIX: Multi-strategy product detection

import { Page } from 'playwright';
import type { InteractableElement } from './types';

export async function getInteractableElements(page: Page): Promise<InteractableElement[]> {
    try {
        const elements = await page.evaluate(() => {
            const results: Array<{
                index: number;
                realIndex: number;
                role: 'link' | 'button' | 'textbox';
                box: { x: number; y: number; width: number; height: number };
                text: string;
                placeholder: string | null;
                isHoverTarget: boolean;
                priorityScore: number;
                href?: string;
                ariaLabel?: string;
                classes?: string;
            }> = [];

            let globalIndex = 0;

            // Helper: Check if element is visible
            function isVisible(el: Element): boolean {
                if (!(el instanceof HTMLElement)) return false;
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    rect.top < window.innerHeight &&
                    rect.bottom > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0'
                );
            }

            // Helper: Calculate priority score
            function calculatePriority(el: HTMLElement, role: string, text: string, href?: string, ariaLabel?: string): number {
                let score = 100;

                // ═══════════════════════════════════════════════════════════
                // STRATEGY 1: Product Link Detection (Multiple patterns)
                // ═══════════════════════════════════════════════════════════
                if (role === 'link' && href) {
                    const hrefLower = href.toLowerCase();

                    // OTTO-specific product patterns
                    if (
                        hrefLower.includes('/p/') ||           // /p/{product-id}
                        hrefLower.includes('/produkt/') ||     // /produkt/{name}
                        hrefLower.includes('/artikel/') ||     // /artikel/{id}
                        hrefLower.match(/\/[a-z]+-\d{7,}/)     // /name-1234567
                    ) {
                        score += 800;  // HIGH PRIORITY!
                        console.log(`[PRODUCT LINK DETECTED] href: ${href.substring(0, 50)}, score: ${score}`);
                    }

                    // Price indication in link text
                    if (text && (text.includes('€') || text.includes('ab ') || text.match(/\d+,\d{2}/))) {
                        score += 300;
                    }

                    // Brand names often in product links
                    const brandKeywords = ['ESRA', 'ARIZONA', 'G4FREE', 'ONLY', 'WITT', 'NORDCAP', "HAILY'S"];
                    if (brandKeywords.some(brand => text.toUpperCase().includes(brand))) {
                        score += 200;
                    }

                    // Negative: Navigation/Account links
                    if (
                        hrefLower.includes('/konto') ||
                        hrefLower.includes('/mein') ||
                        hrefLower.includes('/service') ||
                        hrefLower.includes('/merkzettel') ||
                        hrefLower.includes('/warenkorb') ||
                        hrefLower.includes('/kategorien') ||
                        hrefLower === '/' ||
                        hrefLower === '#'
                    ) {
                        score -= 900; // DEPRIORITIZE!
                    }
                }

                // ═══════════════════════════════════════════════════════════
                // STRATEGY 2: Visual Product Card Detection
                // ═══════════════════════════════════════════════════════════
                const classNames = el.className?.toString().toLowerCase() || '';
                const ariaLabelLower = (ariaLabel || '').toLowerCase();

                // Product card classes
                if (
                    classNames.includes('product') ||
                    classNames.includes('artikel') ||
                    classNames.includes('item') ||
                    classNames.includes('tile') ||
                    ariaLabelLower.includes('produkt') ||
                    ariaLabelLower.includes('article')
                ) {
                    score += 400;
                }

                // ═══════════════════════════════════════════════════════════
                // STRATEGY 3: Text-based Product Detection
                // ═══════════════════════════════════════════════════════════
                const textLower = text.toLowerCase();

                // Product names often contain these
                if (textLower.includes('jeans') || textLower.includes('hose') || textLower.includes('thermohose')) {
                    score += 200;
                }

                // Size/Material indicators
                if (textLower.match(/größe|size|xl|xxl|material|baumwolle/)) {
                    score += 150;
                }

                // ═══════════════════════════════════════════════════════════
                // STRATEGY 4: Contextual boost from parent
                // ═══════════════════════════════════════════════════════════
                let parent = el.parentElement;
                let depth = 0;
                while (parent && depth < 3) {
                    const parentClass = parent.className?.toString().toLowerCase() || '';
                    if (parentClass.includes('grid') || parentClass.includes('list') || parentClass.includes('result')) {
                        score += 100;
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }

                // ═══════════════════════════════════════════════════════════
                // Negative scoring for non-products
                // ═══════════════════════════════════════════════════════════
                const navKeywords = ['navigation', 'header', 'footer', 'sidebar', 'menu', 'banner', 'cookie'];
                if (navKeywords.some(kw => classNames.includes(kw) || textLower.includes(kw))) {
                    score -= 500;
                }

                // Empty or very short text (likely decorative)
                if (text.trim().length < 3) {
                    score -= 200;
                }

                return Math.max(0, score);
            }

            // Collect Links
            document.querySelectorAll('a[href]').forEach((el) => {
                if (!isVisible(el)) return;
                const rect = el.getBoundingClientRect();
                const text = (el.textContent || '').trim();
                const href = (el as HTMLAnchorElement).href;
                const ariaLabel = el.getAttribute('aria-label');
                const priority = calculatePriority(el as HTMLElement, 'link', text, href, ariaLabel || undefined);

                if (priority > 0) {
                    results.push({
                        index: results.length,
                        realIndex: globalIndex++,
                        role: 'link',
                        box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
                        text: text.substring(0, 150),
                        placeholder: null,
                        isHoverTarget: false,
                        priorityScore: priority,
                        href: href.substring(0, 200),
                        ariaLabel: ariaLabel || undefined,
                        classes: (el as HTMLElement).className.toString().substring(0, 100)
                    });
                }
            });

            // Collect Buttons
            document.querySelectorAll('button').forEach((el) => {
                if (!isVisible(el)) return;
                const rect = el.getBoundingClientRect();
                const text = (el.textContent || '').trim();
                const ariaLabel = el.getAttribute('aria-label');
                const priority = calculatePriority(el, 'button', text, undefined, ariaLabel || undefined);

                if (priority > 50 && text.length > 0) {
                    results.push({
                        index: results.length,
                        realIndex: globalIndex++,
                        role: 'button',
                        box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
                        text: text.substring(0, 150),
                        placeholder: null,
                        isHoverTarget: false,
                        priorityScore: priority
                    });
                }
            });

            // Collect Textboxes
            document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])').forEach((el) => {
                if (!isVisible(el)) return;
                const rect = el.getBoundingClientRect();
                const inputEl = el as HTMLInputElement;
                const priority = calculatePriority(el as HTMLElement, 'textbox', inputEl.value, undefined);

                results.push({
                    index: results.length,
                    realIndex: globalIndex++,
                    role: 'textbox',
                    box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
                    text: inputEl.value,
                    placeholder: inputEl.placeholder || null,
                    isHoverTarget: false,
                    priorityScore: priority + 150 // Textboxes are important
                });
            });

            // Sort by priority (highest first)
            results.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

            // Reassign indices after sort
            results.forEach((r, i) => { r.index = i; });

            console.log(`[ELEMENTS] Total found: ${results.length}`);
            console.log(`[ELEMENTS] Top 5 by priority:`, results.slice(0, 5).map(r => ({
                id: r.index,
                role: r.role,
                text: r.text.substring(0, 30),
                score: r.priorityScore,
                href: r.href?.substring(0, 40)
            })));

            return results;
        });

        console.log(`[ELEMENTS] Returning ${elements.length} elements to server`);
        return elements as unknown as InteractableElement[];
    } catch (error) {
        console.error('[ELEMENTS] Error:', error);
        return [];
    }
}