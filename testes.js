/* =====================================================================
   RITMO — suíte de testes
   Rodar:  node testes.js
   Não precisa de rede nem de pacotes. Carrega o index.html, extrai o
   JavaScript e executa contra um DOM e um IndexedDB simulados.
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const ARQ = path.join(RAIZ, "index.html");

let passou = 0, falhou = 0;
const falhas = [];

function ok(nome, condicao, detalhe) {
  if (condicao) { passou++; }
  else { falhou++; falhas.push(nome + (detalhe ? " — " + detalhe : "")); }
}
function igual(nome, a, b) {
  ok(nome, JSON.stringify(a) === JSON.stringify(b),
     "esperado " + JSON.stringify(b) + ", veio " + JSON.stringify(a));
}
function grupo(t) { console.log("\n" + t); }

/* ---------------------------------------------------------------- IndexedDB falso */
function montarIDB() {
  function Req(){ this.onsuccess=null; this.onerror=null; this.result=undefined; }
  function disp(r,res){ setTimeout(()=>{ r.result=res; r.onsuccess && r.onsuccess({target:r}); },0); }
  function Store(n,k){ this.name=n; this.keyPath=k; this.dados=new Map(); }
  function TxStore(s,tx){ this.s=s; this.tx=tx; }
  TxStore.prototype.put=function(o){ const r=new Req(); this.s.dados.set(String(o[this.s.keyPath]),
    JSON.parse(JSON.stringify(o))); disp(r,o[this.s.keyPath]); return r; };
  TxStore.prototype.get=function(k){ const r=new Req(); disp(r,this.s.dados.get(String(k))); return r; };
  TxStore.prototype.getAll=function(){ const r=new Req(),o=[];
    this.s.dados.forEach(v=>o.push(JSON.parse(JSON.stringify(v)))); disp(r,o); return r; };
  TxStore.prototype.delete=function(k){ const r=new Req(); this.s.dados.delete(String(k)); disp(r); return r; };
  TxStore.prototype.clear=function(){ const r=new Req(); this.s.dados.clear(); disp(r); return r; };
  TxStore.prototype.count=function(){ const r=new Req(); disp(r,this.s.dados.size); return r; };
  function Tx(bd){ this.bd=bd; this.oncomplete=null; this.onerror=null;
    setTimeout(()=>{ this.oncomplete && this.oncomplete({target:this}); },0); }
  Tx.prototype.objectStore=function(n){ return new TxStore(this.bd._s[n], this); };
  function BD(n,v){ this._s={}; this.version=v; this.name=n;
    this.objectStoreNames={ contains:(x)=>!!this._s[x] }; }
  BD.prototype.createObjectStore=function(n,o){ return this._s[n]=new Store(n,(o||{}).keyPath); };
  BD.prototype.transaction=function(){ return new Tx(this); };
  BD.prototype.close=function(){};
  const bancos={};
  return {
    open(nome, versao) {
      const req = new Req(); req.onupgradeneeded=null; req.onblocked=null;
      setTimeout(()=>{
        let bd = bancos[nome], antiga = bd ? bd.version : 0;
        if (!bd) { bd = new BD(nome, versao); bancos[nome] = bd; }
        if (versao > antiga) {
          bd.version = versao; req.result = bd;
          req.onupgradeneeded && req.onupgradeneeded({ target:req, oldVersion:antiga });
        }
        req.result = bd; req.onsuccess && req.onsuccess({ target:req });
      },0);
      return req;
    }
  };
}

/* ---------------------------------------------------------------- ambiente */
const html = fs.readFileSync(ARQ, "utf8");
const js  = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const css = html.slice(html.indexOf("<style>") + 7, html.indexOf("</style>"));

global.indexedDB = montarIDB();
global.window = {
  storage: null,
  matchMedia: () => ({ matches:false }),
  addEventListener(){}, navigator:{}
};
global.document = {
  body:{ setAttribute(){} }, documentElement:{ setAttribute(){} },
  getElementById: () => ({ innerHTML:"", style:{}, textContent:"" }),
  querySelector: () => null, addEventListener(){}, activeElement:null,
  createElement: () => ({ style:{}, click(){}, remove(){} }), hidden:false
};
global.navigator = {};
global.setInterval = () => {}; global.clearInterval = () => {};
const stReal = setTimeout;
global.setTimeout = (f,t) => stReal(f,t);

eval(js);

/* ---------------------------------------------------------------- cenário fixo */
const BASE = new Date(2026, 7, 3, 15, 10, 0, 0);   /* segunda, 15:10 */
function k(off){ const d=new Date(BASE); d.setDate(d.getDate()-off);
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function ts(off,hh,mm){ const d=new Date(BASE); d.setDate(d.getDate()-off);
  d.setHours(hh,mm,0,0); return d.getTime(); }

function cenario(){
  UI.agora = new Date(BASE);
  S = padrao(); N = []; C = {};
  UI.plano=null; UI.planoSem=null; UI.diaTodo=false; UI.foco="tudo"; UI.per=30;
  for (let i=1;i<=60;i++){
    const f={ d1:ts(i,7,40), d2:ts(i,8,5) };
    if (i%8!==0) f.d3=ts(i,9,15);
    if (i%4!==0) f.d6=ts(i,12,40);
    if (i%6===0) f.d8=ts(i,15,10);
    f.d12=ts(i,19,10);
    if (i%3!==0) f.d14=ts(i,23,25);
    S.dias[k(i)] = { feitos:f, sobrevivencia:i%13===0,
      minutos:{ "Cálculo":75, "Algoritmos":50 },
      treino:(i%8!==0)?"Push A":null, prot:i%3===0?90:160, agua:i%2===0?8:4,
      refs:{ "Café":1, "Almoço":1 }, med:true, ajuste:null };
  }
  S.dias[k(0)] = { feitos:{ d1:ts(0,7,40), d2:ts(0,8,10), d3:ts(0,9,20) },
    sobrevivencia:false, minutos:{ "Cálculo":50 }, treino:"Push A",
    prot:95, agua:4, refs:{ "Café":1 }, med:true, ajuste:null };
  S.provas.push({ id:"p1", materia:"Cálculo", data:k(-5) });
  S.cargas["Supino reto barra"] = [
    { ts:BASE.getTime(), kg:82, reps:6 },
    { ts:BASE.getTime()-15*864e5, kg:75, reps:6 }];
  S.metas2 = [
    { id:"a", titulo:"Estudar 800 horas", escopo:"ano", fonte:"estudo_h", alvo:800, passo:1, valor:0, hist:{} },
    { id:"c", titulo:"Ler 20 livros", escopo:"ano", fonte:"manual", alvo:20, passo:1, valor:11, hist:{} }];
  N = [{ id:"n1", txt:"[ ] revisar\n[x] lista", tag:"Cálculo", ts:BASE.getTime(),
         fix:true, duvida:false, resolvida:false },
       { id:"n2", txt:"não entendi", tag:"Cálculo", ts:BASE.getTime(),
         fix:false, duvida:true, resolvida:false }];
  C = {};
}

/* ================================================================ 1. INTEGRIDADE */
grupo("1. Integridade estrutural");
{
  const emit = new Set([...html.matchAll(/data-a="([a-z-]+)(?::|")/g)].map(m=>m[1]));
  const trat = new Set([...js.matchAll(/cmd==="([a-z-]+)"/g)].map(m=>m[1]));
  const orfas = [...emit].filter(x=>!trat.has(x));
  ok("toda ação emitida tem handler", orfas.length===0, orfas.join(", "));

  ok("CSS balanceado", (css.match(/{/g)||[]).length === (css.match(/}/g)||[]).length);

  const usadas = new Set([...css.matchAll(/var\(--([a-z0-9-]+)/g)].map(m=>m[1]));
  const decl = new Set([...css.matchAll(/--([a-z0-9-]+):/g)].map(m=>m[1]));
  const faltando = [...usadas].filter(v=>!decl.has(v) && v!=="c");
  ok("nenhuma variável CSS indefinida", faltando.length===0, faltando.join(", "));
  ok("nenhuma variável CSS circular", !/--(\w+):var\(--\1\)/.test(css));

  const abas = (js.match(/var abas=\[(.*?)\];/s)[1].match(/\["/g)||[]).length;
  igual("continua com 6 abas", abas, 6);

  ok("sem chamadas de rede no app", !/\bfetch\s*\(|XMLHttpRequest/.test(js));
  ok("apenas as duas chaves de storage conhecidas",
     !/storage\.(set|get)\("(?!ritmo:v1|ritmo:notas:v1)/.test(js));
}

/* ================================================================ 2. BUGS DA 1.1 */
grupo("2. Bugs corrigidos na 1.1");
{
  cenario();
  S.materias = ['Cálculo "Aplicado"', "Física & Cia", "Algoritmos <II>"];
  C = {};
  const h = viewEstudo(dia());
  ok("aspas em nome de matéria não quebram o atributo",
     !/data-a="mat:[^"]*"[^>]*\bAplicado/.test(h) && h.includes("&quot;"));

  const ids = new Set();
  for (let i=0;i<200;i++) ids.add(uid());
  igual("200 IDs seguidos são todos únicos", ids.size, 200);

  ok("fallback de exportação existe", typeof abrirEmAba === "function");
  ok("nome do usuário é configurável", "nome" in padrao());
  ok("nenhum dado pessoal fixo no código",
     !/Venvanse|UNIVAP/.test(js) && !/>\s*Gustavo/.test(js));
}

/* ================================================================ 3. DOMÍNIO */
grupo("3. Funções de domínio");
{
  cenario();
  igual("serieDias devolve o número certo de dias", serieDias(30).length, 30);
  ok("sequencias não quebra", typeof sequencias().atual === "number");
  ok("porMateria soma minutos", porMateria(30)["Cálculo"] > 0);
  ok("volumeTreino calcula", volumeTreino(30).vol > 0);
  ok("recorde encontra o maior volume", recorde("Supino reto barra").kg === 82);

  C = {};
  const m = motorRegras();
  ok("motor devolve regras ordenadas", m.length > 0 && m[0].pri >= m[m.length-1].pri);
  ok("toda regra tem voz atribuída", m.every(r=>r.tipo && VOZES[r.tipo]));
  ok("toda regra tem texto", m.every(r=>r.txt && r.tit));

  C = {};
  const pl = planoDoDia();
  const aula = montarDia(UI.agora).filter(b=>b.k==="aula");
  const invade = pl.mudancas.some(mu =>
    aula.some(f => mu.para < f.t+f.dur && mu.para+mu.dur > f.t));
  ok("replanejamento nunca invade a aula", !invade);
  ok("replanejamento cabe no dia", pl.mudancas.every(mu => mu.para+mu.dur <= 1440));

  C = {};
  const ps = planoSemanal(7);
  ok("plano semanal aloca blocos", ps.itens.length > 0);
  ok("plano justifica cada bloco", ps.itens.every(x=>x.motivo && x.materia));

  C = {};
  const rel = relatorioSemana();
  ok("relatório traz no máximo 3 ajustes", rel.ajustes.length <= 3);
  const cats = rel.ajustes.map(a=>a.cat);
  ok("ajustes não repetem categoria", new Set(cats).size === cats.length);

  C = {};
  const P = progressoMeta(S.metas2[0]);
  ok("progresso de meta é coerente", P.pct >= 0 && P.acum >= 0 && P.per.total > 300);
}

/* ================================================================ 4. VIEWS */
grupo("4. Telas renderizam limpas");
{
  const sujo = t => /undefined|NaN|Infinity|\[object Object\]/.test(t);
  cenario();
  const d = dia(), bl = montarDia(UI.agora), vis = visiveis(d, bl);

  const telas = {
    hoje: () => viewHoje(d, vis, 910),
    treino: () => viewTreino(d),
    estudo: () => viewEstudo(d),
    notas: () => viewNotas(),
    mes: () => { UI.diaSel=k(0); UI.mesRef=new Date(2026,7,1); return viewMes(); }
  };
  Object.keys(telas).forEach(nome => {
    C = {};
    const t = telas[nome]();
    ok("view " + nome + " gera HTML", t.length > 300);
    ok("view " + nome + " sem valor inválido", !sujo(t));
  });

  ["tudo","metas","rotina","estudo","treino","comida"].forEach(foco => {
    [7,30,90].forEach(per => {
      C = {}; UI.foco = foco; UI.per = per;
      const t = viewDados();
      ok(`dados ${foco}/${per}d`, t.length > 100 && !sujo(t));
    });
  });

  [null,"rotina","materias","remedio","alertas","metas","aparencia","aplicativo","exportar","backup"]
    .forEach(sec => {
      C = {}; UI.sec = sec;
      const t = viewAjustes();
      ok("ajustes " + (sec||"menu"), t.length > 200 && !sujo(t));
    });
  UI.sec = null;
}

/* ================================================================ 5. APP VAZIO */
grupo("5. Aplicativo recém-instalado");
{
  UI.agora = new Date(BASE); S = padrao(); N = []; C = {};
  const sujo = t => /undefined|NaN|Infinity/.test(t);
  const d = dia(), vis = visiveis(d, montarDia(UI.agora));
  ok("hoje renderiza sem dados", viewHoje(d, vis, 910).length > 300);
  C = {};
  ok("dados renderiza sem dados", !sujo(viewDados()));
  C = {};
  const fr = ["rotina","estudo","treino","comida"].reduce((a,x)=>{ C={}; return a+leitura(x,30).length; },0);
  igual("não afirma nada sem amostra", fr, 0);
  C = {};
  ok("padrões silenciam sem histórico", padroes().length === 0);
}

/* ================================================================ 6. EXPORTAÇÃO */
grupo("6. Exportação");
{
  cenario();
  const pdf = montarRelatorio(30);
  ok("PDF começa com assinatura", pdf.startsWith("%PDF"));
  ok("PDF termina com EOF", pdf.trim().endsWith("%%EOF"));
  const offs = [...pdf.matchAll(/(\d{10}) 00000 n/g)].map(m=>parseInt(m[1],10));
  ok("offsets do xref apontam para objetos",
     offs.length > 0 && offs.every(o => /^\d+ 0 obj/.test(pdf.slice(o, o+20))));
  ok("sem emoji no PDF", !/[\u{1F300}-\u{1FAFF}]/u.test(pdf));

  C = {};
  const xls = montarPlanilha(30);
  ok("planilha é XML", xls.startsWith("<?xml"));
  igual("planilha tem 7 abas", (xls.match(/<Worksheet /g)||[]).length, 7);

  cenario();
  S.metas2.push({ id:"z", titulo:'Meta "A & B" <teste>', escopo:"ano",
                  fonte:"manual", alvo:10, passo:1, valor:2, hist:{} });
  S.eventos.push({ id:"ev1", data:k(0), hora:600, titulo:"Consulta <Dr. A & B>" });
  C = {};
  const x2 = montarPlanilha(30);
  ok("planilha escapa & e <", x2.includes("&amp;") && x2.includes("&lt;"));
  ok("planilha não tem XML quebrado", !/<Data ss:Type="String">[^<]*<(?!\/Data)/.test(x2));
}

/* ================================================================ 7. PERSISTÊNCIA */
grupo("7. Persistência");
(async function () {
  try {
    cenario();
    const estado = JSON.parse(JSON.stringify(S));
    const notas = JSON.parse(JSON.stringify(N));

    await Persistencia.iniciar();
    ok("camada ativa é IndexedDB", Persistencia.modo() === "indexeddb");

    await Persistencia.salvarEstado(estado, true);
    await Persistencia.salvarNotas(notas, true);

    const escritas = await Persistencia.salvarEstado(estado);
    igual("nada é reescrito quando nada muda", escritas, 0);

    estado.dias[k(0)].agua = 7;
    const uma = await Persistencia.salvarEstado(estado);
    ok("mudar a água grava só o necessário", uma <= 2, "gravou " + uma);

    const lido = await Persistencia.carregar(padrao());
    igual("dias preservados", Object.keys(lido.S.dias).length, Object.keys(estado.dias).length);
    igual("água persistida", lido.S.dias[k(0)].agua, 7);
    igual("notas preservadas", lido.N.length, notas.length);
    igual("metas preservadas", lido.S.metas2.length, estado.metas2.length);
    igual("matérias preservadas", lido.S.materias.length, estado.materias.length);

    await DB.salvar("tarefas", { data:"CORROMPIDO" });
    await DB.salvar("alimentacao", { data:"2026-01-01", prot:"xyz", refs:null });
    const lido2 = await Persistencia.carregar(padrao());
    ok("registro corrompido não derruba a leitura",
       Object.keys(lido2.S.dias).length >= Object.keys(estado.dias).length);

    const diag = await Persistencia.diagnostico();
    ok("todas as 11 stores existem", Object.keys(diag.stores).length === 11);
    ok("moldes de rotina persistidos", diag.stores.rotina === 3, "rotina=" + diag.stores.rotina);
  } catch (e) {
    ok("persistência sem exceção", false, e.message);
  }

  /* -------------------------------------------------------------- resultado */
  console.log("\n" + "─".repeat(52));
  if (falhou === 0) {
    console.log(`✓ ${passou} testes passaram`);
    process.exit(0);
  } else {
    console.log(`${passou} passaram, ${falhou} FALHARAM:\n`);
    falhas.forEach(f => console.log("  ✗ " + f));
    process.exit(1);
  }
})();
