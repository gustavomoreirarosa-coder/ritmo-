/* =====================================================================
   Ritmo — Service Worker
   Para publicar uma nova versão do app, basta trocar VERSAO abaixo.
   O cache antigo é apagado na ativação; os dados do usuário vivem no
   IndexedDB e NUNCA são tocados por este arquivo.
   ===================================================================== */
const VERSAO = 'ritmo-v1.3.0';
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const CACHE_DINAMICO = `${VERSAO}-dinamico`;
const CACHE_FONTES   = `${VERSAO}-fontes`;

/* Pré-cache: o mínimo para o app abrir offline já na primeira visita. */
const PRE_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icone-192.png',
  './icone-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

/* Splash screens do iOS: pesadas e usadas só na abertura. Ficam fora do
   pré-cache e entram sob demanda, pela estratégia de imagem. */

/* ---------------------------------------------------------------- instalação */
self.addEventListener('install', evento => {
  console.info('[SW] instalando', VERSAO);
  evento.waitUntil(
    caches.open(CACHE_ESTATICO)
      .then(cache => Promise.allSettled(
        PRE_CACHE.map(url => cache.add(url).catch(e => {
          console.warn('[SW] não consegui pré-cachear', url, e.message);
        }))
      ))
      /* Não chamamos skipWaiting aqui: a página pergunta ao usuário antes
         de trocar de versão, para não recarregar no meio de uma edição. */
      .then(() => console.info('[SW] pré-cache concluído'))
  );
});

/* ---------------------------------------------------------------- ativação */
self.addEventListener('activate', evento => {
  console.info('[SW] ativando', VERSAO);
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes
          .filter(n => !n.startsWith(VERSAO))
          .map(n => { console.info('[SW] removendo cache antigo', n); return caches.delete(n); })
      ))
      .then(() => self.clients.claim())
  );
});

/* A página manda esta mensagem quando o usuário toca em "Atualizar". */
self.addEventListener('message', evento => {
  if (evento.data && evento.data.tipo === 'PULAR_ESPERA') {
    console.info('[SW] assumindo controle a pedido do usuário');
    self.skipWaiting();
  }
  if (evento.data && evento.data.tipo === 'VERSAO') {
    evento.ports[0] && evento.ports[0].postMessage({ versao: VERSAO });
  }
});

/* ---------------------------------------------------------------- estratégias */

/* HTML — Network First: você sempre vê a versão mais nova se houver rede,
   e a cópia em cache entra em cena assim que a rede falha. */
async function networkFirst(req, cache) {
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) (await caches.open(cache)).put(req, resp.clone());
    return resp;
  } catch (e) {
    const guardado = await caches.match(req);
    if (guardado) return guardado;
    const fallback = await caches.match('./offline.html');
    return fallback || new Response('Sem conexão e sem cópia local.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* CSS, fontes, ícones e imagens — Cache First: não mudam entre versões,
   então servir do disco é sempre mais rápido e funciona offline. */
async function cacheFirst(req, cache) {
  const guardado = await caches.match(req);
  if (guardado) return guardado;
  try {
    const resp = await fetch(req);
    if (resp && (resp.ok || resp.type === 'opaque')) {
      (await caches.open(cache)).put(req, resp.clone());
    }
    return resp;
  } catch (e) {
    console.warn('[SW] recurso indisponível offline:', req.url);
    return new Response('', { status: 504 });
  }
}

/* JS — Stale While Revalidate: responde na hora com o que tem e
   atualiza a cópia em segundo plano para a próxima abertura. */
async function staleWhileRevalidate(req, cache) {
  const guardado = await caches.match(req);
  const rede = fetch(req).then(async resp => {
    if (resp && resp.ok) (await caches.open(cache)).put(req, resp.clone());
    return resp;
  }).catch(() => null);
  return guardado || (await rede) || new Response('', { status: 504 });
}

function tipoDe(url, req) {
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) return 'html';
  if (url.pathname.endsWith('.css')) return 'css';
  if (url.pathname.endsWith('.js')) return 'js';
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) return 'fonte';
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(url.pathname)) return 'imagem';
  if (url.pathname.endsWith('.json')) return 'json';
  return 'outro';
}

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;                 /* nunca cacheia escrita */

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  switch (tipoDe(url, req)) {
    case 'html':
      evento.respondWith(networkFirst(req, CACHE_DINAMICO)); break;
    case 'css':
    case 'imagem':
      evento.respondWith(cacheFirst(req, CACHE_ESTATICO)); break;
    case 'fonte':
      evento.respondWith(cacheFirst(req, CACHE_FONTES)); break;
    case 'js':
      evento.respondWith(staleWhileRevalidate(req, CACHE_DINAMICO)); break;
    case 'json':
      evento.respondWith(networkFirst(req, CACHE_ESTATICO)); break;
    default:
      evento.respondWith(staleWhileRevalidate(req, CACHE_DINAMICO));
  }
});
