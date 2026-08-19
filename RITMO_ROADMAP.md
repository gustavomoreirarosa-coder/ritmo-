# RITMO — Roadmap

Planejamento oficial do projeto. Toda evolução sai daqui; nada é decidido
na hora. Uma versão só começa quando a anterior está fechada e testada.

**Regra permanente:** nenhuma versão adiciona funcionalidade antes de os
testes da versão anterior estarem passando.

---

## 1.0 — Fundação ✅ concluída

App completo: rotina, estudos, treino, alimentação, notas, calendário,
estatísticas, assistente por regras, metas, exportação em PDF e planilha,
PWA com IndexedDB.

## 1.1 — Foundation Update ✅ concluída

Sem funcionalidades novas. Qualidade, correção e proteção.

- 3 bugs confirmados, corrigidos
- Suíte de testes versionada (88 asserções)
- Dashboard redesenhado em três perguntas
- Anéis de progresso, agenda curta
- Nome e medicação configuráveis (dado pessoal fora do código)
- Safe area do iPhone, splash screens, tema claro corrigido

## 1.2 — Amadurecimento funcional ✅ concluída

Fecha as lacunas que sobraram da 1.1, sem tocar na arquitetura.

- Metas diárias e semanais, categorias, prazo, prioridade e observações
- Pomodoro com três fases, ciclos e histórico
- Calendário com visão de semana, edição e recorrência
- Checklist com prioridade, prazo, subtarefas e recorrência
- Dashboard com resumo semanal e mensal, tempo produtivo e descanso
- CSV, backup automático, reset geral, notificações agendadas, i18n
- 88 → 176 testes; 7 bugs corrigidos, 5 deles encontrados pelos próprios testes

---

## 1.3 — Foundation Architecture ✅ concluída

Arquitetura e desempenho, sem funcionalidade nova.

- Núcleo com Bus, Agenda, VDOM, Store e Memo — sem framework
- Renderização incremental com caminho híbrido escolhido por medição
- Mutações no DOM: −50% ao marcar blocos, −89% ao digitar, −100% em repouso
- Foco e texto preservados durante render
- Timer duplicado do Pomodoro corrigido; retomada em segundo plano
- Cache de nós do DOM validado por `isConnected`
- 176 → 243 testes

---

## 1.4 — Visual Refresh ✅ concluída

Atualização visual completa, a pedido — a faxina técnica foi adiada.

- Design system sobre as cores de sistema do iOS; roxo como destaque
- Tela de Notas reestruturada: editor, busca e ações discretas
- Tab bar nativa, cartão de resumo no Hoje, modo Sistema de volta
- 243 → 266 testes

---

## 1.5 — Agenda ✅ concluída

Visão diária estilo Google Calendar, Dia/Semana/Mês na aba Agenda
(antiga "Mês"). Fonte única de dados com o resto do app. 266 → 313 testes.

---

## 1.6 — Faxina técnica (adiada duas vezes)

**A dívida continua crescendo:** CSS em 1.196 regras agora. Cada versão
visual que passa na frente da faxina técnica a torna mais cara. Não deveria
ser adiada de novo.

**A dívida cresceu:** o CSS foi de 925 para 1.151 regras, ainda em camadas
sobrepostas. Quanto mais tempo passar, mais caro fica consolidar.

Agora que o diff existe e os testes protegem, é seguro mexer na forma.

- [ ] Consolidar as 925 regras de CSS (meta: 81 KB → 55 KB)
- [ ] `acao` vira mapa de handlers no lugar de ~350 linhas de `if`
- [ ] `viewDados` dividida por seção
- [ ] Avaliar módulos ES em arquivos separados, com decisão explícita sobre
      build e impacto no service worker
- [ ] Ligar a renderização preguiçosa dos gráficos, que ficou pronta mas
      não conectada na 1.3
- [ ] Animar barras e anéis entre valores — agora possível, porque os nós
      sobrevivem ao render

**Pré-requisito:** cumprido. 226 testes e DOM simulado.

## 1.4 — Faxina técnica (substituída acima)

- [ ] Consolidar as 281 redeclarações de CSS (meta: 72 KB → 50 KB)
- [ ] `acao` vira mapa de handlers no lugar de 314 linhas de `if`
- [ ] `viewDados` dividida por seção
- [ ] Nenhuma função acima de 150 linhas
- [ ] Fontes embutidas, sem depender de rede na primeira visita

## 1.6 — Acessibilidade

- [ ] Landmarks e `role` nas listas
- [ ] `aria-live` nos avisos do assistente
- [ ] Blocos da rotina focáveis por teclado
- [ ] Teste real com VoiceOver e TalkBack
- [ ] Contraste auditado em ambos os temas

## 1.7 — Sono e hábitos

Primeiras funcionalidades novas desde a 1.0. Fecham os dois anéis que
hoje não existem por falta de dado.

- [ ] Registro de sono (hora de dormir e acordar, derivado das marcações)
- [ ] Hábitos configuráveis com sequência própria
- [ ] Correlação sono × conclusão da rotina no assistente

---

## 2.0 — Multiusuário local

- [ ] Perfis separados no mesmo aparelho
- [ ] Escolha de perfil na abertura
- [ ] Exportação por perfil

## 2.1 — Sincronização opcional

Só se houver necessidade real. A privacidade por arquitetura é uma
característica do produto, não uma limitação a ser removida.

- [ ] Sincronização ponta a ponta criptografada, opcional e desligada por padrão
- [ ] Ou: sincronia por arquivo (exportar/importar entre aparelhos)

## 2.2 — Widgets e notificações nativas

Depende de o PWA amadurecer no iOS ou de um invólucro nativo.

- [ ] Widget com o bloco atual
- [ ] Notificação local no início de cada bloco

---

## Fora de escopo, permanentemente

Estas coisas não entram em nenhuma versão. Estão aqui para não voltarem
à discussão:

- **Login obrigatório** — quebra o princípio de funcionar sem conta
- **IA externa** — o assistente é por regras, auditável e offline.
  Reafirmado na 1.2: o módulo pode ser desacoplado para receber outro
  provedor no futuro, mas nenhuma chamada de rede entra sem uma decisão
  explícita de abrir mão do funcionamento offline e da privacidade.
- **Comunidade, ranking, competição** — o app é sobre a pessoa, não sobre comparação
- **Gamificação pesada** — sequência de dias é o limite; pontos e medalhas não
- **Anúncios ou plano pago** — projeto pessoal, sem monetização
- **Marketplace de templates** — complexidade sem retorno

---

## Como usar este documento

Antes de pedir qualquer alteração, confira se ela está prevista aqui. Se
não estiver, a pergunta certa é: *em qual versão isso caberia?* — e não
*dá pra fazer agora?*

Isso é o que impede o app de virar um acúmulo de ideias soltas.
