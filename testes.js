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


/* ---------------------------------------------------------------- DOM falso
   Só o suficiente para exercitar o diff: nós, atributos, texto e filhos.
   Sem isto o VDOM ficaria sem teste, que é justamente a peça mais nova. */
function montarDOM(){
  function Texto(v){ this.nodeType=3; this.nodeValue=v; this.parentNode=null; }
  Texto.prototype.cloneNode=function(){ return new Texto(this.nodeValue); };

  function El(tag){
    this.nodeType=1; this.nodeName=tag.toUpperCase(); this.childNodes=[];
    this._attrs=new Map(); this.parentNode=null; this.value="";
  }
  Object.defineProperty(El.prototype,"attributes",{ get(){
    const out=[]; this._attrs.forEach((v,k)=>out.push({name:k,value:v}));
    out.length=out.length; return out;
  }});
  El.prototype.getAttribute=function(n){ return this._attrs.has(n)?this._attrs.get(n):null; };
  El.prototype.setAttribute=function(n,v){ this._attrs.set(n,String(v));
    if(n==="value") this.value=String(v); };
  El.prototype.removeAttribute=function(n){ this._attrs.delete(n); };
  El.prototype.hasAttribute=function(n){ return this._attrs.has(n); };
  El.prototype.appendChild=function(no){
    no.parentNode=this; no.isConnected=true; this.childNodes.push(no); return no; };
  El.prototype.removeChild=function(no){
    const i=this.childNodes.indexOf(no);
    if(i>=0){ this.childNodes.splice(i,1); no.parentNode=null; no.isConnected=false; }
    return no;
  };
  El.prototype.replaceChild=function(novo,velho){
    const i=this.childNodes.indexOf(velho);
    if(i>=0){ novo.parentNode=this; this.childNodes[i]=novo; }
    return velho;
  };
  Object.defineProperty(El.prototype,"lastChild",{ get(){
    return this.childNodes[this.childNodes.length-1]||null; }});
  El.prototype.cloneNode=function(){
    const c=new El(this.nodeName);
    this._attrs.forEach((v,k)=>c._attrs.set(k,v));
    c.value=this.value;
    for(const f of this.childNodes) c.appendChild(f.cloneNode(true));
    return c;
  };
  /* Parser mínimo: tags simples, atributos com aspas duplas e texto. */
  Object.defineProperty(El.prototype,"innerHTML",{
    get(){ return serializar(this); },
    set(html){ this.childNodes.length=0; analisar(html,this); }
  });
  El.prototype.textoTotal=function(){
    let t="";
    for(const f of this.childNodes) t += f.nodeType===3 ? f.nodeValue : f.textoTotal();
    return t;
  };
  function serializar(el){
    let out="";
    for(const f of el.childNodes){
      if(f.nodeType===3){ out+=f.nodeValue; continue; }
      let at="";
      f._attrs.forEach((v,k)=>{ at+=" "+k+'="'+v+'"'; });
      out+="<"+f.nodeName.toLowerCase()+at+">"+serializar(f)+"</"+f.nodeName.toLowerCase()+">";
    }
    return out;
  }
  function analisar(html,pai){
    const re=/<(\/?)([a-z0-9]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/gi;
    let pos=0, atual=pai, m;
    const pilha=[];
    while((m=re.exec(html))){
      const texto=html.slice(pos,m.index);
      if(texto) atual.appendChild(new Texto(texto));
      pos=re.lastIndex;
      if(m[1]){ atual=pilha.pop()||pai; continue; }
      const el=new El(m[2]);
      const ra=/([\w:-]+)="([^"]*)"/g; let a;
      while((a=ra.exec(m[3]||""))) el.setAttribute(a[1],a[2]);
      atual.appendChild(el);
      if(!m[4] && !/^(br|img|input|hr|meta|link)$/i.test(m[2])){ pilha.push(atual); atual=el; }
    }
    const resto=html.slice(pos);
    if(resto) atual.appendChild(new Texto(resto));
  }
  return { criar:(t)=>new El(t), El, Texto };
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
  /* Os testes montam o estado na mão, sem passar pelo Store. Invalidar a
     memoização aqui reproduz o que salvar() faz no app de verdade. */
  if (typeof Memo !== "undefined") Memo.invalidar();
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

  /* Regressão conhecida: um modificador com o mesmo nome de outra regra
     herda os estilos dela. Já aconteceu três vezes (.pt.ev, .meta-nota.alerta,
     .mes-dia.prova). Este teste impede a quarta. */
  const modificadores = new Set([...css.matchAll(/\.([a-z][\w-]*)\.([a-z][\w-]*)\{/g)].map(m=>m[2]));
  const regrasProprias = new Set([...css.matchAll(/\n\.([a-z][\w-]*)\{/g)].map(m=>m[1]));
  const colisoes = [...modificadores].filter(m => regrasProprias.has(m));
  ok("nenhum modificador CSS colide com regra própria", colisoes.length===0, colisoes.join(", "));
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


/* ================================================================ 8. RITMO 1.2 */
grupo("8. Metas: escopo diário e semanal");
{
  cenario();
  const dia_ = periodoMeta("dia");
  igual("período diário tem 1 dia", dia_.total, 1);
  const sem = periodoMeta("semana");
  igual("período semanal tem 7 dias", sem.total, 7);
  ok("semana começa na segunda", sem.ini.getDay() === 1);
  const mes = periodoMeta("mes");
  ok("período mensal entre 28 e 31 dias", mes.total >= 28 && mes.total <= 31);
  const ano = periodoMeta("ano");
  ok("período anual tem 365 ou 366", ano.total === 365 || ano.total === 366);

  cenario();
  S.metas2 = [
    { id:"d1", titulo:"Estudar 2h hoje", escopo:"dia", fonte:"estudo_h", alvo:2,
      passo:1, valor:0, hist:{}, categoria:"estudos", prioridade:"alta", prazo:"", obs:"teste" },
    { id:"s1", titulo:"Treinar 4x", escopo:"semana", fonte:"treinos", alvo:4,
      passo:1, valor:0, hist:{}, categoria:"exercicio", prioridade:"normal", prazo:"", obs:"" }];
  C = {};
  const Pd = progressoMeta(S.metas2[0]);
  ok("meta diária calcula progresso", Pd.acum >= 0 && Pd.per.total === 1);
  const Ps = progressoMeta(S.metas2[1]);
  ok("meta semanal calcula progresso", Ps.per.total === 7);

  ok("todas as categorias têm rótulo e cor",
     Object.keys(CAT_META).every(c => CAT_META[c].lab && CAT_META[c].cor));
  igual("existem 4 escopos", ESCOPOS.length, 4);

  const comPrazo = { id:"x", titulo:"x", escopo:"mes", fonte:"manual", alvo:10,
    valor:0, hist:{}, prazo:k(-5) };
  ok("prazo próprio é lido", diasParaPrazo(comPrazo) === 5);
  ok("meta sem prazo devolve null", diasParaPrazo({ id:"y" }) === null);

  C = {};
  UI.foco = "metas";
  const hm = viewDados();
  ok("tela de metas mostra categoria", hm.includes("Estudos") || hm.includes("selo cat"));
  ok("tela de metas mostra observação", hm.includes("teste"));
}

grupo("9. Pomodoro");
{
  cenario();
  const c = cfgPomo();
  ok("configuração tem as três fases", c.foco > 0 && c.curto > 0 && c.longo > 0);
  igual("foco em segundos", segundosDaFase("foco"), c.foco * 60);
  igual("pausa curta em segundos", segundosDaFase("curto"), c.curto * 60);
  igual("pausa longa em segundos", segundosDaFase("longo"), c.longo * 60);

  igual("sem ciclos no início", ciclosHoje(), 0);
  S.pomo.ciclos = [];
  for (let i = 0; i < 3; i++)
    S.pomo.ciclos.push({ data: k(0), ts: Date.now(), fase:"foco", min:25, materia:"Cálculo" });
  igual("conta os ciclos de hoje", ciclosHoje(), 3);

  UI.fase = "foco";
  igual("após 4º ciclo vem a pausa longa", (function(){
    S.pomo.ciclos.push({ data:k(0), ts:Date.now(), fase:"foco", min:25 });
    return proximaFase();
  })(), "longo");

  S.pomo.ciclos = [{ data:k(0), ts:Date.now(), fase:"foco", min:25 }];
  UI.fase = "foco";
  igual("antes disso vem a pausa curta", proximaFase(), "curto");
  UI.fase = "curto";
  igual("depois da pausa volta o foco", proximaFase(), "foco");

  S.pomo.ciclos = [];
  for (let i = 0; i < 6; i++)
    S.pomo.ciclos.push({ data:k(i), ts:Date.now(), fase:"foco", min:25, materia:"Cálculo" });
  C = {};
  const he = viewEstudo(dia());
  ok("estudo mostra histórico do pomodoro", he.includes("Pomodoro"));
  ok("histórico sem valor inválido", !/undefined|NaN/.test(he));
}

grupo("10. Calendário: recorrência e semana");
{
  cenario();
  const base = new Date(2026, 7, 3);          /* segunda */
  const evSemanal = { id:"e1", data:"2026-08-03", hora:600, titulo:"Reunião", rec:"s" };
  ok("evento semanal cai no mesmo dia",
     eventoNoDia(evSemanal, "2026-08-03", base));
  ok("evento semanal cai 7 dias depois",
     eventoNoDia(evSemanal, "2026-08-10", new Date(2026,7,10)));
  ok("evento semanal não cai 3 dias depois",
     !eventoNoDia(evSemanal, "2026-08-06", new Date(2026,7,6)));
  ok("recorrência não vale para o passado",
     !eventoNoDia(evSemanal, "2026-07-27", new Date(2026,6,27)));

  const evUtil = { id:"e2", data:"2026-08-03", hora:null, titulo:"Aula", rec:"u" };
  ok("dias úteis inclui sexta", eventoNoDia(evUtil, "2026-08-07", new Date(2026,7,7)));
  ok("dias úteis exclui sábado", !eventoNoDia(evUtil, "2026-08-08", new Date(2026,7,8)));

  const evMensal = { id:"e3", data:"2026-08-03", titulo:"Boleto", rec:"m" };
  ok("mensal cai no mesmo dia do mês", eventoNoDia(evMensal, "2026-09-03", new Date(2026,8,3)));
  ok("mensal não cai em outro dia", !eventoNoDia(evMensal, "2026-09-04", new Date(2026,8,4)));

  const semRec = { id:"e4", data:"2026-08-03", titulo:"Único" };
  ok("evento sem recorrência só cai uma vez",
     eventoNoDia(semRec,"2026-08-03",base) && !eventoNoDia(semRec,"2026-08-10",new Date(2026,7,10)));

  S.eventos = [evSemanal, evUtil, semRec];
  ok("eventosDoDia junta e ordena", eventosDoDia("2026-08-03", base).length === 3);
  const ord = eventosDoDia("2026-08-03", base);
  ok("evento sem hora vai por último", ord[ord.length-1].hora == null);

  C = {}; UI.vistaCal = "semana";
  const hs = viewSemana();
  ok("visão de semana renderiza", hs.length > 300 && !/undefined|NaN/.test(hs));
  ok("visão de semana tem 7 dias", (hs.match(/class="sem-dia/g)||[]).length === 7);
  igual("existem 5 opções de recorrência", RECORRENCIAS.length, 5);
  UI.vistaCal = "mes";
}

grupo("11. Checklist avançado");
{
  cenario();
  const n1 = { id:"t1", txt:"[ ] um\n[x] dois\n   [ ] subtarefa", tag:"Cálculo",
               ts:Date.now(), pri:"alta", prazo:k(-1), rec:"s" };
  const p = progressoNota(n1);
  igual("conta todos os itens, inclusive subtarefa", p.total, 3);
  igual("conta os concluídos", p.feitos, 1);
  ok("percentual coerente", Math.abs(p.pct - 1/3) < 0.01);

  const pz = prazoNota(n1);
  ok("prazo em 1 dia é 'perto'", pz.perto === true && pz.vencida === false);
  ok("nota sem prazo devolve null", prazoNota({ id:"x" }) === null);
  const venc = prazoNota({ prazo: k(3) });
  ok("prazo passado é marcado como vencido", venc.vencida === true);

  N = [n1];
  C = {};
  const hn = viewNotas();
  ok("nota mostra selo de prioridade", hn.includes("pri-alta"));
  ok("nota mostra selo de prazo", hn.includes("selo prazo"));
  ok("nota mostra selo de recorrência", hn.includes("selo rec"));
  ok("compositor tem os três campos novos",
     hn.includes('data-f="npri"') && hn.includes('data-f="nprazo"') && hn.includes('data-f="nrec"'));
  ok("checklist renderiza itens clicáveis", hn.includes("chk-lista"));

  /* ordenação: prazo mais próximo primeiro */
  N = [{ id:"a", txt:"sem prazo", tag:"Geral", ts:Date.now() },
       { id:"b", txt:"urgente", tag:"Geral", ts:Date.now()-1000, prazo:k(1) },
       { id:"c", txt:"depois", tag:"Geral", ts:Date.now(), prazo:k(-10) }];
  C = {};
  const ordem = viewNotas();
  ok("nota vencida aparece antes da sem prazo",
     ordem.indexOf("urgente") < ordem.indexOf("sem prazo"));

  C = {};
  const regras = motorRegras();
  ok("assistente avisa sobre prazo",
     regras.some(r => /vence|vencida/i.test(r.tit)));
}

grupo("12. Internacionalização");
{
  cenario();
  S.idioma = "pt-BR";
  igual("traduz para português", t("hoje"), "Hoje");
  S.idioma = "en-US";
  igual("traduz para inglês", t("hoje"), "Today");
  ok("saudação segue o idioma", ["Good morning","Good afternoon","Good evening","Still up"]
     .includes(saudacao()));
  igual("chave inexistente devolve ela mesma", t("chaveQueNaoExiste"), "chaveQueNaoExiste");
  S.idioma = "xx-XX";
  igual("idioma desconhecido cai no português", t("hoje"), "Hoje");
  S.idioma = "pt-BR";

  const chavesPt = Object.keys(IDIOMAS["pt-BR"]);
  const chavesEn = Object.keys(IDIOMAS["en-US"]);
  igual("os dois idiomas têm as mesmas chaves", chavesPt.length, chavesEn.length);
  ok("nenhuma chave sem tradução", chavesPt.every(c => IDIOMAS["en-US"][c] !== undefined));

  C = {};
  const d = dia(), vis = visiveis(d, montarDia(UI.agora));
  S.idioma = "en-US"; C = {};
  const hEn = viewHoje(d, vis, 910);
  ok("tela inicial renderiza em inglês", hEn.includes("Today's progress") || hEn.includes("Water"));
  S.idioma = "pt-BR";
}

grupo("13. Exportação CSV");
{
  cenario();
  const csv = montarCSV(30);
  const linhas = csv.split("\r\n");
  igual("uma linha por dia mais o cabeçalho", linhas.length, 31);
  ok("usa ponto e vírgula", linhas[0].split(";").length === 10);
  ok("cabeçalho nomeia as colunas", linhas[0].startsWith("Data;Dia"));
  ok("sem valor inválido", !/undefined|NaN/.test(csv));

  igual("campo com ponto e vírgula é protegido", csvCampo('a;b'), '"a;b"');
  igual("aspas são duplicadas", csvCampo('diz "oi"'), '"diz ""oi"""');
  igual("campo simples fica cru", csvCampo("simples"), "simples");
  igual("nulo vira vazio", csvCampo(null), "");
}

grupo("14. Notificações");
{
  cenario();
  ok("função de notificação existe", typeof notificar === "function");
  ok("detecta permissão ausente", podeNotificar() === false);
  ok("não quebra sem permissão", notificar("t","c") === false);
  ok("agendamento não roda sem permissão", agendarAvisos() === 0);
  S.alertas = false;
  ok("respeita o desligamento nos ajustes", notificar("t","c") === false);
  S.alertas = true;
}


/* ================================================================ 15. NÚCLEO 1.3 */
grupo("15. Event Bus");
{
  Bus.limpar();
  let recebido = null, contador = 0;
  const parar = Bus.ouvir("teste", d => { recebido = d; contador++; });
  igual("entrega para um ouvinte", Bus.emitir("teste", { a: 1 }), 1);
  igual("dados chegam íntegros", recebido, { a: 1 });
  igual("conta os assinantes", Bus.quantos("teste"), 1);

  Bus.ouvir("teste", () => contador++);
  Bus.emitir("teste", {});
  igual("entrega para todos", contador, 3);

  parar();
  igual("cancelar assinatura remove só um", Bus.quantos("teste"), 1);

  Bus.ouvir("falha", () => { throw new Error("proposital"); });
  let sobreviveu = false;
  Bus.ouvir("falha", () => { sobreviveu = true; });
  Bus.emitir("falha", {});
  ok("ouvinte com defeito não derruba os outros", sobreviveu);

  igual("evento sem ouvinte não quebra", Bus.emitir("ninguem", {}), 0);
  ok("histórico é registrado", Bus.ultimos().length > 0);
  ok("os nomes canônicos existem",
     ["metaAtualizada","eventoCriado","pomodoroTick","idiomaMudou","temaMudou","backupConcluido"]
       .every(k => typeof EV[k] === "string"));
  Bus.limpar();
}

grupo("16. Scheduler");
{
  let execucoes = 0;
  const tarefa = () => execucoes++;
  Agenda.noFrame(tarefa);
  Agenda.noFrame(tarefa);
  Agenda.noFrame(tarefa);
  ok("pedidos repetidos são agrupados", Agenda.pendentes().quadro === 1);
  Agenda.esvaziar();
  igual("a tarefa roda uma vez só", execucoes, 1);

  let a = 0, b = 0;
  Agenda.noFrame(() => a++);
  Agenda.noFrame(() => b++);
  Agenda.esvaziar();
  ok("tarefas distintas rodam todas", a === 1 && b === 1);

  let ocioso = 0;
  Agenda.quandoOcioso(() => ocioso++);
  Agenda.esvaziar();
  igual("fila ociosa é processada", ocioso, 1);

  let seguiu = false;
  Agenda.noFrame(() => { throw new Error("proposital"); });
  Agenda.noFrame(() => { seguiu = true; });
  Agenda.esvaziar();
  ok("tarefa com defeito não trava a fila", seguiu);
  ok("métricas são expostas", typeof Agenda.metricas().frames === "number");
}

grupo("17. Virtual DOM");
{
  const dom = montarDOM();
  const original = global.document;
  global.document = { createElement: dom.criar, activeElement: null };

  /* texto */
  let raiz = dom.criar("div");
  raiz.innerHTML = "<p>antigo</p>";
  const pAntes = raiz.childNodes[0];
  VDOM.aplicar(raiz, "<p>novo</p>");
  igual("texto é atualizado", raiz.childNodes[0].textoTotal(), "novo");
  ok("o mesmo nó é reaproveitado", raiz.childNodes[0] === pAntes);

  /* atributo */
  raiz = dom.criar("div");
  raiz.innerHTML = '<div class="a" id="x"></div>';
  const dAntes = raiz.childNodes[0];
  VDOM.aplicar(raiz, '<div class="b" id="x"></div>');
  igual("atributo alterado é corrigido", raiz.childNodes[0].getAttribute("class"), "b");
  ok("nó preservado ao trocar atributo", raiz.childNodes[0] === dAntes);

  raiz = dom.criar("div");
  raiz.innerHTML = '<div class="a" data-x="1"></div>';
  VDOM.aplicar(raiz, '<div class="a"></div>');
  ok("atributo removido some", raiz.childNodes[0].getAttribute("data-x") === null);

  /* crescimento e encolhimento de lista */
  raiz = dom.criar("div");
  raiz.innerHTML = "<li>1</li><li>2</li>";
  VDOM.aplicar(raiz, "<li>1</li><li>2</li><li>3</li>");
  igual("lista cresce", raiz.childNodes.length, 3);
  VDOM.aplicar(raiz, "<li>1</li>");
  igual("lista encolhe", raiz.childNodes.length, 1);

  /* chaves: item removido do meio não recria os vizinhos */
  raiz = dom.criar("div");
  raiz.innerHTML = '<li data-k="a">A</li><li data-k="b">B</li><li data-k="c">C</li>';
  const noC = raiz.childNodes[2];
  VDOM.aplicar(raiz, '<li data-k="a">A</li><li data-k="c">C</li>');
  igual("lista com chave encolhe certo", raiz.childNodes.length, 2);
  igual("o item certo permanece", raiz.childNodes[1].getAttribute("data-k"), "c");

  ok("nós de tags diferentes não são iguais",
     !VDOM.mesmoNo(dom.criar("div"), dom.criar("span")));
  const k1 = dom.criar("li"); k1.setAttribute("data-k", "x");
  const k2 = dom.criar("li"); k2.setAttribute("data-k", "y");
  ok("chaves diferentes não são o mesmo nó", !VDOM.mesmoNo(k1, k2));
  k2.setAttribute("data-k", "x");
  ok("chaves iguais são o mesmo nó", VDOM.mesmoNo(k1, k2));

  /* campo em foco não é sobrescrito */
  raiz = dom.criar("div");
  raiz.innerHTML = '<input data-f="q" value="antigo">';
  const campo = raiz.childNodes[0];
  campo.value = "o que o usuário digitou";
  global.document.activeElement = campo;
  VDOM.aplicar(raiz, '<input data-f="q" value="outro">');
  igual("campo focado preserva o que foi digitado", campo.value, "o que o usuário digitou");
  global.document.activeElement = null;
  VDOM.aplicar(raiz, '<input data-f="q" value="definitivo">');
  igual("campo sem foco recebe o valor novo", campo.value, "definitivo");

  /* economia real: HTML igual não gera alteração */
  raiz = dom.criar("div");
  const grande = Array.from({length:40}, (_,i)=>`<li data-k="i${i}">item ${i}</li>`).join("");
  raiz.innerHTML = grande;
  VDOM.zerar();
  VDOM.aplicar(raiz, grande);
  const m = VDOM.metricas();
  igual("HTML idêntico não cria nós", m.nosCriados, 0);
  igual("HTML idêntico não remove nós", m.nosRemovidos, 0);
  igual("HTML idêntico não mexe em texto", m.textos, 0);

  /* mudar um item de 40 toca só nele */
  VDOM.zerar();
  const alterado = grande.replace("item 20", "item vinte");
  VDOM.aplicar(raiz, alterado);
  const m2 = VDOM.metricas();
  igual("uma alteração mexe em um texto só", m2.textos, 1);
  igual("e não recria nenhum nó", m2.nosCriados, 0);

  ok("sem DOM disponível devolve -1", VDOM.aplicar(null, "<p>x</p>") === -1);
  global.document = original;
}

grupo("18. Store e memoização");
{
  Bus.limpar();
  const v0 = Store.versao();
  let avisado = 0;
  Store.assinar(() => avisado++);
  let mutou = false;
  Store.commit("teste", () => { mutou = true; });
  ok("a mutação roda", mutou);
  ok("a versão avança", Store.versao() > v0);
  igual("assinantes são avisados", avisado, 1);

  let viaBus = 0;
  Bus.ouvir("estadoMudou", () => viaBus++);
  Store.commit("outro", () => {});
  igual("commit emite estadoMudou", viaBus, 1);

  const vAntes = Store.versao();
  ok("commit com defeito não avança a versão",
     Store.commit("ruim", () => { throw new Error("proposital"); }) === false
     && Store.versao() === vAntes);

  Store.marcarSujo();
  ok("marcarSujo avança a versão", Store.versao() > vAntes);

  /* memoização */
  Memo.invalidar(); Memo.zerar();
  let calculos = 0;
  const calc = () => { calculos++; return "valor"; };
  igual("primeiro acesso calcula", Memo.obter("k", calc), "valor");
  Memo.obter("k", calc);
  Memo.obter("k", calc);
  igual("acessos seguintes usam o cache", calculos, 1);
  igual("as métricas contam os acertos", Memo.metricas().acertos, 2);

  Store.marcarSujo();
  Memo.obter("k", calc);
  igual("mudança de estado invalida o cache", calculos, 2);
  Bus.limpar();
}

grupo("19. Integração: render sem reconstruir");
{
  const dom = montarDOM();
  const original = global.document;
  const app = dom.criar("div");
  global.document = {
    createElement: dom.criar,
    getElementById: (id) => id === "app" ? app : null,
    querySelector: () => null,
    addEventListener(){}, activeElement: null,
    body: { setAttribute(){} }, documentElement: { setAttribute(){} }, hidden: false
  };

  cenario();
  UI.aba = "hoje"; UI.ultimoHTML = null; Memo.invalidar();
  render();
  ok("a tela é montada", app.childNodes.length > 0);
  const nosIniciais = app.childNodes.length;

  VDOM.zerar();
  render();
  const m = VDOM.metricas();
  igual("render repetido não cria nós", m.nosCriados, 0);
  igual("render repetido não remove nós", m.nosRemovidos, 0);

  /* Marcar um bloco muda o HTML, mas não pode recriar a árvore. */
  const min = UI.agora.getHours()*60 + UI.agora.getMinutes();
  const bl = montarDia(UI.agora).filter(b => b.k !== "base" && b.t > min)[0]
          || montarDia(UI.agora).filter(b => b.k !== "base")[0];
  const htmlAntes = UI.ultimoHTML;
  VDOM.zerar();
  const f = Object.assign({}, dia().feitos); f[bl.id] = Date.now();
  S.dias[hojeKey()] = Object.assign(dia(), { feitos: f });
  Memo.invalidar();
  render();
  ok("o HTML muda ao marcar um bloco", UI.ultimoHTML !== htmlAntes);
  const m2 = VDOM.metricas();
  ok("marcar um bloco não recria a tela", m2.nosCriados < nosIniciais,
     "criou " + m2.nosCriados + " de " + nosIniciais);

  global.document = original;
}


grupo("20. Pomodoro: timers e retomada");
{
  /* Instrumenta os timers para contar quantos ficam vivos. */
  const intervaloOriginal = global.setInterval;
  const limparOriginal = global.clearInterval;
  let vivos = new Set(), proximo = 1, criados = 0;
  global.setInterval = () => { criados++; const id = proximo++; vivos.add(id); return id; };
  global.clearInterval = (id) => { if(id) vivos.delete(id); };

  cenario();
  UI.rodando = false; UI.timer = null;

  iniciarPomo();
  igual("iniciar cria um timer", vivos.size, 1);

  /* O bug: dois toques em "começar" deixavam dois intervalos descontando
     o mesmo contador, e o pomodoro corria em dobro. */
  iniciarPomo();
  igual("iniciar duas vezes não duplica o timer", vivos.size, 1);

  iniciarPomo(); iniciarPomo(); iniciarPomo();
  igual("cinco toques seguidos, um timer só", vivos.size, 1);

  pararPomo();
  igual("parar remove o timer", vivos.size, 0);
  ok("parar zera a referência", UI.timer === null);
  pararPomo();
  igual("parar duas vezes não quebra", vivos.size, 0);

  /* Retomada pelo relógio do sistema: setInterval não roda em segundo
     plano no celular, então os ticks perdidos precisam ser recuperados. */
  UI.rodando = false;
  ok("nada a retomar quando parado", retomarPomo() === false);

  iniciarPomo();
  UI.seg = 1500;
  UI.pomoSegNoInicio = 1500;
  UI.pomoIniciadoEm = Date.now() - 60000;      /* um minuto atrás */
  ok("retomada detecta a diferença", retomarPomo() === true);
  ok("desconta os segundos perdidos", UI.seg >= 1435 && UI.seg <= 1441,
     "ficou em " + UI.seg);

  UI.pomoSegNoInicio = 30;
  UI.pomoIniciadoEm = Date.now() - 90000;      /* a fase acabou enquanto fechado */
  retomarPomo();
  igual("fase vencida em segundo plano zera o contador", UI.seg, 0);

  pararPomo();
  ok("parar limpa a âncora de tempo", UI.pomoIniciadoEm === null);

  global.setInterval = intervaloOriginal;
  global.clearInterval = limparOriginal;
}

grupo("21. Cache de nós do DOM");
{
  const dom = montarDOM();
  const original = global.document;
  let consultas = 0;
  const alvo = dom.criar("div");
  alvo.setAttribute("id", "reloj");
  const pai = dom.criar("div");
  pai.appendChild(alvo);

  global.document = {
    createElement: dom.criar,
    getElementById: (id) => { consultas++; return id === "reloj" ? alvo : null; },
    activeElement: null
  };
  Nos.limpar();

  const a = Nos.porId("reloj");
  const b = Nos.porId("reloj");
  const c = Nos.porId("reloj");
  ok("devolve sempre o mesmo nó", a === b && b === c && a === alvo);
  igual("consulta o DOM uma vez só", consultas, 1);

  /* Nó tirado da árvore não pode continuar sendo servido pelo cache. */
  pai.removeChild(alvo);
  consultas = 0;
  Nos.porId("reloj");
  igual("nó removido força nova consulta", consultas, 1);

  Nos.limpar();
  consultas = 0;
  Nos.porId("reloj");
  igual("limpar invalida o cache", consultas, 1);

  igual("id inexistente devolve null", Nos.porId("naoexiste"), null);
  global.document = original;
}

grupo("22. Robustez do render");
{
  const original = global.document;
  global.document = {
    getElementById: () => null,          /* contêiner ausente */
    querySelector: () => null,
    createElement: () => ({ style:{}, innerHTML:"" }),
    addEventListener(){}, activeElement: null,
    body:{ setAttribute(){} }, documentElement:{ setAttribute(){} }, hidden:false
  };
  cenario();
  UI.ultimoHTML = null;
  let quebrou = false;
  try { render(); } catch(e){ quebrou = true; }
  ok("render sem contêiner não lança exceção", !quebrou);
  global.document = original;
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

    /* campos novos da 1.2 sobrevivem ao ciclo de gravação e leitura */
    cenario();
    const e2 = JSON.parse(JSON.stringify(S));
    e2.idioma = "en-US";
    e2.pomo = { ciclos:[{ data:k(0), ts:1, fase:"foco", min:25 }], foco:30, curto:6, longo:20, ate:3 };
    e2.metas2[0].categoria = "leitura";
    e2.metas2[0].prioridade = "alta";
    e2.metas2[0].prazo = k(-10);
    e2.metas2[0].obs = "observação de teste";
    e2.eventos = [{ id:"ev", data:k(0), hora:600, titulo:"Repetido", rec:"s" }];
    const n2 = [{ id:"nx", txt:"[ ] a", tag:"Cálculo", ts:1, pri:"alta", prazo:k(-3), rec:"d" }];
    await Persistencia.salvarEstado(e2, true);
    await Persistencia.salvarNotas(n2, true);
    const v2 = await Persistencia.carregar(padrao());
    igual("idioma persistido", v2.S.idioma, "en-US");
    igual("configuração do pomodoro persistida", v2.S.pomo.foco, 30);
    igual("ciclos persistidos", v2.S.pomo.ciclos.length, 1);
    igual("categoria da meta persistida", v2.S.metas2[0].categoria, "leitura");
    igual("prioridade da meta persistida", v2.S.metas2[0].prioridade, "alta");
    igual("observação da meta persistida", v2.S.metas2[0].obs, "observação de teste");
    igual("recorrência do evento persistida", v2.S.eventos[0].rec, "s");
    igual("prioridade da nota persistida", v2.N[0].pri, "alta");
    igual("prazo da nota persistido", v2.N[0].prazo, k(-3));
    igual("recorrência da nota persistida", v2.N[0].rec, "d");

    /* compatibilidade: estado da 1.1, sem os campos novos, carrega inteiro */
    const antigo = padrao();
    delete antigo.pomo; delete antigo.idioma; delete antigo.backupAuto;
    antigo.dias[k(0)] = { feitos:{ d1:true }, minutos:{}, prot:0, agua:0, refs:{} };
    await Persistencia.salvarEstado(antigo, true);
    const v3 = await Persistencia.carregar(padrao());
    ok("estado da 1.1 carrega sem erro", !!v3.S && typeof v3.S.dias === "object");
    ok("campos novos ganham valor padrão", !!v3.S.pomo && !!v3.S.idioma);

    const bkp = await Persistencia.backupAutomatico(e2, n2);
    ok("backup automático grava", bkp === true);
    const bkpLido = await Persistencia.lerBackupAutomatico();
    ok("backup automático é legível", !!bkpLido && bkpLido.dados.length > 100);
    const rep = await Persistencia.backupAutomatico(e2, n2);
    ok("backup automático não repete no mesmo dia", rep === false);

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
