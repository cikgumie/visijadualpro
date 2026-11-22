/*
 * VisiJadual Pro — service worker (PWA, luar talian)
 * Hak Cipta (c) 2026 cikgumie. Hak cipta terpelihara.
 *
 * - Halaman (index.html): rangkaian dahulu, cache jika luar talian → kemas kini sentiasa sampai bila ada internet.
 * - Pustaka CDN & fon: cache dahulu (versi tetap) → aplikasi boleh dibuka tanpa internet selepas lawatan pertama.
 * - Google Drive / log masuk Google: tidak disentuh (sentiasa terus ke rangkaian).
 * VERSION ditukar oleh skrip build setiap kali index.html berubah.
 * BINAAN = versi yang dipapar dalam aplikasi; aplikasi membaca baris ini untuk mengesan versi baharu.
 */
const VERSION = 'd2e2fdd8ec94';
const BINAAN = '2026.11.22-1e49a5';
const CACHE_PAGE = 'vj-page-' + VERSION;
const CACHE_LIB = 'vj-lib-v1';

const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
    'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
const LIBS = [
    'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js',
    'https://cdn.tailwindcss.com',
    'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
];
const LIB_HOSTS = ['unpkg.com', 'cdn.tailwindcss.com', 'cdn.sheetjs.com', 'cdnjs.cloudflare.com',
    'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const page = await caches.open(CACHE_PAGE);
        await Promise.all(SHELL.map(u => page.add(new Request(u, { cache: 'reload' })).catch(() => {})));
        const lib = await caches.open(CACHE_LIB);
        await Promise.all(LIBS.map(async u => {
            if (await lib.match(u)) return;
            try { await lib.put(u, await fetch(u, { mode: 'no-cors' })); } catch (err) { /* cuba lagi semasa digunakan */ }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', e => {
    e.waitUntil((async () => {
        const keep = [CACHE_PAGE, CACHE_LIB];
        for (const k of await caches.keys()) if (k.startsWith('vj-') && !keep.includes(k)) await caches.delete(k);
        await self.clients.claim();
    })());
});

// Rangkaian dahulu; jika gagal / terlalu lambat (luar talian) dan ada salinan, guna cache
async function halaman(req) {
    const cache = await caches.open(CACHE_PAGE);
    const kunci = req.mode === 'navigate' ? './' : req;
    const salinan = await cache.match(kunci, { ignoreSearch: true });
    const rangkaian = fetch(req).then(res => {
        if (res && res.ok) cache.put(kunci, res.clone());
        return res;
    });
    rangkaian.catch(() => {});
    if (!salinan) return rangkaian;
    try {
        return await Promise.race([
            rangkaian,
            new Promise((_, gagal) => setTimeout(() => gagal(new Error('timeout')), 6000)),
        ]);
    } catch (err) {
        return salinan;
    }
}

async function pustaka(req) {
    const cache = await caches.open(CACHE_LIB);
    const c = await cache.match(req, { ignoreVary: true });
    if (c) return c;
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
}

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin === self.location.origin) {
        const path = url.pathname;
        const scope = new URL(self.registration.scope).pathname;
        if (req.mode === 'navigate' || path === scope || path.endsWith('/index.html')) { e.respondWith(halaman(req)); return; }
        if (SHELL.some(u => new URL(u, self.registration.scope).pathname === path)) { e.respondWith(halaman(req)); return; }
        return;
    }
    if (LIB_HOSTS.includes(url.hostname)) e.respondWith(pustaka(req));
});
