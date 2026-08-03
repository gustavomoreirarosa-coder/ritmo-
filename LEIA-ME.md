# Ritmo — PWA

App de rotina, estudos, treino e alimentação. Roda inteiramente no seu aparelho:
sem servidor, sem login, sem conta, sem enviar dados para lugar nenhum.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | O app inteiro: interface, lógica, assistente, camada de dados |
| `service-worker.js` | Cache offline e controle de versão |
| `manifest.json` | Identidade do app para instalação |
| `offline.html` | Página mostrada se algo não estiver em cache |
| `icone-*.png`, `apple-touch-icon.png`, `favicon-32.png` | Ícones |
| `screenshot-*.png` | Prévias exibidas na tela de instalação |

Todos precisam ficar na **mesma pasta**.

## Publicar

O PWA exige HTTPS. Três opções gratuitas:

**Netlify (mais rápido)** — netlify.com → Add new site → Deploy manually →
arraste a pasta inteira. Pronto em segundos.

**GitHub Pages** — crie um repositório, envie os arquivos, Settings → Pages →
Source: branch `main`, pasta `/root`.

**Vercel** — vercel.com → New Project → arraste a pasta.

Abrir por `file://` **não funciona**: o navegador bloqueia service workers
nesse protocolo.

## Instalar no aparelho

- **iPhone/iPad (Safari):** botão compartilhar → *Adicionar à Tela de Início*
- **Android (Chrome):** aparece o botão *Instalar aplicativo* dentro de
  Ajustes → Aplicativo, ou no menu do navegador
- **Computador:** ícone de instalar na barra de endereço

## Testar o modo offline

1. Abra o app e navegue por todas as abas uma vez (isso enche o cache)
2. Ative o modo avião, ou no computador: F12 → aba Network → marque *Offline*
3. Recarregue. O app deve abrir normalmente, com todos os seus dados

Para conferir o que está guardado: Ajustes → Aplicativo → *verificar banco de dados*.

## Publicar uma nova versão

1. Edite o `index.html`
2. Em `service-worker.js`, troque a linha `const VERSAO = 'ritmo-v1.0.0'`
   por um número novo (`ritmo-v1.0.1`)
3. Reenvie os arquivos

Quem já tem o app instalado verá a faixa **"Nova versão disponível"** com um
botão Atualizar. Os dados no IndexedDB não são tocados nesse processo.

## Onde ficam os dados

IndexedDB, banco `ritmoDB`, em 11 stores separados: `rotina`, `tarefas`,
`notas`, `treino`, `provas`, `calendario`, `configuracoes`, `estatisticas`,
`hidratacao`, `alimentacao`, `progresso`.

Nada é apagado automaticamente. A única operação que substitui dados é você
restaurar um backup manualmente em Ajustes → Backup.

**Faça backup de vez em quando:** Ajustes → Backup → exportar, e guarde o texto.
Desinstalar o app ou limpar os dados do navegador apaga o IndexedDB.
