// 루나 연애상담 - Service Worker
// TWA (Trusted Web Activity) 필수 요건
const CACHE_NAME = 'luna-v1';
const OFFLINE_URL = '/offline.html';

// App Shell - 핵심 UI 리소스 캐싱
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  OFFLINE_URL,
];

// 설치 시 App Shell 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 네트워크 요청 처리 - Network First 전략
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API 및 미디어 자원(비디오 등)은 캐싱하지 않음
  if (
    request.url.includes('/api/') ||
    request.url.includes('supabase') ||
    request.url.match(/\.(mp4|webm|avi|mkv|mp3|wav|ogg)$/i) ||
    request.headers.has('range') ||
    request.method !== 'GET'
  ) {
    return;
  }

  // 네비게이션 요청 (HTML 페이지)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 정적 리소스 - Network First with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공(200 상태코드) 시에만 캐시에 저장 (206 Partial Content 등은 캐싱 불가)
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // 오프라인일 때 캐시에서 반환
        return caches.match(request);
      })
  );
});
