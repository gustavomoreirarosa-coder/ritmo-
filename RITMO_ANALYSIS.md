# RITMO — Análise da Arquitetura 1.3

**Versão:** 1.3 "Foundation Architecture"
**Data:** 4 de agosto de 2026
**Método:** leitura completa do código, 226 testes automatizados, e medição
comparada 1.2 × 1.3 em Chromium com `MutationObserver` e `performance.now()`.

---

## 1. O que mudou, em uma frase

As telas continuam sendo geradas como texto; o que mudou é que esse texto
deixou de ser jogado no DOM e passou a ser **comparado com ele**.

Essa escolha é o centro da versão. A alternativa — reescrever as sete views
como componentes com renderização própria — daria o mesmo resultado teórico e
teria altíssima chance de alterar aparência e comportamento, exatamente o que
a 1.3 não podia fazer. Diferenciar no DOM entrega o ganho **por construção**,
sem tocar em uma linha de interface.

---

## 2. Os cinco módulos do núcleo

```
┌──────────┐   ação do usuário
│    UI    │ ──────────────┐
└──────────┘               ▼
                     ┌───────────┐   commit()
                     │   Store   │ ─────────────► Bus (evento nomeado)
                     └───────────┘
                           │ pedirRender()
                           ▼
                     ┌───────────┐
                     │  Agenda   │  agrupa tudo do mesmo quadro
                     └───────────┘
                           │ requestAnimationFrame
                           ▼
                     ┌───────────┐   Memo (trechos caros)
                     │   VDOM    │ ◄──────────────
                     └───────────┘
                           │ só as diferenças
                           ▼
                         DOM real
```

### Bus — 100 linhas

Publicação e assinatura com nomes canônicos em `EV`. Cada `ouvir` devolve a
função que cancela — sem isso, listeners se acumulariam a cada re-registro.
Um ouvinte que lança exceção é isolado: os demais continuam recebendo.

### Agenda — 70 linhas

Dois canais. `noFrame` agrupa trabalho visual em `requestAnimationFrame`:
dez pedidos no mesmo quadro viram uma execução. `quandoOcioso` usa
`requestIdleCallback` e devolve a fila para a próxima janela quando o tempo
do quadro acaba — trabalho pesado nunca segura a interface.

### VDOM — 110 linhas

Compara a árvore viva com um molde e aplica só as diferenças. Três decisões
que importam:

- **`data-k` dá identidade aos nós.** Blocos, notas, metas, eventos e dias do
  calendário carregam chave. Remover um item do meio de uma lista reaproveita
  os vizinhos em vez de recriar tudo.
- **Campo em foco é território do usuário.** Nem o atributo `value` é
  escrito enquanto alguém digita. Foi um teste que revelou que a versão
  anterior sobrescrevia.
- **Falha volta ao caminho seguro.** Se o diff lança exceção, o HTML é
  aplicado inteiro e o erro é registrado. Nunca fica meia tela.

### Store — 60 linhas

Dono do estado. `commit(nome, mutação)` executa, incrementa a versão, emite
o evento no Bus, avisa os assinantes e agenda **um** render. `marcarSujo()`
existe porque nem toda ação passa por commit — algumas alteram e chamam
`salvar()` direto, e a memoização precisa saber disso. Sem esse detalhe, a
tela de estatísticas serviria dado velho.

### Memo — 30 linhas

Cache invalidado pela versão do Store. Aplicado à tela de estatísticas, a
mais cara do app: agrega até 90 dias e desenha vários gráficos.

---

## 3. Medições: 1.2 contra 1.3

Chromium, 120 dias de histórico, 233 nós na tela. `MutationObserver` conta
alterações reais no DOM — é o que gera *jank*, recálculo de layout e gasto
de bateria.

| Caminho real do usuário | 1.2 | 1.3 | |
|---|---:|---:|---|
| Marcar 8 blocos — mutações no DOM | 56 | **28** | −50% |
| 20 renders do relógio — mutações | 7 | **0** | −100% |
| Digitar na busca — mutações | 35 | **4** | −89% |
| Digitar na busca — foco mantido | ✗ | **✓** | |
| Marcar 8 blocos — tempo | 299 ms | 262 ms | −12% |
| Digitar na busca — tempo | 292 ms | 260 ms | −11% |

O ganho de tempo é modesto porque o custo dominante é montar a string HTML,
que não mudou. O ganho estrutural é a queda de mutações: menos trabalho de
layout, menos consumo, e nenhum elemento destruído no meio de uma interação.

### Uma medição que mudou a implementação

O primeiro benchmark mostrou a 1.3 **mais lenta** na troca de aba: 47 ms
contra 33 ms. Fazia sentido — quando o conteúdo muda inteiro, comparar nó a
nó custa mais que substituir. Pior: o diff impediria a animação de entrada,
que depende de elementos novos.

A implementação passou a ter dois caminhos, escolhidos pelo que foi medido:

- **Troca de aba** → substituição direta. Mais rápida e mais correta.
- **Atualização na mesma aba** → diff. Preserva foco, rolagem e animações.

---

## 4. Redução de trabalho redundante

| Item | Antes | Depois |
|---|---:|---:|
| Chamadas diretas de `render()` em `acao()` | 108 | 17 |
| Renders por ação do usuário | 1 imediato cada | agrupados por quadro |
| Recálculo da tela de estatísticas | a cada render | só quando o estado muda |
| Listeners registrados | delegação (já era 1×) | mantido, agora documentado |

O timer do Pomodoro escreve direto nos nós do relógio e do anel, sem passar
por render — um render por segundo seria desperdício mesmo com diff.

---

## 5. O que **não** foi feito, e por quê

**Pasta `src/` com módulos separados.** O app é um arquivo único sem etapa de
build, e é isso que faz o service worker ser simples e o PWA abrir em
qualquer lugar. Dividir em módulos ES nativos é viável e não é framework, mas
muda o modelo de cache e o deploy — e o pedido incluía "não quebrar PWA" e
"não quebrar offline". Os cinco módulos existem como unidades independentes
e isoladas dentro do arquivo, com fronteiras explícitas. Migrar para arquivos
separados fica para a 1.4, junto com a consolidação do CSS, quando houver
uma decisão consciente sobre build.

**Componentes com renderização própria** (`MetaCard`, `EventoCard`…).
Exigiria reescrever as sete views, com risco real de alterar aparência. O
diff entrega o mesmo resultado sem esse risco. Se a 2.0 precisar de
componentes de verdade, o Store e o Bus já estão no lugar para sustentá-los.

**Renderização preguiçosa dos gráficos.** A infraestrutura foi criada
(`Agenda.quandoOcioso`, `espacoGrafico`), mas ligá-la em produção exigiria
que o diff lidasse com conteúdo que aparece depois — combinação nova e com
chance de piscar. A memoização já resolveu o problema que a preguiça
resolveria. Deixar pela metade seria pior que não fazer.

---

## 6. Riscos remanescentes

| Risco | Gravidade | Situação |
|---|---|---|
| `index.html` em 302 KB | média | Teto da arquitetura de arquivo único |
| CSS com 925 regras e camadas sobrepostas | média | Alvo declarado da 1.4 |
| `acao()` com ~350 linhas | baixa | Funciona; incomoda ao ler |
| Diff em listas muito longas | baixa | Chaves mitigam; 233 nós hoje |
| Views ainda produzem string | baixa | É o custo dominante do render |

---

## 6.1 Segunda auditoria: o que a revisão encontrou

Depois da primeira entrega da 1.3, o projeto foi auditado de novo contra a
lista completa de itens de performance. Sete dos doze já estavam feitos. Dos
cinco restantes, três foram implementados e dois foram recusados com
justificativa.

### Implementado

**Timer duplicado no Pomodoro — bug real, reproduzido em teste.** Dois toques
em "começar" sem pausar criavam dois `setInterval` descontando o mesmo
contador. Na prática, o cronômetro corria em dobro. Corrigido com guarda no
início da função.

**Retomada em segundo plano.** `setInterval` é suspenso quando a aba fica
oculta no celular. O contador voltava congelado no tempo em que o app foi
minimizado. Agora o tempo é reancorado pelo relógio do sistema ao retornar,
e a fase é dada como concluída se venceu enquanto o app estava fechado.

**Cache de nós do DOM.** O tick do Pomodoro chamava `getElementById` duas
vezes por segundo para os mesmos elementos. O módulo `Nos` guarda a
referência e a valida com `isConnected` — ter `parentNode` não basta, porque
o nó pode estar num galho já descartado. Foi um teste que revelou isso.

### Recusado, com motivo

**`DocumentFragment` nas listas.** Faz sentido quando se monta muitos nós em
sequência para inserir de uma vez. Aqui as listas são geradas como string e
entregues ao diff, que já toca apenas no que mudou — não há inserção em lote
a otimizar. Usar fragmento seria adicionar código sem ganho mensurável.

**Componentes nomeados** (`GoalCard`, `TaskCard`, `ChecklistItem`…).
Reescrever as views para produzir nós em vez de string exigiria mexer nas
sete telas, com risco de alterar aparência — o oposto do objetivo da versão.
O diff entrega o mesmo resultado prático. O briefing pedia explicitamente
para não criar abstrações desnecessárias nem refatorar só para registrar
mudança; esta é exatamente essa situação.

## 7. Preparação para a 1.4

O que a 1.3 deixou pronto:

- **Store e Bus** sustentam componentes de verdade, se forem necessários
- **Agenda** permite mover trabalho pesado para fora do caminho crítico
- **243 testes**, com DOM simulado próprio para exercitar o diff
- **Teste anti-regressão de colisão de classes CSS** — o mesmo bug apareceu
  três vezes no projeto e agora não passa

A 1.4 pode consolidar o CSS com segurança: qualquer mudança que altere as
telas quebra a suíte.
