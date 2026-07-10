// 打咭鐘 App Shell 快取（stale-while-revalidate）
// 呢個service worker要同 index.html／manifest.json／icon-*.png 放喺同一個資料夾，
// 用真正嘅網頁伺服器（https 或者 localhost）host先會生效；淨係喺iPad度直接開個.html檔案
// （file://）唔會生效，但唔影響app本身運作，只係冇離線快取呢一層。
const CACHE_NAME = 'time-clock-shell-v2';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 逐個檔案分開cache，如果其中一個攞唔到（例如檔名執錯）只會嗰個冇得快取，
      // 唔會累到成個app shell都快取唔到（cache.addAll係一齊成一齊敗，太脆弱）。
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('快取唔到:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
