<!-- LTeX: language=pt-BR -->

# Playwright QA Starter Kit

[![CI](https://github.com/brunoccalmeida/playwright-qa-starter-kit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/brunoccalmeida/playwright-qa-starter-kit/actions/workflows/ci.yml)
[![Relatório de testes](https://img.shields.io/badge/relat%C3%B3rio%20de%20testes-GitHub%20Pages-blue)](https://brunoccalmeida.github.io/playwright-qa-starter-kit/)
[![Versão do Playwright](https://img.shields.io/github/package-json/dependency-version/brunoccalmeida/playwright-qa-starter-kit/dev/%40playwright%2Ftest)](package.json)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[English](README.md)** | **Português (Brasil)**

Kit reaproveitável de Playwright + TypeScript para trabalhos de QA: testes E2E e de API, CI no GitHub Actions e relatório HTML publicado.

O app alvo é o [Restful Booker Platform](https://automationintesting.online), uma demonstração de reservas de hotel feita para testers.

## Visão geral

- **Testes:** 28 de API · 9 E2E, cada E2E no Chromium e no Firefox, contra um ambiente real compartilhado com outros testers
- **Defeitos encontrados e acompanhados:** 6 no app testado, [documentados](docs/KNOWN_ISSUES.md) e cada um afirmado por um teste que avisa quando o defeito é corrigido
- **Portões de qualidade:** a `main` só aceita pull request que passe em checagem estrita de tipos, lint, testes, `npm audit`, varredura de segredos (gitleaks) e auditoria dos workflows (zizmor)
- **Relatório ao vivo:** HTML, republicado a cada merge e toda noite: 📊 **[Ver o relatório de testes mais recente](https://brunoccalmeida.github.io/playwright-qa-starter-kit/)**
- **Reaproveitável:** um [guia passo a passo](docs/ADAPTING.md) (em inglês) leva o kit para o app de um novo cliente
- **Feito com IA, sob os mesmos portões:** construído com um agente de código de IA que não tem atalho para furar o CI, seguindo [regras escritas do projeto](.github/copilot-instructions.md): todo teste foi visto falhando antes de valer

## Reaproveite no seu app

O [docs/ADAPTING.md](docs/ADAPTING.md) cobre as decisões a tomar primeiro (repositório privado, ambiente de teste, quem pode ler o relatório), o que substituir e o que continua valendo, as configurações do GitHub que não acompanham o código e como provar que o resultado funciona.

## Desenvolvimento

Requer Node.js (versão em [.node-version](.node-version)).

```sh
npm ci            # instala exatamente as dependências travadas
cp .env.example .env
npm run check     # tipos, lint, formatação e as sentinelas de scripts/
npm run test:api  # testes de API (sem navegador)
npx playwright install chromium firefox
npm run test:e2e  # testes de navegador (Chromium e Firefox)
```

A configuração vem de variáveis de ambiente ([.env.example](.env.example)), validadas na inicialização por [src/config/env.ts](src/config/env.ts): uma variável ausente ou inválida interrompe a execução com uma mensagem que a nomeia. Variáveis definidas no shell têm precedência sobre o `.env`.

## Testes

| Camada | Onde                     | O que cobre                                                  |
| ------ | ------------------------ | ------------------------------------------------------------ |
| API    | [tests/api/](tests/api/) | Códigos de status, contratos de resposta e regras de negócio |
| E2E    | [tests/e2e/](tests/e2e/) | Jornadas de usuário que precisam de navegador                |

- **Clientes tipados** por recurso ficam em [src/api/](src/api/) e devolvem a resposta crua.
- **`expectJson(response, status, schema)`** afirma o status, o content type JSON e o contrato [zod](https://zod.dev), e devolve o corpo tipado; as falhas mostram a URL e o corpo cru.
- **Fixtures** ([tests/fixtures.ts](tests/fixtures.ts)) dão a cada teste os próprios dados, como um `adminToken` novo e um `room` que ninguém mais reserva.
- **Fábricas de dados** ([src/data/factories.ts](src/data/factories.ts)) montam payloads únicos (nomes com sufixo, datas aleatórias no futuro): o app alvo é um ambiente compartilhado, então os testes nunca dependem de dados existentes nem uns dos outros. Nunca afirme que um recurso novo está vazio: o ambiente apaga dados de tempos em tempos e pode entregar a um quarto novo as reservas de um antigo.
- **Page Objects** ([src/pages/](src/pages/)) expõem localizadores voltados ao usuário e ações; quem afirma são os testes. O `goto()` de uma página só retorna quando ela está pronta para uso, não num estado intermediário: uma URL que muda antes de o conteúdo renderizar, ou um formulário que a lista de quartos (carregando acima dele) está prestes a empurrar para baixo. `expectLoaded()` prova a sessão depois de um login pela UI.
- **Sessão de admin:** o projeto `setup` faz login pela UI uma vez por execução e salva a sessão em `playwright/.auth/admin.json` (ignorado pelo Git: dá acesso à conta de admin). Os testes E2E rodam como convidado; um spec de admin opta por ela com `test.use({ storageState: ADMIN_SESSION })` ([tests/e2e/fixtures.ts](tests/e2e/fixtures.ts)).
- **Navegadores:** cada jornada roda no Chromium e no Firefox (projetos `chromium` e `firefox`); ambos reaproveitam a mesma sessão de admin, um cookie válido em qualquer navegador.
- **Segredos fora do relatório:** o Playwright intitula os passos de digitação com o valor (`Fill "<valor>"`), então senhas são digitadas com `fillSecret` ([src/pages/fill-secret.ts](src/pages/fill-secret.ts)), e o ESLint rejeita passar senha, segredo ou token para `fill` e para os métodos de teclado (em um localizador ou em `page`). A mensagem de um `expect` é o título do passo mesmo quando a asserção passa, então o ESLint também rejeita mensagens montadas a partir de dados; `expectJson` e `expectStatus` só põem o corpo da resposta no erro quando há falha. Um teste que falha no meio do login ainda pode imprimi-la nos detalhes do erro: trate como sensível o relatório de um cliente com credenciais reais.
- **Bugs conhecidos do app** são testes marcados com `test.fail(title, knownIssue('KI-n'), body)` que apontam para [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): afirmam o comportamento correto e passam a "falhar" quando o bug é corrigido. No relatório, levam a tag `@known-issue` e uma frase explicando a falha esperada ([tests/known-issues.ts](tests/known-issues.ts)).
- **Contorno de bugs bloqueantes:** quando um bug do app bloqueia uma jornada inteira, o teste de navegador substitui só a chamada quebrada com `page.route` e mantém o resto real ([src/pages/known-issue-workarounds.ts](src/pages/known-issue-workarounds.ts)); o bug continua acompanhado pelo seu teste `test.fail()`. Exemplo: a página de reserva fica em branco porque `GET /api/room/{id}` devolve 500 (KI-1), então a jornada de reserva serve esse quarto a partir de `GET /api/room`.

## Integração contínua

Todo pull request roda o [workflow de CI](.github/workflows/ci.yml). A `main` é protegida por um ruleset: mudanças só entram por pull request com squash cujo check `ci-passed` esteja verde numa branch atualizada. `ci-passed` é o único check obrigatório; só passa quando todos os outros jobs do workflow passam, então jobs novos entram nos `needs` dele, nunca no ruleset.

**Relatório de testes:** os jobs `api` e `e2e` gravam cada um um blob report, e o job `report` os mescla num único relatório HTML (também em pull requests, como o artefato `github-pages`). O job `deploy` publica o relatório da `main` no [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/): depois de cada merge e da execução noturna contra o app real (06:23 UTC). Execuções com falha também são publicadas: são o relatório que mais vale ler. Os traces ficam desligados no CI porque guardariam as credenciais; um teste que falha mantém um screenshot.

Os jobs `api` e `e2e` leem as credenciais de admin dos secrets `ADMIN_USERNAME` e `ADMIN_PASSWORD` do repositório. Defina os dois como secrets de **Actions** e de **Dependabot**: workflows disparados pelo Dependabot só leem secrets do Dependabot.

O Dependabot abre atualizações semanais agrupadas de npm e GitHub Actions ([configuração](.github/dependabot.yml)). Majors do TypeScript ficam ignoradas enquanto o `typescript-eslint` as rejeita como peer dependency; [uma sentinela](scripts/check-dependency-ignores.ts) no `npm run check` reprova assim que isso deixa de ser verdade, para a regra de ignore não sobreviver ao seu motivo.

O job `e2e` roda na imagem oficial de container do Playwright, que traz os navegadores e as bibliotecas do sistema, então nenhuma execução depende de um espelho `apt`. A tag da imagem precisa acompanhar o `@playwright/test`, e o Dependabot não a atualiza: [outra sentinela](scripts/check-playwright-image.ts) reprova o `npm run check` no pull request do Dependabot que sobe o Playwright, até a tag e o digest do workflow serem atualizados nesse mesmo pull request (o comentário do job `e2e` mostra como obter o digest).

O job `audit` roda `npm audit` e reprova qualquer vulnerabilidade conhecida, então um pull request não consegue adicionar nem manter uma. Ele lê a mesma base de advisories dos alertas do Dependabot, que vigiam a `main` entre os pull requests. Corrija uma dependência transitiva vulnerável fixando a versão corrigida em `overrides` no `package.json`.

Dois jobs protegem o próprio repositório:

- `secret-scan` roda o [gitleaks](https://github.com/gitleaks/gitleaks) em todo o histórico do commit testado (num pull request, o que a `main` passaria a conter), então um segredo commitado e apagado depois no mesmo pull request ainda reprova. As demais branches ficam com o secret scanning do GitHub, que vigia toda branch atrás de tokens de provedores conhecidos; ative-o (com push protection) numa cópia do kit. Os logs saem mascarados. Um segredo real é primeiro revogado e depois removido; um falso positivo é liberado com um comentário `gitleaks:allow` na linha ou com a impressão digital no `.gitleaksignore`.
- `workflow-audit` roda o [zizmor](https://docs.zizmor.sh) nos workflows e reprova qualquer achado: injeção de template, permissões excessivas, credenciais persistidas e qualquer action não fixada por SHA completo de commit. Um achado só é ignorado em linha, com motivo (`# zizmor: ignore[rule]`).

As duas ferramentas estão fixadas em versões exatas no workflow, que o Dependabot não atualiza: suba-as à mão.

**Travas do agente de IA:** as regras para agentes de código de IA ficam em [.github/copilot-instructions.md](.github/copilot-instructions.md), compartilhadas entre Claude Code e GitHub Copilot. O [.claude/settings.json](.claude/settings.json) nega ao agente merge com `--admin`, force push, push na `main` e leitura ou edição do `.env`. Essas regras casam o texto do comando, então são uma rede de proteção e não uma fronteira de segurança: a fronteira é o ruleset da `main`, que não tem bypass e vale para todos.

## Licença

MIT, veja [LICENSE](LICENSE).
