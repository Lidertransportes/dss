/*
LÍDER TRANSPORTES — DSS Diário
Necessário para o celular oferecer "colocar na tela inicial".
Não guarda nada em cache: a página sempre busca o DSS atualizado.
*/

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (evento) => {
    evento.respondWith(fetch(evento.request));
});
