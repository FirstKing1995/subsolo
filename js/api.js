/* Comunicação com o backend (Apps Script). Usa POST text/plain para evitar preflight de CORS.
   Partidas que não conseguem subir na hora ficam numa fila no aparelho e são reenviadas sozinhas. */
(() => {
'use strict';
const KEY = 'subsolo-sessao';
const FILA = 'subsolo-fila';
const ler = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const gravar = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const espera = ms => new Promise(r => setTimeout(r, ms));
const uuid = () => ((self.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    }));

const salvo = ler(KEY) || {};
const Api = {
  url: ((window.SUBSOLO_CONFIG || {}).API_URL || '').trim(),
  token: salvo.token || null,
  user: salvo.user || null,
  uuid: uuid,

  get ativo() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(this.url); },

  /* Uma ação. tentativas = quantas vezes repete quando o erro é de rede. */
  async chamar(action, dados, tentativas) {
    if (!this.ativo) throw new Error('Ranking online desligado: falta a URL da API em js/config.js.');
    const n = tentativas == null ? 2 : tentativas;
    let ultimo;
    for (let i = 0; i <= n; i++) {
      try { return await this._post(action, dados); }
      catch (e) {
        ultimo = e;
        if (!e.rede || i === n) throw e;   // erro de regra do servidor não melhora repetindo
        await espera(900 * Math.pow(2, i));
      }
    }
    throw ultimo;
  },

  async _post(action, dados) {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 25000);   // Apps Script "frio" demora
    try {
      const body = Object.assign({ action: action }, dados || {});
      if (this.token && !body.token) body.token = this.token;
      const r = await fetch(this.url, {
        method: 'POST', redirect: 'follow', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const e = new Error('O servidor respondeu com erro ' + r.status + '.'); e.rede = true; throw e; }
      let j;
      try { j = await r.json(); }
      catch (p) { const e = new Error('Resposta inesperada do servidor.'); e.rede = true; throw e; }
      if (!j.ok) {
        const err = new Error(j.erro || 'O servidor recusou o pedido.');
        err.regra = true;   // resposta legítima do servidor, não é problema de rede
        if (/sess[aã]o expirou|Entre na sua conta|Conta não encontrada/i.test(err.message)) { this._limpar(); err.auth = true; }
        if (/ocupado/i.test(err.message)) { err.rede = true; err.regra = false; }
        throw err;
      }
      return j;
    } catch (e) {
      if (e.regra) throw e;
      if (e.rede) throw e;
      if (e.name === 'AbortError') { const x = new Error('O servidor demorou para responder.'); x.rede = true; throw x; }
      // qualquer outra falha aqui é conexão (fetch recusado, DNS, offline, CORS)
      const x = new Error(navigator.onLine === false ? 'Você está sem internet.' : 'Sem conexão com o servidor.');
      x.rede = true; throw x;
    } finally { clearTimeout(tm); }
  },

  _sessao(j) { this.token = j.token || this.token; this.user = j.user || this.user; gravar(KEY, { token: this.token, user: this.user }); },
  _limpar() { this.token = null; this.user = null; gravar(KEY, null); },

  async registrar(apelido, senha) { const j = await this.chamar('registrar', { apelido: apelido, senha: senha }, 1); this._sessao(j); return j.user; },
  async entrar(apelido, senha) { const j = await this.chamar('entrar', { apelido: apelido, senha: senha }, 1); this._sessao(j); return j.user; },
  async sair() { const t = this.token; this._limpar(); if (t) { try { await this.chamar('sair', { token: t }, 0); } catch (e) {} } },
  async atualizar() { if (!this.token) return null; const j = await this.chamar('eu', {}, 1); this._sessao(j); return j.user; },
  async iniciarPartida() { return (await this.chamar('iniciarPartida', {}, 3)).runId; },
  async ranking(modo, periodo) { return this.chamar('ranking', { modo: modo, periodo: periodo }, 1); },

  /* ---------- fila de partidas ---------- */
  fila() { return ler(FILA) || []; },
  _salvarFila(f) { gravar(FILA, f.length ? f : null); },
  enfileirar(item) { const f = this.fila(); f.push(item); this._salvarFila(f.slice(-20)); },
  removerDaFila(clientId) { this._salvarFila(this.fila().filter(i => i.clientId !== clientId)); },

  /* Monta o pacote de uma partida terminada. */
  pacote(runId, s) {
    return {
      clientId: uuid(), runId: runId || null,
      pontos: s.score, profundidade: s.depth, maiorCascata: s.maxCascade, duracao: s.duration, minerios: s.ores,
      quando: Date.now(),
    };
  },

  /* Envia um pacote. Caiu a conexão, ele fica na fila e sobe depois. */
  async enviar(pac) {
    if (!this.ativo || !this.token) { const e = new Error('Entre na sua conta para registrar a pontuação.'); e.auth = true; throw e; }
    try {
      const j = await this.chamar('enviarPontuacao', pac, 2);
      if (j.user) this._sessao({ user: j.user });
      this.removerDaFila(pac.clientId);
      return j;
    } catch (e) {
      if (e.rede || e.auth) {
        if (!this.fila().some(i => i.clientId === pac.clientId)) this.enfileirar(pac);
        e.pendente = true;
      }
      throw e;
    }
  },

  /* Tenta subir tudo que ficou pendente. Devolve quantas subiram. */
  async processarFila() {
    if (!this.ativo || !this.token || !this.fila().length) return 0;
    let subiram = 0;
    for (const item of this.fila()) {
      try { await this.enviar(item); subiram++; }
      catch (e) {
        if (e.rede || e.auth) break;          // sem rede ou sem sessão: fica para depois
        this.removerDaFila(item.clientId);    // recusa definitiva: não adianta insistir
      }
    }
    return subiram;
  },
};
window.Api = Api;
})();
