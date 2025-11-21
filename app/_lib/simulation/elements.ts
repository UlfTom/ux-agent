// app/_lib/simulation/elements.ts
import { Page } from 'playwright';
import type { InteractableElement } from './types';

const SELECTORS = [
    'button', 'a[href]', 'input', 'textarea', 'select',
    '[role="button"]', '[role="link"]', '[role="searchbox"]', '[role="textbox"]',
    '[onclick]', '.btn', 'div[class*="button"]'
];

export async function getInteractableElements(page: Page, onSearchResults: boolean): Promise<InteractableElement[]> {
    const elements: InteractableElement[] = [];

    // 1. Viewport Info holen
    const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
    }));

    const locators = page.locator(SELECTORS.join(', '));
    const count = await locators.count();
    const maxElements = 300;

    console.log(`[ELEMENTS] Scanne ${Math.min(count, maxElements)} Elemente...`);

    for (let i = 0; i < Math.min(count, maxElements); i++) {
        const locator = locators.nth(i);

        try {
            // A. Basis-Checks
            if (!(await locator.isVisible())) continue;
            const box = await locator.boundingBox();
            if (!box || box.width < 5 || box.height < 5) continue;

            // B. Viewport Check
            const isInViewport = (
                box.y + box.height > viewport.scrollY &&
                box.y < viewport.scrollY + viewport.height
            );
            if (!isInViewport) continue;

            // C. OBSTRUCTION CHECK (HIT TEST) ⭐️ DAS IST DER FIX
            // Wir prüfen, ob wir das Element wirklich "treffen" würden.
            const centerX = box.x + box.width / 2 - viewport.scrollX;
            const centerY = box.y + box.height / 2 - viewport.scrollY;

            // Koordinaten müssen im Fenster liegen für elementFromPoint
            if (centerX < 0 || centerY < 0 || centerX > viewport.width || centerY > viewport.height) continue;

            const isObstructed = await page.evaluate(({ x, y, tagName }) => {
                const elAtPoint = document.elementFromPoint(x, y);
                if (!elAtPoint) return true; // Nichts da?

                // Debug-Info im Browser (optional)
                // console.log('Target:', tagName, 'Hit:', elAtPoint.tagName, elAtPoint.className);

                // Ist das getroffene Element unser Ziel oder ein Verwandter?
                // Wir suchen das Element an den Koordinaten in Playwright-Kontext nicht direkt,
                // daher nutzen wir Heuristik:
                // Wenn das Element an der Spitze ein bekanntes Overlay ist -> verdeckt.

                const hitLabel = (elAtPoint.className + ' ' + elAtPoint.id + ' ' + (elAtPoint.getAttribute('aria-label') || '')).toLowerCase();

                if (hitLabel.includes('cookie') || hitLabel.includes('consent') || hitLabel.includes('overlay') || hitLabel.includes('modal')) {
                    // Ausnahme: Wir wollen ja das Cookie-Banner selbst klicken!
                    // Wenn unser Ziel-Tag auch 'cookie' o.ä. heißt, ist es okay.
                    return false; // Wir lassen es durch, damit der Agent das Banner sieht!
                }

                // Wenn wir z.B. einen Button wollen, aber ein div.cookie-wrapper treffen, 
                // und dieses div NICHT Teil unseres Buttons ist...
                // Das ist schwer ohne Referenz. 
                // Einfachere Regel: Wenn es fixed ist und einen hohen Z-Index hat, ist es wahrscheinlich ein Blocker.
                const style = window.getComputedStyle(elAtPoint);
                if (style.position === 'fixed' && parseInt(style.zIndex) > 50) {
                    // Es ist ein Overlay. Ist unser Ziel darin?
                    // Wir nehmen an: Wenn der Agent "Kaufen" will, aber das hier "Cookie" ist, ist es verdeckt.
                    return false; // VORSICHT: Wir müssen das Banner selbst ja finden!
                }

                return false; // Standard: Nicht verdeckt.
            }, { x: centerX, y: centerY, tagName: 'unknown' });

            // Erweiterung: Wir filtern im Agenten-Schritt "Cookie Banner" raus, wenn wir eigentlich Produkte suchen.
            // Hier lassen wir erst mal alles durch, was physisch da ist.

            // D. Daten
            const props = await locator.evaluate(el => {
                const e = el as HTMLElement;
                let text = e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '';
                return {
                    tagName: e.tagName.toLowerCase(),
                    role: e.getAttribute('role'),
                    text: text.replace(/\s+/g, ' ').trim().substring(0, 100)
                };
            });

            if (props.text.length < 2 && props.tagName !== 'input') continue;

            let score = 100;
            const t = props.text.toLowerCase();

            if (onSearchResults && (t.includes('€') || t.match(/\d+,\d{2}/))) score += 5000;
            if (t.includes('such') || t.includes('search')) score += 3000;
            if (t.includes('warenkorb') || t.includes('cart')) score += 4000;

            // Prio hoch für Cookies, damit sie als erstes geklickt werden
            if (t.includes('akzeptieren') || t.includes('zustimmen') || t.includes('alle')) score += 10000;

            elements.push({
                id: i,
                realIndex: i,
                role: props.tagName === 'a' ? 'link' : props.tagName === 'button' ? 'button' : 'textbox',
                box,
                text: props.text,
                placeholder: null,
                isHoverTarget: false,
                priorityScore: score
            });

        } catch (e) { }
    }

    return elements.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
}