# Ritmo

Aplicativo pessoal de rotina para estudo, treino e alimentação.
Roda inteiramente no aparelho: sem servidor, sem login, sem conta,
sem enviar nada para lugar nenhum.

**Versão 1.5** — Agenda

---

## O que é

O Ritmo responde três perguntas, nesta ordem:

1. **Como está meu dia?** — saudação, data e barra de progresso
2. **O que preciso fazer agora?** — um card só, sem concorrência
3. **Como está meu progresso?** — anéis de água, estudo, treino, comida e metas

Abaixo disso: agenda com as próximas atividades, assistente por regras,
e as abas de treino, estudo, notas, mês e estatísticas.

## Instalar

Publique a pasta em qualquer host com HTTPS (Netlify, GitHub Pages, Vercel)
e abra no celular.

- **iPhone/iPad:** compartilhar → *Adicionar à Tela de Início*
- **Android:** Ajustes → Aplicativo → *Instalar aplicativo*
- **Computador:** ícone de instalar na barra de endereço

Instruções detalhadas em [LEIA-ME.md](LEIA-ME.md).

## Rodar os testes

```bash
node testes.js
```

313 asserções cobrindo integridade estrutural, funções de domínio,
renderização das telas, exportação e persistência. Sem dependências.

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | O app inteiro: interface, lógica, assistente, dados |
| `service-worker.js` | Cache offline e controle de versão |
| `manifest.json` | Identidade do app para instalação |
| `offline.html` | Página de fallback |
| `testes.js` | Suíte automatizada |
| `RITMO_ANALYSIS.md` | Análise técnica do projeto |
| `RITMO_ROADMAP.md` | Planejamento das próximas versões |
| `CHANGELOG.md` | Histórico de versões |
| `USER_GUIDE.md` | Guia de uso do aplicativo |

## Privacidade

Os dados ficam em IndexedDB, no próprio aparelho. Nada é sincronizado.
Desinstalar o app ou limpar os dados do navegador apaga tudo — exporte
um backup de vez em quando em Ajustes → Backup.
