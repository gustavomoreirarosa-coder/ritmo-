# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
As versões seguem o [RITMO_ROADMAP.md](RITMO_ROADMAP.md).

---

## [1.4.1] — 2026-08-13 — Apple Visual Pass

Atualização visual mais perceptível sobre a 1.4.0, sem alteração de lógica ou dados.

- Tipografia nativa do sistema Apple como prioridade, sem dependência das fontes Google.
- Cabeçalho e títulos com hierarquia de Large Title do iOS.
- Cards, editor de notas, busca e filtros redesenhados com superfícies agrupadas.
- Tab bar com efeito glass, safe area e estado ativo em azul de sistema.
- Light/Dark mode refinados.
- Cache do service worker atualizado para garantir que a 1.4.1 seja baixada.

## [1.4.0] — 2026-08-12 — Visual Refresh

Atualização visual completa. **Nenhuma funcionalidade removida, nenhuma lógica
alterada.** Compatível com dados de todas as versões anteriores.

### Design system

- **Paleta reconstruída** sobre as cores de sistema do iOS. Escuro agora é
  preto verdadeiro (`#000`), melhor em telas OLED; claro usa o cinza agrupado
  (`#F2F2F7`) com cartões brancos.
- **Roxo virou destaque, não fundo.** Antes tingia superfícies inteiras;
  agora marca ação, aba ativa e progresso. Cada categoria ganhou uma cor de
  sistema própria — estudo em azul, treino em laranja, aula em índigo.
- **Tipografia SF Pro** de verdade em aparelhos Apple, com Inter como reserva.
  Escala do iOS: 34 / 28 / 20 / 17 / 15 / 13 / 11.
- **Menos caixas.** Itens relacionados agora vivem em uma superfície única com
  separadores de meio pixel, em vez de vários cartões soltos.
- **Modo Sistema** de volta, ao lado de Claro e Escuro.

### Tela de Notas — reestruturada

Editor com hierarquia: título, corpo, e os atributos agrupados como uma lista
do iOS (categoria, prioridade, prazo, repetição, dúvida com interruptor).
Inserções rápidas de checklist, subtarefa e modelo.

Busca com lupa, botão de limpar e foco destacado. Filtros como chips roláveis.

Cada anotação mostra categoria, título, data, prioridade, prazo e status, com
ações discretas: **Favorito**, **Concluir** e **⋯**. Excluir mora dentro de
"mais opções" — deixou de estar a um toque de distância por acidente.

**Campo `titulo` é aditivo:** anotações antigas usam a primeira linha como
título, sem migração.

### Tela Hoje

Cartão de resumo com a contagem do dia (estudos, treinos, aulas, anotações) e
o progresso integrado. Anéis viraram faixa rolável — cinco itens não cabiam em
grade sem sobrar um órfão.

### Tab bar

Redesenhada no padrão nativo: sem barrinha indicadora, o estado ativo é
comunicado por cor e um leve aumento do ícone.

### Corrigido

- **Tema claro não aplicava** quando o atributo estava só no `<body>`: o
  seletor tinha ficado preso a `html[data-tema]`.
- **Barra de progresso duplicada** nas anotações com checklist.
- Ícone de busca era um alvo, não uma lupa.
- Chips e filtros ativos sem contraste no tema claro.

### Testes

243 → **266 asserções**, todas passando. Cobertura nova: campos do editor,
filtros preservados, excluir dentro de "mais opções", título como campo
aditivo, busca por título e os três modos de tema.

---

## [1.3.0] — 2026-08-04 — Foundation Architecture

Versão de arquitetura e desempenho. **Nenhuma funcionalidade nova, nenhuma
mudança visual.** Compatível com dados da 1.0, 1.1 e 1.2.

### Adicionado

**Núcleo (cinco módulos independentes, sem framework)**
- `Bus` — eventos com nomes canônicos, assinatura cancelável e isolamento
  de falhas entre ouvintes
- `Agenda` — escalonador com `requestAnimationFrame` para trabalho visual e
  `requestIdleCallback` para trabalho pesado
- `VDOM` — diferença entre o DOM atual e o HTML novo, com identidade por
  `data-k` e proteção de campos em foco
- `Store` — dono do estado; toda alteração vira evento e agenda um render
- `Memo` — cache de trechos caros, invalidado pela versão do Store
- `Nos` — cache de elementos consultados a cada tick, validado por
  `isConnected` para nunca servir um nó que saiu da árvore

**Renderização**
- Atualização incremental: só o que mudou chega à tela
- Caminho híbrido escolhido por medição — substituição na troca de aba,
  diff na atualização da mesma aba
- Chaves de identidade em blocos, notas, metas, eventos e dias do calendário

### Melhorado

| Caminho real | 1.2 | 1.3 |
|---|---:|---:|
| Marcar 8 blocos — mutações no DOM | 56 | 28 |
| 20 renders do relógio — mutações | 7 | 0 |
| Digitar na busca — mutações | 35 | 4 |
| Digitar na busca — foco preservado | não | **sim** |

- Chamadas diretas de `render()` em `acao()`: 108 → 17
- Tela de estatísticas memoizada: recalcula só quando o estado muda
- Timer do Pomodoro escreve direto nos nós, sem passar por render

### Corrigido

- **Pomodoro criava timers duplicados.** Dois toques em "começar" sem pausar
  deixavam dois intervalos descontando o mesmo contador — o cronômetro corria
  em dobro. Reproduzido em teste, corrigido com guarda no início.
- **Pomodoro perdia tempo em segundo plano.** `setInterval` não roda com a
  aba oculta no celular; ao voltar, o contador estava congelado. Agora o
  tempo é reancorado pelo relógio do sistema.
- **Render quebrava sem o contêiner na página**, derrubando a ação inteira
  do usuário em vez de simplesmente não desenhar.
- **Campo em foco podia ter o texto sobrescrito** durante um render. Agora
  nem o atributo `value` é tocado enquanto alguém digita.
- **Memoização podia servir dado velho**: nem toda ação passa por `commit()`,
  então `salvar()` passou a marcar o estado como sujo.
- **Diff com falha deixava tela pela metade**: agora volta ao caminho seguro
  e registra o erro.

### Testes

- 176 → **243 asserções**
- DOM simulado próprio (nós, atributos, texto, filhos, parser mínimo) para
  exercitar o diff sem navegador
- Cobertura nova: Bus, Agenda, VDOM, Store, Memo, cache de nós, timers do
  Pomodoro, retomada em segundo plano e robustez do render

---

## [1.2.0] — 2026-08-04

Versão de amadurecimento: fecha as lacunas funcionais que sobraram da 1.1,
sem tocar na arquitetura. Compatível com dados da 1.0 e da 1.1.

### Adicionado

**Metas**
- Escopo diário e semanal, além de mensal e anual (a semana começa na segunda)
- Sete categorias: Estudos, Trabalho, Exercícios, Leitura, Saúde, Finanças e Personalizada
- Prazo próprio, prioridade e campo de observações por meta
- Seis modelos novos, incluindo metas diárias e semanais

**Pomodoro**
- Três fases: foco, pausa curta e pausa longa, com duração configurável
- Pausa longa automática a cada N ciclos
- Contador de ciclos do dia visível no anel
- Histórico com quatro indicadores e gráfico de ciclos por dia dos últimos 14 dias

**Calendário**
- Visão de semana com blocos, eventos e provas de cada dia
- Edição de eventos já criados
- Recorrência: diária, dias úteis, semanal e mensal — calculada na leitura,
  então mudar a regra corrige passado e futuro de uma vez

**Checklist**
- Prioridade, prazo e recorrência por tarefa
- Subtarefas indentadas, contadas no mesmo progresso
- Ordenação automática: fixadas, depois prazo mais próximo, depois prioridade
- Selos visuais de prioridade, prazo e recorrência
- Regra nova do assistente para tarefa vencendo

**Dashboard**
- Resumo da semana e do mês lado a lado
- Tempo produtivo e tempo de descanso
- Total de tarefas concluídas em 30 dias e sequência de dias

**Outros**
- Exportação em CSV, com ponto e vírgula e proteção de campos
- Backup automático diário, gravado no próprio banco
- Reset geral com dupla confirmação
- Notificações agendadas para as próximas 3 horas e resumo do dia às 20h
- Internacionalização com português e inglês
- Skeleton de carregamento no lugar do texto de espera

### Corrigido

- **`diasAte` usava o relógio real** enquanto o resto do app usa o horário da
  interface. Com o app aberto depois da meia-noite, contagens regressivas
  discordavam da tela.
- **Pausa longa nunca chegava na hora certa**: o ciclo recém-concluído era
  contado duas vezes no cálculo da próxima fase.
- **Nome do usuário, idioma, configuração do pomodoro e backup automático
  não eram gravados** no banco — bug herdado da 1.1.
- **Recorrência de evento era descartada** na gravação.
- **Rótulos da tela inicial não passavam pelo dicionário**, então o inglês
  não aparecia.
- **Colisão de classes CSS em três lugares**: `.pt.ev`, `.meta-nota.alerta` e
  `.mes-dia.prova` herdavam estilo de regras homônimas. A nota da meta chegava
  a virar banner fixo no topo da tela.
- Títulos truncados sem reticências pareciam defeito na visão de semana.

### Testes

- 88 → **176 asserções**, todas passando
- Cobertura nova: metas por escopo, pomodoro, recorrência de calendário,
  checklist avançado, i18n, CSV, notificações e persistência dos campos novos
- Teste de compatibilidade: estado da 1.1, sem os campos novos, carrega inteiro
- **Teste anti-regressão para colisão de classes CSS** — o mesmo bug apareceu
  três vezes no projeto; agora a suíte impede a quarta

---

## [1.1.0] — 2026-08-04

Versão de fundação: sem funcionalidades novas, foco em qualidade.

### Adicionado
- Suíte de testes versionada (88 asserções)
- Dashboard reorganizado em três perguntas, com anéis de progresso
- Nome do usuário e rótulo de medicação configuráveis
- Safe area do iPhone, splash screens, item Aplicativo nos ajustes

### Corrigido
- Aspas em nomes quebravam atributos HTML
- IDs por `Date.now()` colidiam
- Exportação falhava sem alternativa
- Gravação forçada não alimentava o cache, reescrevendo 74 registros
- Tema claro dependia do atributo estar no `<html>`

---

## [1.0.0] — 2026-08-03

Primeira versão completa: rotina, estudos, treino, alimentação, notas,
calendário, estatísticas, assistente por regras, metas, exportação em PDF e
planilha, PWA com IndexedDB e funcionamento offline.
