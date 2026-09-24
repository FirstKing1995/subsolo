/* Telas, conta e ranking. O jogo em si fica em game.js e conversa com este arquivo pelo objeto Game. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString('pt-BR');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ORES = { carvao: ['Carvão', '#6a6a6a'], ferro: ['Ferro', '#d9a88c'], tnt: ['Dinamite', '#e8322a'], ouro: ['Ouro', '#ffcf3a'],
  topazio: ['Topázio', '#39e6ff'], diamante: ['Diamante', '#eafcff'], reliquia: ['Relíquia', '#efe0bb'] };

let runId = null;          // partida registrada no servidor
let pacoteAtual = null;    // última partida aguardando envio
let authMode = 'login';
let rankFrom = 'ovStart';  // tela para onde o ranking volta
const rank = { modo: 'pontos', periodo: 'geral' };

function show(id) { ['ovStart', 'ovPause', 'ovOver', 'ovRank'].forEach(o => $(o).classList.toggle('show', o === id)); }
function hideAll() { show(null); }

/* ---------- início ---------- */
function bestLine() {
  const u = Api.user;
  if (u && (u.melhor_pontos || u.melhor_profundidade)) return 'Seu recorde: ' + fmt(u.melhor_pontos) + ' pontos e ' + u.melhor_profundidade + ' m';
  const b = Game.localBest();
  return b && b.score ? 'Recorde neste aparelho: ' + fmt(b.score) + ' pontos e ' + b.depth + ' m' : '';
}

function renderAcct() {
  const el = $('acct');
  $('btnRankStart').hidden = !Api.ativo;
  $('bestStart').textContent = bestLine();
  const fila = Api.ativo ? Api.fila().length : 0;
  const aviso = $('filaAviso');
  aviso.hidden = !fila;
  if (fila) aviso.textContent = fila === 1
    ? '1 partida esperando conexão para entrar no ranking. Eu tento de novo sozinho.'
    : fila + ' partidas esperando conexão para entrar no ranking. Eu tento de novo sozinho.';
  if (!Api.ativo) { el.innerHTML = ''; return; }

  if (Api.user) {
    el.innerHTML = '<div class="me"><span>Jogando como <b>' + esc(Api.user.apelido) + '</b></span>' +
      '<button class="link" id="btnLogout">Sair da conta</button>' +
      '<span class="rec">' + fmt(Api.user.partidas) + ' partidas registradas</span></div>';
    $('btnLogout').onclick = async () => { await Api.sair(); renderAcct(); };
    return;
  }

  const reg = authMode === 'register';
  el.innerHTML =
    '<div class="tabs"><button data-t="login" class="' + (reg ? '' : 'on') + '">Entrar</button>' +
    '<button data-t="register" class="' + (reg ? 'on' : '') + '">Criar conta</button></div>' +
    '<form class="auth' + (reg ? ' reg' : '') + '" id="authForm" novalidate>' +
      '<label>Apelido<input name="apelido" maxlength="16" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>' +
      '<label>Senha<input name="senha" type="password" maxlength="72" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" required></label>' +
      '<label class="only-reg">Repita a senha<input name="senha2" type="password" maxlength="72" autocomplete="new-password"></label>' +
      '<p class="err" id="authErr"></p>' +
      '<button class="go small full" type="submit" id="authBtn">' + (reg ? 'Criar conta' : 'Entrar') + '</button>' +
    '</form>' +
    '<p class="note">Sem conta você joga normalmente, só não entra no ranking.</p>';

  el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { authMode = b.dataset.t; renderAcct(); });
  $('authForm').onsubmit = onAuth;
}

async function onAuth(e) {
  e.preventDefault();
  const f = e.target, err = $('authErr'), btn = $('authBtn');
  const apelido = f.elements.apelido.value.trim(), senha = f.elements.senha.value;
  err.textContent = '';
  if (!/^[A-Za-z0-9_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]{3,16}$/.test(apelido)) { err.textContent = 'O apelido precisa ter de 3 a 16 caracteres, só letras, números ou _.'; return; }
  if (senha.length < 6) { err.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  if (authMode === 'register' && senha !== f.elements.senha2.value) { err.textContent = 'As duas senhas não são iguais.'; return; }
  btn.disabled = true; btn.textContent = authMode === 'register' ? 'Criando conta…' : 'Entrando…';
  try {
    if (authMode === 'register') await Api.registrar(apelido, senha);
    else await Api.entrar(apelido, senha);
    renderAcct();
  } catch (ex) {
    err.textContent = ex.message;
    btn.disabled = false; btn.textContent = authMode === 'register' ? 'Criar conta' : 'Entrar';
  }
}

/* ---------- partida ---------- */
function startGame() {
  try { localStorage.setItem('subsolo-viu-tutorial', '1'); } catch (e) {}
  hideAll();
  runId = null;
  Game.start();
  if (Api.ativo && Api.user) {
    Api.iniciarPartida().then(id => { runId = id; }).catch(() => { runId = null; });
    Api.processarFila().then(n => { if (n) renderAcct(); }).catch(() => {});
  }
}

Game.onPause = paused => { if (paused) show('ovPause'); else hideAll(); };

Game.onOver = async stats => {
  $('overWhy').textContent = stats.reason;
  $('oScore').textContent = fmt(stats.score);
  $('oDepth').textContent = stats.depth + ' m';
  $('oLevel').textContent = stats.level;
  $('oCasc').textContent = 'x' + stats.maxCascade;
  const ores = Object.keys(ORES).filter(k => stats.ores[k])
    .map(k => '<i style="--c:' + ORES[k][1] + '">' + ORES[k][0] + ' ' + stats.ores[k] + '</i>').join('');
  $('oOres').innerHTML = ores || 'Nenhum minério desta vez. Os bons ficam mais fundo.';
  $('newRec').hidden = !stats.localRecord;
  $('btnRankOver').hidden = !Api.ativo;

  const msg = $('submitMsg');
  msg.className = 'submit';
  show('ovOver');

  if (!Api.ativo) { msg.textContent = ''; return; }
  if (!Api.user) { msg.textContent = 'Crie uma conta na tela inicial para essa pontuação contar no ranking.'; return; }

  pacoteAtual = Api.pacote(runId, stats);
  runId = null;
  enviarPacote();
};

async function enviarPacote() {
  const msg = $('submitMsg');
  if (!pacoteAtual) return;
  msg.className = 'submit';
  msg.textContent = 'Enviando pontuação…';
  try {
    const r = await Api.enviar(pacoteAtual);
    pacoteAtual = null;
    msg.textContent = (r.recorde ? 'Novo recorde da conta! ' : 'Pontuação registrada. ') +
      (r.posicao ? 'Você está em ' + r.posicao + 'º no ranking geral.' : '') +
      (r.validacao === 'estimada' ? ' (enviada depois, com o tempo estimado)' : '');
    if (r.recorde) $('newRec').hidden = false;
  } catch (ex) {
    msg.className = 'submit bad';
    if (ex.pendente) {
      msg.innerHTML = esc(ex.message) + ' A partida ficou salva e sobe sozinha quando a conexão voltar. ' +
        '<button class="link" id="btnRetry">Tentar agora</button>';
      const b = $('btnRetry'); if (b) b.onclick = enviarPacote;
    } else {
      msg.textContent = ex.message;
      pacoteAtual = null;
    }
  }
  renderAcct();
}

/* ---------- ranking ---------- */
async function openRank(from) {
  rankFrom = from;
  show('ovRank');
  loadRank();
}
async function loadRank() {
  const list = $('rankList'), me = $('rankMe');
  document.querySelectorAll('#segModo button').forEach(b => b.classList.toggle('on', b.dataset.v === rank.modo));
  document.querySelectorAll('#segPer button').forEach(b => b.classList.toggle('on', b.dataset.v === rank.periodo));
  list.innerHTML = '<li><span class="msg">Carregando o ranking…</span></li>';
  me.textContent = '';
  const pedido = rank.modo + rank.periodo;
  try {
    const r = await Api.ranking(rank.modo, rank.periodo);
    if (pedido !== rank.modo + rank.periodo) return; // o jogador trocou de aba no meio
    if (!r.lista.length) {
      list.innerHTML = '<li><span class="msg">' + (rank.periodo === 'semana' ? 'Ninguém jogou nos últimos 7 dias. A vaga de 1º é sua.' : 'O ranking está vazio. Jogue uma partida logado para abrir a lista.') + '</span></li>';
    } else {
      list.innerHTML = r.lista.map(e => {
        const main = rank.modo === 'pontos' ? fmt(e.pontos) + ' pts' : e.profundidade + ' m';
        const sub = rank.modo === 'pontos' ? e.profundidade + ' m' : fmt(e.pontos) + ' pts';
        return '<li class="' + (e.voce ? 'you' : '') + '"><span class="pos">' + e.posicao + 'º</span>' +
          '<span class="nm">' + esc(e.apelido) + '</span><span class="vl">' + main + '<small>' + sub + '</small></span></li>';
      }).join('');
    }
    if (Api.user) me.textContent = r.eu ? 'Sua posição: ' + r.eu.posicao + 'º de ' + fmt(r.total) : 'Você ainda não aparece nesta lista.';
    else me.textContent = 'Entre na sua conta para aparecer aqui.';
  } catch (ex) {
    list.innerHTML = '<li><span class="msg">' + esc(ex.message) + '</span></li>';
  }
}
document.querySelectorAll('#segModo button').forEach(b => b.onclick = () => { rank.modo = b.dataset.v; loadRank(); });
document.querySelectorAll('#segPer button').forEach(b => b.onclick = () => { rank.periodo = b.dataset.v; loadRank(); });

/* ---------- botões ---------- */
$('btnStart').onclick = startGame;
$('btnAgain').onclick = startGame;
$('btnResume').onclick = () => Game.togglePause();
$('btnQuit').onclick = () => { Game.quit(); runId = null; renderAcct(); show('ovStart'); };
$('btnMenu').onclick = () => { Game.quit(); renderAcct(); show('ovStart'); };
$('btnRankStart').onclick = () => openRank('ovStart');
$('btnRankOver').onclick = () => openRank('ovOver');
$('btnRankClose').onclick = () => { if (rankFrom === 'ovStart') renderAcct(); show(rankFrom); };

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || (e.target && e.target.tagName === 'INPUT')) return;
  if ($('ovStart').classList.contains('show') || $('ovOver').classList.contains('show')) { e.preventDefault(); startGame(); }
});

/* ---------- boot ---------- */
let viu = false;
try { viu = localStorage.getItem('subsolo-viu-tutorial') === '1'; } catch (e) {}
$('howTo').open = !viu;
renderAcct();
if (Api.ativo && Api.token) {
  Api.atualizar().then(renderAcct).catch(renderAcct);
  Api.processarFila().then(n => { if (n) renderAcct(); }).catch(() => {});
}
window.addEventListener('online', () => Api.processarFila().then(n => { if (n) renderAcct(); }).catch(() => {}));

/* ---------- instalar no celular ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
let promptInstalar = null;
const instalado = () => window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  promptInstalar = e;
  $('btnInstall').hidden = instalado();
});
window.addEventListener('appinstalled', () => { promptInstalar = null; $('btnInstall').hidden = true; $('instalarDica').hidden = true; });
$('btnInstall').onclick = async () => {
  if (!promptInstalar) return;
  $('btnInstall').hidden = true;
  promptInstalar.prompt();
  try { await promptInstalar.userChoice; } catch (e) {}
  promptInstalar = null;
};
// iPhone não tem o prompt automático: mostra o caminho manual
(() => {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !instalado()) {
    const dica = $('instalarDica');
    dica.hidden = false;
    dica.textContent = 'No iPhone dá para instalar: toque em Compartilhar e depois em Adicionar à Tela de Início.';
  }
})();
})();
