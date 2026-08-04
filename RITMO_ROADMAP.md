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

---

## 1.2 — Renderização incremental

**Problema que resolve:** hoje cada toque redesenha a tela inteira. Isso
impede animar a transição de valores, arrastar blocos com o dedo e manter
a posição de rolagem estável.

- [ ] Diff de nós no lugar de `innerHTML`
- [ ] Barras e anéis animando entre valores
- [ ] Arrastar blocos na edição da rotina
- [ ] Meta: render abaixo de 2 ms com 1 ano de histórico

**Pré-requisito:** suíte de snapshot cobrindo as 7 telas.
**Risco:** alto. É a maior mudança estrutural prevista.

## 1.3 — Faxina técnica

- [ ] Consolidar as 281 redeclarações de CSS (meta: 72 KB → 50 KB)
- [ ] `acao` vira mapa de handlers no lugar de 314 linhas de `if`
- [ ] `viewDados` dividida por seção
- [ ] Nenhuma função acima de 150 linhas
- [ ] Fontes embutidas, sem depender de rede na primeira visita

## 1.4 — Acessibilidade

- [ ] Landmarks e `role` nas listas
- [ ] `aria-live` nos avisos do assistente
- [ ] Blocos da rotina focáveis por teclado
- [ ] Teste real com VoiceOver e TalkBack
- [ ] Contraste auditado em ambos os temas

## 1.5 — Sono e hábitos

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
- **IA externa** — o assistente é por regras, auditável e offline
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
