/* Comunicação com o backend (Apps Script). Usa POST text/plain para evitar preflight de CORS. */
(() => {
'use strict';
const KEY = 'subsolo-sessao';
const ler = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const gravar = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} };

const salvo = ler();
const Api = {
  url: ((window.SUBSOLO_CONFIG || {}).API_URL || '').trim(),
  token: salvo.token || null,
  user: salvo.user || null,

  get ativo() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(this.url); },

  async chamar(action, dados) {
    if (!this.ativo) throw new Error('Ranking online desligado: falta a URL da API em js/config.js.');
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 20000);
    try {
      const body = Object.assign({ action }, dados || {});
      if (this.token && !body.token) body.token = this.token;
      const r = await fetch(this.url, {
        method: 'POST', redirect: 'follow', signal: ctrl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        const err = new Error(j.erro || 'O servidor recusou o pedido.');
        if (/sess[aã]o expirou|Entre na sua conta|Conta não encontrada/i.test(err.message)) this._limpar();
        throw err;
      }
      return j;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('O servidor demorou para responder. Tente de novo.');
      if (e instanceof TypeError) throw new Error('Sem conexão com o servidor do ranking.');
      throw e;
    } finally { clearTimeout(tm); }
  },

  _sessao(j) { this.token = j.token || this.token; this.user = j.user || this.user; gravar({ token: this.token, user: this.user }); },
  _limpar() { this.token = null; this.user = null; gravar(null); },

  async registrar(apelido, senha) { const j = await this.chamar('registrar', { apelido, senha }); this._sessao(j); return j.user; },
  async entrar(apelido, senha) { const j = await this.chamar('entrar', { apelido, senha }); this._sessao(j); return j.user; },
  async sair() { const t = this.token; this._limpar(); if (t) { try { await this.chamar('sair', { token: t }); } catch (e) {} } },
  async atualizar() { if (!this.token) return null; const j = await this.chamar('eu'); this._sessao(j); return j.user; },
  async iniciarPartida() { return (await this.chamar('iniciarPartida')).runId; },
  async enviar(runId, s) {
    const j = await this.chamar('enviarPontuacao', {
      runId, pontos: s.score, profundidade: s.depth, maiorCascata: s.maxCascade, duracao: s.duration, minerios: s.ores,
    });
    if (j.user) this._sessao({ user: j.user });
    return j;
  },
  async ranking(modo, periodo) { return this.chamar('ranking', { modo, periodo }); },
};
window.Api = Api;
})();
