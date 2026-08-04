# RITMO — Análise Técnica

**Versão analisada:** pacote `ritmo-pwa` (index.html 255 KB, service-worker.js 5,2 KB)
**Data:** 3 de agosto de 2026
**Método:** leitura completa do código, execução das funções puras em Node com dados
simulados, renderização das telas em Chromium e inspeção visual.

> **Ressalva:** o link do GitHub não chegou na mensagem. Esta análise cobre o código
> do pacote que geramos. Se o repositório divergir, envie o link que eu revejo os
> pontos afetados.

---

## 1. Resumo do projeto

O Ritmo é um aplicativo pessoal de organização de rotina para um estudante de
engenharia noturno com TDAH em tratamento com estimulante. Cobre cinco domínios:
rotina diária, estudos, treino, alimentação e metas.

A tese do produto é uma só: **reduzir a decisão do dia a uma pergunta — "o que eu
faço agora?"** — e tornar o registro barato o suficiente para acontecer. Todo o
resto (estatísticas, análises, relatórios) é consequência do registro, nunca
pré-requisito dele.

Três características o separam de um app de tarefas genérico:

1. **Modo sobrevivência.** Em dia ruim, a rotina encolhe para o essencial. O app
   assume que dias ruins existem em vez de punir por eles.
2. **Assistente por regras.** 24 regras locais que leem o histórico e falam com
   quatro vozes distintas (Sugestão, Análise, Meta, Atenção). Nenhuma IA externa.
3. **Privacidade por arquitetura.** Nada sai do aparelho. Sem login, sem servidor,
   sem telemetria. O PDF e a planilha são montados no próprio dispositivo.

**Números:** 139 funções, 29 variáveis globais, 6 abas, 11 object stores,
836 regras de CSS, 45 ações mapeadas.

---

## 2. Arquitetura atual

### 2.1 Formato

Aplicação de arquivo único (`index.html`) com CSS e JavaScript embutidos, mais
service worker, manifest e ícones como arquivos irmãos. Sem build, sem
dependências, sem `node_modules`. ES5 por escolha, para máxima compatibilidade.

### 2.2 Camadas

```
┌─────────────────────────────────────────────┐
│  VIEWS        viewHoje, viewTreino,         │  produzem string HTML
│               viewEstudo, viewNotas,        │  a partir do estado
│               viewMes, viewDados, viewAjustes│
├─────────────────────────────────────────────┤
│  RENDER       render() → innerHTML          │  redesenho total,
│               + cache C{} por ciclo         │  com skip se igual
├─────────────────────────────────────────────┤
│  AÇÕES        acao(cmd, arg)                │  roteador único,
│               delegação por data-a          │  314 linhas
├─────────────────────────────────────────────┤
│  DOMÍNIO      motorRegras, planoSemanal,    │  puras, testáveis,
│               relatorioSemana, padroes,     │  memoizadas
│               progressoMeta, leitura        │
├─────────────────────────────────────────────┤
│  AGREGAÇÃO    serieDias, porMateria,        │  derivam tudo de
│               perfilHorario, sequencias     │  S.dias
├─────────────────────────────────────────────┤
│  PERSISTÊNCIA IndexedDB → window.storage    │  degradação em
│               → memória                     │  cascata
└─────────────────────────────────────────────┘
```

### 2.3 Estado

Três objetos globais:

| Objeto | Papel | Persistido |
|---|---|---|
| `S` | estado do domínio (dias, blocos, metas, cargas, provas…) | sim |
| `N` | notas e dúvidas | sim |
| `UI` | estado efêmero (aba ativa, filtros, rascunhos) | não |

`S.dias` é a fonte da verdade: um registro por data contendo blocos concluídos,
minutos por matéria, treino, proteína, água e refeições. **Todas as estatísticas,
padrões e relatórios são derivados dele** — nada é pré-calculado e armazenado,
o que elimina classes inteiras de bug de sincronização.

### 2.4 Persistência

Banco `ritmoDB` v1, 11 object stores com chaves naturais:

| Store | Chave | Conteúdo |
|---|---|---|
| `rotina` | id | moldes de blocos (semana/sábado/domingo) |
| `tarefas` | data | blocos feitos, ajustes do dia |
| `estatisticas` | data | minutos por matéria |
| `hidratacao` | data | copos de água |
| `alimentacao` | data | proteína e refeições |
| `notas` | id | anotações e dúvidas |
| `treino` | nome | histórico de carga por exercício |
| `provas` | id | datas de prova |
| `calendario` | id | compromissos |
| `configuracoes` | id | metas, tema, matérias, remédio |
| `progresso` | id | metas de longo prazo |

Gravação incremental: só o que mudou vai ao disco. Medido — mudar a água de um dia
grava **1 registro**, não o estado inteiro.

### 2.5 PWA

Cache versionado em três baldes, estratégias por tipo (HTML network-first, CSS e
imagens cache-first, JS stale-while-revalidate), limpeza de caches antigos na
ativação, fallback offline e fluxo de atualização com confirmação do usuário.

---

## 3. Pontos fortes

**Modelo de dados enxuto e correto.** Uma única fonte da verdade, tudo o mais
derivado. É a decisão mais acertada do projeto e o que permitiu adicionar
estatísticas, padrões e metas sem tocar em nada anterior.

**Zero dependências.** Não há cadeia de suprimentos para auditar, nada quebra
quando um pacote é despublicado, e o app inteiro cabe em um arquivo que abre em
qualquer navegador dos últimos oito anos.

**Degradação honesta.** A persistência tenta IndexedDB, cai para o storage do
ambiente, cai para memória — e avisa em cada caso. O app funciona dentro de um
iframe sandbox e hospedado, sem mudança de código.

**Motor de regras calibrado com cuidado.** As prioridades foram ajustadas depois
de teste: a regra de atraso foi de 92 para 66, restringida a uma janela de 4 horas
e a blocos que importam, porque na primeira versão o app reclamava às 9h de um dia
limpo. Esse tipo de calibragem é o que separa um assistente de um app irritante —
e é especialmente crítico para quem tem TDAH, para quem ruído é a via mais rápida
até a desinstalação.

**Análises que se recusam a afirmar sem amostra.** Toda função de padrão exige
mínimo de observações. Com app novo, o resultado é silêncio, não palpite.

**Documentação embutida onde importa.** Os comentários explicam *por quê*, não
*o quê* — por exemplo, o AudioContext único traz junto o motivo (limite do iOS),
para ninguém "otimizar" de volta.

---

## 4. Pontos fracos

### 4.1 CSS em camadas geológicas

Cada etapa acrescentou um bloco ao final da folha de estilo em vez de editar o
existente. Resultado: **281 pares seletor+propriedade declarados mais de uma vez**.

Os piores casos:

| Seletor | Propriedades redeclaradas |
|---|---|
| `.navbtn.on::after` | 7 |
| `.fechar`, `.menu button`, `.menu-ic`, `.voltar`, `nav` | 5 cada |
| `.clock` | 4 |

Isso funciona — a cascata resolve — mas significa que ler uma regra exige varrer
o arquivo inteiro, e que a próxima alteração tem chance real de ser sobrescrita
por um bloco posterior. **É a maior dívida técnica do projeto.**

### 4.2 Funções grandes demais

| Função | Linhas |
|---|---|
| `acao` | 314 |
| `viewDados` | 297 |
| `motorRegrasCalc` | 243 |
| `viewHoje` | 184 |
| `viewAjustes` | 177 |

`acao` é um `if/else` de 45 comandos. `viewDados` acumula seis seções em uma só
função. Nenhuma delas é incompreensível, mas todas passaram do ponto em que
caberiam na cabeça de uma vez.

### 4.3 Sem testes versionados

Toda a verificação foi feita em scripts descartáveis. Não existe suíte no
repositório, então **nada impede uma regressão futura**. Já aconteceu uma vez: a
extração do `itemBloco` fez a marca de prioridade vazar para a tela do Mês, e só
foi pega porque eu comparei o HTML antes e depois manualmente.

### 4.4 Arquivo único de 255 KB

Confortável para distribuir, ruim para evoluir e para o cache: qualquer vírgula
alterada invalida os 255 KB inteiros no service worker.

---

## 5. Bugs encontrados

Cada item abaixo foi **reproduzido em execução**, não deduzido da leitura.

### 5.1 Aspas em nome de matéria quebram o HTML — **grave**

Os valores concatenados em `data-a` não passam por `esc()`. Uma matéria chamada
`Cálculo "Aplicado"` gera:

```html
data-a="mat:Cálculo "     <!-- atributo truncado na aspa -->
```

O botão para de funcionar e o HTML seguinte fica malformado. Vale para matérias,
categorias, tags de nota e qualquer valor livre que vire argumento de ação.

**Confirmado em teste.** `esc()` aplicado em `data-a`: **não**.

### 5.2 IDs por `Date.now()` colidem — **médio**

Notas, provas, compromissos e metas usam `Date.now()` como identificador. Cinco
chamadas seguidas no teste produziram IDs repetidos. Na prática exige dois
registros no mesmo milissegundo, o que é improvável por toque manual — mas
qualquer criação em lote (importar backup, duplicar em série) colide.

### 5.3 Download pode falhar em silêncio no iOS instalado — **médio**

A exportação usa `<a download>` com blob. Em PWA standalone no iOS, esse caminho
é historicamente inconsistente. Existe aviso de erro, mas não há alternativa —
o usuário fica sem o arquivo e sem saída.

### 5.4 Falso alarme que investiguei e descartei

Suspeitei que o roteador de ações quebrasse com `:` no valor (`mat:Cálculo: II`).
**Testei: funciona.** O parser corta no primeiro `:` e devolve o resto intacto.
Registro aqui para não virar retrabalho.

---

## 6. Problemas de UX/UI

**Nome fixo no código.** "Gustavo" está escrito na saudação. Trivial de resolver,
mas impede qualquer uso por outra pessoa.

**Acessibilidade rasa.** 5 `aria-label`, zero `role`, zero `aria-live`. Os blocos
da rotina são `<li>` clicáveis — não recebem foco por teclado e não são anunciados
como acionáveis. As mensagens do Assistente mudam sem que um leitor de tela saiba.

**Valores não animam.** Como cada ação redesenha a tela inteira, as barras e anéis
saltam de um valor a outro em vez de transitar. O CSS tem a transição declarada;
ela nunca chega a rodar porque o elemento é recriado.

**Marcação atrasada envenena a análise.** O app agora registra a hora de cada
marcação, e os padrões de horário dependem disso. Quem marca tudo à noite recebe
análises erradas. Existe uma regra que detecta e avisa — mas o dado já saiu torto.

**Exportação escondida.** O relatório em PDF é uma das funcionalidades mais fortes
e está a quatro toques de distância, dentro de Ajustes.

---

## 7. Problemas de performance

| Item | Medição | Impacto |
|---|---|---|
| Arquivo único | 255 KB (CSS 72 + JS 180) | Primeiro carregamento e invalidação de cache |
| Redesenho total | 4 ms por render, 3 ms com cache | Baixo em uso normal; impede animar valores |
| Fontes externas | 3 famílias do Google Fonts | 1ª visita exige rede; sem ela, fallback nativo |
| `setInterval` de 20 s | roda em segundo plano | Consumo desnecessário de bateria |
| CSS redundante | 281 redeclarações | Parsing e cálculo de estilo maiores que o necessário |

Nenhum é crítico hoje. O redesenho total custa 3–4 ms com 95 dias de histórico —
mas cresce com o volume de dados, e é a barreira para animações de valor e para
arrastar blocos com o dedo.

---

## 8. Melhorias recomendadas

Ordenadas por **razão valor/risco**, não por dificuldade.

### Prioridade 1 — corrigir o que está quebrado

1. **Escapar valores em `data-a`** (bug 5.1). Uma função, aplicada em ~15 pontos.
2. **IDs com contador + timestamp** (bug 5.2).
3. **Fallback de exportação**: se o download falhar, abrir o arquivo em nova aba
   e oferecer o conteúdo para cópia.

### Prioridade 2 — proteger o que existe

4. **Suíte de testes versionada.** Extrair os scripts que já usamos para um
   `testes.js` com asserções, rodável por `node testes.js`. Sem isso, toda
   evolução futura é aposta.
5. **Snapshot de telas** como rede de segurança: gerar o HTML das 7 views com
   dados fixos e comparar. Foi assim que peguei duas regressões.

### Prioridade 3 — pagar a dívida

6. **Consolidar o CSS** nas 281 redeclarações, transformando as camadas em uma
   folha organizada por componente. Risco alto, valor alto — precisa dos testes
   de snapshot antes.
7. **Quebrar `acao` em mapa de handlers** (`{marcar: fn, sobrev: fn, ...}`),
   trocando 314 linhas de `if` por uma tabela.
8. **Dividir `viewDados`** em uma função por seção.

### Prioridade 4 — melhorar a experiência

9. **Nome configurável** nos ajustes.
10. **Acessibilidade**: landmarks, `aria-live` nos avisos do Assistente, blocos
    como `<button>` focáveis, e teste com VoiceOver.
11. **Fontes embutidas** como base64 ou subset local, eliminando a dependência de
    rede na primeira visita.
12. **Pausar o `setInterval`** quando `document.hidden`.

### Prioridade 5 — mudança estrutural

13. **Renderização incremental** (`morphdom` caseiro ou diff de nós). Destrava
    animação de valores, arrastar blocos e scroll estável. **Só depois dos testes**
    — é a mudança de maior risco do projeto.

---

## 9. Riscos ao modificar o projeto

| Risco | Probabilidade | Como mitigar |
|---|---|---|
| Regressão silenciosa em view | **Alta** | Snapshot de HTML antes/depois — já pegou 2 |
| Sobrescrita acidental por camada de CSS posterior | **Alta** | Consolidar a folha antes de estilizar algo novo |
| Perda de dados do usuário | Baixa | Nunca chamar `limpar()` fora da restauração; exportar backup antes de qualquer migração |
| Migração de banco mal feita | Média | `onupgradeneeded` por faixa de versão, nunca recriar stores existentes |
| Quebrar o modo artifact | Média | Manter a cascata de persistência; não assumir IndexedDB |
| Assistente virar ruído | Média | Toda regra nova precisa de limiar de amostra e teste de cenário |
| Arquivo passar de 300 KB | Alta se nada mudar | Dividir em módulos com build simples, ou aceitar e otimizar cache |

**A regra de ouro deste projeto:** nada é gravado sem confirmação do usuário, e
nada é apagado automaticamente. Qualquer alteração que viole isso deve ser
rejeitada, por mais conveniente que pareça.

---

## 10. Plano detalhado — versão 1.1

Objetivo da 1.1: **deixar o projeto seguro de evoluir.** Não é uma versão de
funcionalidades; é a que paga a dívida e instala a rede de proteção.

### Etapa A — Correções (meio dia)

- [ ] `esc()` em todos os valores de `data-a`
- [ ] Gerador de ID: `contador + Date.now() base36`
- [ ] Fallback de exportação com abertura em nova aba
- [ ] Pausar timers com `document.hidden`
- [ ] Nome do usuário configurável em Ajustes → Aparência

**Entrega:** os três bugs confirmados, fechados.

### Etapa B — Rede de proteção (um dia)

- [ ] `testes/dados-fixos.js` — cenário determinístico de 95 dias
- [ ] `testes/unidade.js` — asserções sobre as 16 funções de domínio
- [ ] `testes/snapshot.js` — HTML das 7 views + 15 combinações de filtro
- [ ] `testes/integridade.js` — ações órfãs, CSS balanceado, variáveis indefinidas
- [ ] `npm test` equivalente: `node testes/rodar.js`

**Critério de aceite:** a suíte roda em menos de 10 segundos e falha se qualquer
view mudar sem intenção.

### Etapa C — Consolidação do CSS (um dia)

- [ ] Gerar snapshot de referência das 7 telas
- [ ] Reescrever a folha organizada por componente, eliminando as 281 redeclarações
- [ ] Comparar snapshot: **exigência de 100% idêntico**
- [ ] Meta de redução: 72 KB → ~50 KB

### Etapa D — Organização do JS (um dia)

- [ ] `acao` vira mapa de handlers
- [ ] `viewDados` dividida em `secaoRotina`, `secaoEstudo`, `secaoTreino`,
      `secaoComida`, `secaoMetas`, `secaoRelatorio`
- [ ] Blocos de seção com cabeçalho em todo o arquivo
- [ ] Snapshot idêntico ao final

### Etapa E — Acessibilidade e carregamento (meio dia)

- [ ] Landmarks e `role` nas listas
- [ ] `aria-live="polite"` nos avisos do Assistente
- [ ] Blocos da rotina como `<button>` focáveis
- [ ] Fontes com subset local, sem dependência de rede
- [ ] Teste com leitor de tela

### O que NÃO entra na 1.1

- Renderização incremental (fica para a 1.2, depois da suíte madura)
- Funcionalidades novas de qualquer tipo
- Mudanças de design

### Definição de pronto

1. A suíte passa
2. Snapshot das 7 telas idêntico ao da 1.0
3. Os três bugs confirmados, fechados e com teste que os cobre
4. CSS abaixo de 55 KB
5. Nenhuma função acima de 150 linhas
6. O app abre offline, instala e atualiza sem perder dados

---

## Conclusão

O Ritmo tem um **núcleo bom**: modelo de dados correto, zero dependências,
privacidade por arquitetura e um assistente calibrado com cuidado real. Isso é
mais do que a maioria dos projetos pessoais alcança.

A fragilidade não está nas ideias, está na **ausência de rede de proteção**. Dez
etapas de evolução deixaram camadas de CSS sobrepostas e funções que cresceram
demais, e nada no repositório impede que a próxima mudança quebre algo em
silêncio. Já aconteceu duas vezes durante o desenvolvimento; nas duas, só foi
pego por comparação manual.

Por isso a 1.1 proposta não traz nenhuma funcionalidade nova. Ela existe para que
a 1.2 possa trazer.
