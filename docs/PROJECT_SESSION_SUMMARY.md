<!-- LTeX: language=pt-BR -->

# Resumo das sessões

Estado do projeto entre chats. Lido no início de cada missão (ver `.github/copilot-instructions.md`).

## Estado atual

| Item             | Estado                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missão atual     | Extra — 409 intermitente na reserva (#42), concluída com o merge deste PR                                                                                                                                                                                                                                                                                        |
| Próxima missão   | #43 (cookie no call log de requisição falha): segurança desbloqueada, vem antes pela ordem de prioridade; depois #29 (política de flaky), que recebe o caso da #42                                                                                                                                                                                               |
| PRs abertos      | nenhum após o merge (Dependabot pode abrir outros: tratar no início do chat)                                                                                                                                                                                                                                                                                     |
| Portões          | `npm run check` (job `check`, inclui as sentinelas de ignores, de known issues e da imagem do Playwright), testes de API (`api`), E2E (`e2e`), `npm audit` (`audit`), relatório mesclado (`report`), segredos no histórico (`secret-scan`, gitleaks) e auditoria dos workflows (`workflow-audit`, zizmor); `ci-passed` no ruleset. `deploy` (Pages) só na `main` |
| Travas do agente | `.claude/settings.json` nega merge `--admin`, force push, push na `main` e leitura/escrita do `.env` (Bash e PowerShell); fronteira real é o ruleset da `main`                                                                                                                                                                                                   |
| Relatório        | [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/), a cada merge e na execução noturna (06:23 UTC)                                                                                                                                                                                                                                      |
| Testes           | API: 29 (auth, rooms, bookings, messages), 7 deles `test.fail()` (KI-1, KI-2, KI-3, KI-4, KI-6); E2E: 9 por navegador (Chromium e Firefox) + `setup`, 2 deles `test.fail()` (KI-5); todos os `test.fail()` usam `knownIssue('KI-n')` e têm a tag `@known-issue`                                                                                                  |

## Plano de missões

| #   | Missão                       | Escopo                                                                                                                        |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0   | Fundação                     | Repo, issues, tooling (TS estrito, ESLint, Prettier), regras do projeto, este resumo                                          |
| 1   | CI de qualidade              | Workflow com `npm run check` e job agregador `ci-passed`; ruleset na `main`; skill `ship-pr`                                  |
| 2   | API: autenticação            | `@playwright/test`, `playwright.config.ts`, env validado (zod), cliente de API, helper `expectJson`, testes de login          |
| 3   | API: rooms/bookings/messages | Testes de contrato e regra de negócio; `docs/KNOWN_ISSUES.md` com os bugs do app                                              |
| —   | Extra (#17)                  | `docs/KNOWN_ISSUES.md` em inglês (entregável do cliente) e regra de idioma ajustada; `npm audit` no CI                        |
| 4   | E2E: fundação                | Page Objects, projeto `setup` + `storageState`, home e login                                                                  |
| 5   | E2E: jornadas                | Contato, reserva (com `page.route` contornando o bug #1), admin de quartos                                                    |
| 6   | Relatório                    | Relatório HTML no GitHub Pages, Firefox no CI, execução noturna; reaberta: flaky do Firefox (#25) e falhas esperadas legíveis |
| 7   | Documentação                 | `docs/ADAPTING.md` (como reaproveitar o kit num cliente), README EN e pt-BR                                                   |

Princípio: cada dependência entra na missão que a usa (YAGNI). Por isso `@playwright/test`, `zod` e `playwright.config.ts` ficam para a Missão 2.

## Ordem de trabalho entre repositórios

Combinada em 06/11/2026, quando o [automation-template](https://github.com/brunoccalmeida/automation-template) foi **pausado** até o primeiro trabalho pago de automação. Pela regra de três, duas fontes (este kit e o `uat-automation-framework`) não bastam para extrair o núcleo comum; até lá, as melhorias entram à mão em cada repositório. Por isso a #15 tem a label `blocked`. Detalhes na seção "Pausa" do [resumo do automation-template](https://github.com/brunoccalmeida/automation-template/blob/main/docs/PROJECT_SESSION_SUMMARY.md).

A ordem é de **prioridade, não de dependência**: itens de repositórios diferentes andam em paralelo, em chats separados ("um PR aberto por vez" vale por repositório).

1. ✅ Este repo: Missão 3 (#4), integrada no PR #16.
2. `uat-automation-framework`: `timeout-minutes` e `persist-credentials: false` em todos os jobs.
3. ✅ Este repo: `docs/KNOWN_ISSUES.md` em inglês, com a regra de idioma ajustada, e `npm audit` no CI (#17).
4. ✅ Este repo: Missões 4, 5 e 6 (#5, #6, #7: E2E e relatório HTML no GitHub Pages). README com badges e um "At a Glance", sem o aviso de "Work in progress", entregue na Missão 7 (#8).
5. `uat-automation-framework`: #129 (flaky no Firefox).

**KI-3 nas propostas comerciais:** o KI-3 (o logout não invalida o token) entra como **exemplo de método**: achar o bug, prová-lo com um teste que afirma o comportamento correto (`test.fail()`) e documentar o impacto. Não entra como vulnerabilidade inédita, porque o Restful Booker Platform é um app de treino com bugs conhecidos.

## Achados do spike (antes da Missão 0)

Um spike descartável explorou o app e o toolchain; o código não foi entregue, só o aprendizado abaixo.

### Ambiente

O app é **compartilhado**: dados criados aparecem para todos e outros testers rodam testes lá. Cada teste cria dados únicos (datas aleatórias no futuro); reserva sobreposta devolve 409.

### Mapa da API

| Endpoint                   | Auth            | Comportamento observado                                                                                 |
| -------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/login`     | —               | `{username, password}` → `{token}` (credenciais do demo: `admin` / `password`)                          |
| `POST /api/auth/validate`  | corpo `{token}` | 200 `{valid:true}`; desconhecido → 403 `{"error":"Invalid token"}`; vazio → 401 (corrigido na Missão 2) |
| `POST /api/auth/logout`    | corpo `{token}` | 200 `{success:true}` (mas não invalida o token: KI-3)                                                   |
| `GET /api/room`            | público         | lista quartos; `?checkin&checkout` filtra os disponíveis                                                |
| `POST /api/room`           | exige (401)     | dados inválidos → 400 `{errors:[...]}`                                                                  |
| `POST /api/booking`        | público         | 201                                                                                                     |
| `GET /api/booking?roomid=` | exige           | —                                                                                                       |
| `POST /api/message`        | público         | 200 `{success:true}`; 400 devolve **array puro** de erros (formato diferente)                           |

Os endpoints protegidos leem o cookie `token`, não header `Authorization`; `validate` e `logout` leem o token do **corpo JSON** (só com cookie, respondem 500).

### Bugs do app (viram `test.fail()` e entram em `docs/KNOWN_ISSUES.md` na Missão 3)

1. `GET/PUT/DELETE /api/{room,booking}/{id}` → 500; por isso `/reservation/:id` fica em branco (contornável com `page.route` servindo o quarto a partir de `GET /api/room`).
2. `GET /api/message` lista mensagens de hóspedes **sem autenticação** (vazamento de dados).
3. Logout não invalida o token.
4. Checkout antes do check-in → 409 em vez de 400.
5. Acessibilidade: a label "Message" do formulário de contato não está associada ao textarea (usar o test id `ContactDescription`); o formulário de criar quarto não tem labels.

### UI

- `getByRole` casa por substring sem diferenciar maiúsculas: "Book now" casa com o "Book Now" do hero; usar `exact: true`.
- Reserva: o primeiro clique em "Reserve Now" só abre o formulário.
- Contato: sucesso = heading "Thanks for getting in touch <nome>!".

### Armadilhas do toolchain

- `@playwright/test` 1.65.0 foi publicado sem o `playwright-core` 1.65.0 correspondente → fixar **1.64.1** (reavaliar na Missão 2).
- `typescript-eslint` 8.72 exige `typescript <6.1` (peer dependency) → **TypeScript 6.0.3**, não o 7.
- TS 6: `paths` exigem `./` quando não há `baseUrl`.
- `exactOptionalPropertyTypes`: `workers: undefined` não compila (omitir a chave); payloads tipados como `interface` não são aceitos em `data` do `request` (usar `type`).
- `minimatch` (transitivo do ESLint) com ReDoS moderado: `overrides` para 11.0.4 zera o `npm audit`; `npm audit fix --force` rebaixaria o ESLint para a 9.
- Windows: o Node instalado via winget só entra no `PATH` de processos abertos depois da instalação (reiniciar o VS Code).

## Missão 0 — Fundação (#1)

**Entregue:** tooling com versões exatas (`--save-exact`) e Node fixado em `.node-version` (26.13.0); `tsconfig.json` estrito (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `checkJs` para tipar também o `eslint.config.mjs`); ESLint com `strictTypeChecked` do `typescript-eslint` e regras do `eslint-plugin-playwright` para `tests/`; Prettier; `npm run check`; regras do projeto (`CLAUDE.md` → `.github/copilot-instructions.md`), subagente `reviewer` e skill `close-mission`, adaptados do [uat-automation-framework](https://github.com/brunoccalmeida/uat-automation-framework).

**Decisões:**

- `"type": "module"`: ESM é o padrão atual do Node e do ecossistema (Playwright, ESLint flat config).
- `strictTypeChecked` em vez de `recommendedTypeChecked`: projeto novo, sem custo de migração; o kit deve demonstrar o nível mais rigoroso.
- `lint --max-warnings=0`: aviso ignorado vira ruído; ou é erro, ou é desligado com motivo.
- A skill `ship-pr` fica para a Missão 1, quando houver CI e ruleset para ela verificar.

**RED dos portões** (sondas temporárias em `tests/red-probe.ts`, removidas depois; sem elas, `npm run check` sai com 0):

- Só `goto('/home')` sem `await`: `npm run check` saiu com **1**, barrado pelo ESLint (`@typescript-eslint/no-floating-promises`, linha 6). Testado isolado porque o `check` encadeia com `&&`: se o `tsc` falhar antes, o lint nem roda.
- Só `const first: string = ['a'][0]`: barrado pelo `tsc` (`TS2322: Type 'string | undefined'`, efeito do `noUncheckedIndexedAccess`), saída 2.
- Só `await page.waitForTimeout(1000)`: `npm run check` saiu com **1**, barrado pelo `playwright/no-wait-for-timeout`. A mesma sonda em `src/` passou no ESLint, confirmando que as regras do Playwright valem só para `tests/**`.

**Achado: fim de linha (LF × CRLF).** Com `* text=auto` e `core.autocrlf=true` (padrão do Git no Windows), o checkout grava CRLF e o Prettier, que exige LF, reprova o clone novo. RED: apagar o `tsconfig.json`, restaurar com `git checkout` e rodar `prettier --check` → "Code style issues found". Correção recomendada pela [documentação do Prettier](https://prettier.io/docs/options#end-of-line): `* text=auto eol=lf` no `.gitattributes`. **Não volte para `text=auto` sem `eol=lf`.**

**Revisor:** primeira passada com três achados, todos aplicados: registrar o achado de LF neste resumo; provar o RED do lint pelo `npm run check` com a sonda isolada (o registro original misturava as duas sondas e o código 2 vinha do `tsc`); marcar que `docs/KNOWN_ISSUES.md` só existe a partir da Missão 3. Segunda passada (agente `reviewer`, diff final) com dois achados, aplicados: provar o bloco do `eslint-plugin-playwright` (sonda do `waitForTimeout` acima); e escrever a mensagem do squash à mão, porque a do primeiro commit ainda trazia o registro antigo do RED.

**Próxima missão:** 1 — CI de qualidade (#2). Sem CI, os portões dependem de cada pessoa lembrar de rodá-los.

## Missão 1 — CI de qualidade (#2)

**Entregue:** workflow `.github/workflows/ci.yml` (job `check` com `npm ci` + `npm run check`; job agregador `ci-passed`); ruleset `Protect main`; `.github/dependabot.yml`; skill `ship-pr`.

**Configuração no GitHub** (fora do Git, aplicada via `gh api`; refazer à mão num fork do kit):

- Ruleset `Protect main` (`~DEFAULT_BRANCH`, ativo, **sem bypass**): PR obrigatório só com squash, 0 aprovações (mantenedor único; o GitHub não deixa o autor aprovar o próprio PR, e quem revisa é o subagente `reviewer`); check `ci-passed` do GitHub Actions (`integration_id` 15368) com branch atualizada (`strict`); histórico linear; bloqueio de force push e exclusão.
- Repositório: só squash; auto-merge ligado; apagar a branch após o merge; título e corpo do squash vindos do PR (`PR_TITLE`/`PR_BODY`), para a mensagem final ser a revisada, não a lista de commits (no #9 ela trazia o registro de RED antigo); Dependabot security updates ligado.

**Decisões:**

- **Gate único `ci-passed`:** o ruleset exige um nome que nunca muda; jobs novos (API, E2E, Firefox) entram só nos `needs`. Roda com `if: always()`, porque check obrigatório pulado conta como aprovado ([Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)); aprova só `success` explícito de cada job (allowlist: `skipped` e `cancelled` reprovam).
- **O gate verifica os próprios `needs`** (`yq` lê os jobs do workflow e compara com `toJSON(needs)`): job esquecido nos `needs` não barraria o merge. No projeto de referência isso era um teste pytest; aqui não há runner de testes ainda, e o passo no próprio gate dispensa um.
- **`ship-pr` com auto-merge nativo** em vez de portar o `merge_when_green.py` da referência: o [auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request) "merges a pull request automatically after all required reviews and status checks pass" — a decisão fica com o ruleset, sem um segundo código para manter e testar. `--match-head-commit` prende o merge ao SHA lido.
- **Actions fixadas por SHA** (com a tag em comentário), `permissions: contents: read`, `persist-credentials: false`, `timeout-minutes`; `concurrency` cancela runs antigos só em PR.
- **Dependabot:** minor/patch agrupados, majors em PR próprio (decisão humana); `versioning-strategy: increase` (pins exatos); `cooldown` de 7 dias, pelo achado do `@playwright/test` 1.65.0 publicado quebrado.

**RED dos portões** (sondas em commits do próprio PR, depois desfeitas):

1. `tests/red-probe.ts` com `Promise.resolve()` sem `await`: `check` falhou no ESLint (`@typescript-eslint/no-floating-promises`, 5:3); `ci-passed` rodou mesmo assim e reprovou (`check: failure`); `mergeStateStatus: BLOCKED`.
2. Job `forgotten-job` fora dos `needs`: `check` e `forgotten-job` verdes, `ci-passed` reprovou (`workflow jobs: ["check","forgotten-job"]` × `gate needs: ["check"]`); PR `BLOCKED`.
3. Local: o Prettier reprovou `dependabot.yml` e o `SKILL.md` novos (aspas simples do `.prettierrc.json` valem também para YAML).

**Achados:**

- `git revert` desfaz o commit inteiro: a sonda 2 também apagava a sonda 1, e o revert a trouxe de volta. Conferir `git diff main --stat` depois de desfazer sondas.
- Os checks logo após o push ainda eram do commit anterior (`gh pr checks --watch` retornou antes de o run novo existir): consultar os check runs pelo SHA da head, como manda a regra.
- O terminal do Claude Code no Windows ainda não tinha o Node no `PATH` (armadilha do spike); contorno: recarregar o `PATH` do registro na sessão do PowerShell.

**Revisor** (agente `reviewer`, diff completo): quatro achados. Aplicados, todos na `ship-pr`: (1) `gh pr checks --watch` logo após `update-branch` vê os checks do commit anterior, ou nenhum; (2) o auto-merge é assíncrono, então `OPEN` com checks verdes ainda não é resultado; (3) `DIRTY` não era tratado. Os três viraram um laço que lê `ci-passed` pelo SHA e só sai num estado final. Ao testar o laço, uma falha de rede deixou o SHA vazio e ele repetiu para sempre; ganhou `${sha:?}` (fail fast) e um prazo de 30 min. Descartado: (4) a citação do auto-merge "seria de memória"; conferida na página, é a primeira frase literal de "About auto-merge".

**Próxima missão:** 2 — API: autenticação (#3), que traz `@playwright/test` e o primeiro job de testes para os `needs` do gate.

## Missão 2 — API: autenticação (#3)

**Entregue:** `@playwright/test` 1.64.1 e `zod` 4.6.7; `playwright.config.ts` com o projeto `api`; `src/config/env.ts` (env validado com zod, `.env` carregado pelo `process.loadEnvFile` nativo); `.env.example`; cliente `AuthApi` (`src/api/auth-api.ts`) com os schemas de contrato; helper `expectJson` (status + `Content-Type` JSON + contrato zod, devolve o corpo tipado); fixtures `authApi` e `adminToken` (`tests/fixtures.ts`); 7 testes de login, validate e logout; job `api` no CI, nos `needs` do `ci-passed`; `docs/KNOWN_ISSUES.md` com o KI-3.

**Configuração no GitHub** (fora do Git; refazer num fork): secrets `ADMIN_USERNAME` e `ADMIN_PASSWORD` nos cofres **Actions e Dependabot**. Workflows disparados pelo Dependabot só leem secrets do Dependabot ([Troubleshooting Dependabot on GitHub Actions](https://docs.github.com/en/code-security/dependabot/troubleshooting-dependabot/troubleshooting-dependabot-on-github-actions)); sem eles, todo PR do Dependabot reprovaria no `api`.

**Decisões:**

- **Playwright 1.64.1, não 1.65.0:** a armadilha do spike foi resolvida (o `playwright-core` 1.65.0 saiu hoje, 2 h depois do `@playwright/test`), mas a versão tem horas de vida; vale o mesmo `cooldown` de 7 dias do Dependabot, que vai propô-la.
- **`process.loadEnvFile` em vez de `dotenv`** (que a [doc do Playwright](https://playwright.dev/docs/test-parameterize) sugere): nativo e estável desde o Node 24.10 (YAGNI, uma dependência a menos). Medido no Node 26: variável do shell **vence** a do arquivo (o CI e o `BASE_URL=... npx playwright test` funcionam) e arquivo ausente lança `ENOENT` (por isso o `existsSync`).
- **Validação no import de `env.ts` (fail fast):** o `playwright.config.ts` importa o módulo, então variável faltando para a execução antes de qualquer teste, com o nome da variável (`z.prettifyError`).
- **`BASE_URL` no workflow, credenciais em secrets:** URL não é segredo e fica explícita no job; num fork, muda-se num só lugar.
- **Imports com `.ts` (`allowImportingTsExtensions`)**: o caminho aponta para o arquivo que existe; nada é compilado para `.js` (`noEmit`; o Playwright e o _type stripping_ do Node executam `.ts`). Requisito conferido na mensagem do próprio `tsc` (o site do TypeScript estava fora do ar).
- **Contratos com `z.object` (tolerant reader):** campo novo na resposta não quebra os clientes, então não reprova o teste; campo faltando ou com tipo errado reprova.
- **Clientes por recurso** (`AuthApi`, depois `RoomApi`...) devolvendo a `APIResponse` crua: o teste decide o que afirmar, inclusive os casos de erro.
- **`adminToken` por teste:** o teste de logout queima o próprio token; nenhum outro teste depende dele (test isolation).
- **Trace só local (`retain-on-failure`), desligado no CI e sem artefato `test-results/`:** o trace guarda o corpo de cada requisição, e o do login traz `{"username":"admin","password":"password"}` em texto puro (visto ao abrir um `trace.zip`); o mascaramento de secrets do Actions vale para o log, não para artefatos, que num repositório público qualquer usuário logado baixa. Não há como mascarar campos no trace, então o seguro é não gerá-lo (_secure by default_). No CI, o diagnóstico é a mensagem do `expectJson` (URL + corpo). Localmente, `retain-on-failure` em vez de `on-first-retry`, porque sem retry este nunca gravaria. **Missão 6 (relatório publicado): não reintroduzir trace no CI sem resolver isto.**
- **`playwright/expect-expect` aprendeu o `expectJson`** (`assertFunctionNames`, opção conferida no código do plugin), em vez de ser desligado.

**RED:**

1. Env: `npx playwright test` sem `.env` → `Invalid environment configuration` listando `BASE_URL`, `ADMIN_USERNAME` e `ADMIN_PASSWORD`; nenhum teste rodou.
2. Teste antes do suporte: `auth.spec.ts` escrito antes do cliente → `Cannot find module '.../src/api/auth-api.ts'`.
3. Contrato (mutação): `token: z.number()` → `Body does not match the contract: ✖ Invalid input: expected number, received string → at token`, com URL e corpo; desfeita.
4. `test.fail()` do KI-3 trocado por `test` → `HTTP status of .../api/auth/validate Body: {"valid":true} Expected: 403 Received: 200`: falha pelo motivo do bug, não por erro do teste; desfeita.
5. Lint: os testes que só usam `expectJson` reprovaram em `playwright/expect-expect` até o rule aprender o nome.
6. Uma mutação por teste (o RED 2 derruba todos pelo mesmo motivo e não prova cada asserção), cada uma desfeita:
   - senha errada: status `401`→`200` → `Expected: 200 Received: 401` (com `Body: {"error":"Invalid credentials"}`); mensagem → `Expected: "Wrong credentials" Received: "Invalid credentials"`;
   - token emitido: `valid` `true`→`false` → `Expected: false Received: true`;
   - token desconhecido: `403`→`401` → `Expected: 401 Received: 403`; mensagem → `Received: "Invalid token"`;
   - token vazio: `401`→`400` → `Expected: 400 Received: 401`; mensagem → `Received: "No token provided"`;
   - logout: `success` `true`→`false` → `Expected: false Received: true`.
7. Trace no CI: teste quebrado de propósito com `CI=true` → 0 `trace.zip`; sem `CI` → 1.
8. CI sem os secrets (primeiro run do PR): job `api` parou em `Invalid environment configuration` com `Too small: expected string to have >=1 characters → at ADMIN_USERNAME` (e `ADMIN_PASSWORD`); `ci-passed` reprovou; PR `BLOCKED`. Secret inexistente vira **string vazia**, não variável ausente: sem o `.min(1)` do schema, a validação passaria e cada teste quebraria com um 401 longe da causa.

**Achados:**

- O mapa do spike estava errado no `validate`: ele (e o `logout`) leem o token do **corpo JSON**; só com cookie respondem 500. Corrigido no mapa da API acima. Sondar antes de escrever o cliente evitou um cliente errado.
- KI-3 confirmado por dois caminhos: depois do logout, `validate` diz `valid:true` e o token ainda abre `GET /api/booking` (sem token: 401).
- `prettier --write .` formata também arquivos locais não rastreados (o `.vscode/settings.json` criado pela extensão Python); rodar o `--write` só nos arquivos da missão.
- **Sonda errada parece teste errado:** uma mutação com `sed` por intervalo (`/wrong password/,/});/s/401/400/`) saiu verde. O diff mostrou 1 linha: o `s` pegou o `401` do **título**, e o intervalo terminava no `});` da chamada de login, antes da asserção. Refeita na linha da asserção, falhou. Conferir o diff da mutação antes de ler o resultado.

**Revisor** (agente `reviewer`, diff completo): dois achados, ambos aplicados. (1) O trace enviado como artefato no CI vazaria as credenciais: confirmado abrindo um `trace.zip`; trace desligado no CI e upload removido (ver Decisões). (2) Cinco dos sete testes não tinham RED próprio: uma mutação por teste (RED 6).

**Próxima missão:** 3 — API: rooms/bookings/messages (#4), que reaproveita `expectJson`, as fixtures e o `adminToken` (via cookie `token`), e completa o `KNOWN_ISSUES.md` com os bugs 1, 2, 4 e 5 do spike.

## Extra — ignore de majors do TypeScript (#13)

**Contexto:** o Dependabot abriu o #11 (TypeScript 6.0.3 → 7.0.2), reprovado no `npm ci` com `ERESOLVE`: o `typescript-eslint` 8.72.1 (o mais recente) exige `typescript >=4.8.4 <6.1.0`. Fechar o PR não basta: cada versão nova do TS 7 abriria outro PR vermelho, ocupando a fila de um PR por vez.

**Entregue:** entrada `ignore` (`typescript`, `version-update:semver-major`) no `.github/dependabot.yml`; sentinela `scripts/check-dependency-ignores.ts`, último passo do `npm run check` (`check:deps`); `semver` 7.8.5, `@types/semver` 7.8.0 e `yaml` 2.9.1 como dependências de desenvolvimento; #11 fechado com o motivo.

**Decisões:**

- **`ignore` no arquivo, não o comando `@dependabot ignore this major version`:** o comando grava a regra fora do repositório ("Dependabot stores the preferences for the repository centrally"), e a própria [documentação](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/managing-pull-requests-for-dependency-updates) recomenda "explicitly define the dependencies and versions to ignore in the configuration file". Só `update-types` de major: patches, minors e atualizações de segurança continuam chegando ([options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference): "`update-types` only affects _version_ updates, not _security updates_").
- **Sentinela, porque o `ignore` do Dependabot é silencioso:** nada avisa quando o motivo deixa de existir. Ela reprova quando o peer do `typescript-eslint` instalado aceita a próxima major **e** o `ignore` ainda está lá. Dispara no PR do Dependabot que traz esse `typescript-eslint`, a hora certa. **Quando disparar:** apagar o bloco `ignore` num PR próprio para a `main`, não no branch do Dependabot (push ali faz o Dependabot parar de rebasear o PR, e a `main` exige branch atualizado); depois comentar `@dependabot rebase` no PR bloqueado. O Dependabot então propõe a major do TypeScript num PR separado. Qualquer entrada `ignore` do `typescript` conta, em qualquer formato (`update-types`, `versions` ou nenhum), para uma regra reescrita não calar o alarme. Alternativas descartadas: fechar cada PR do TS 7 (lembrete ruidoso, dispara mesmo sem nada mudar); revisão periódica (depende de memória).
- **Prática de mercado conferida:** é o padrão de lembrete condicional da regra [`expiring-todo-comments`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md) do `eslint-plugin-unicorn` (recomendada; condições como `[peer:eslint@>=9]`), e uma _fitness function_ de _Building Evolutionary Architectures_ ([InfoQ](https://www.infoq.com/articles/fitness-functions-architecture/)). A regra do unicorn não serve aqui: só pergunta a versão do `typescript-eslint` (não sabemos se o suporte virá numa 8.x ou 9.0) e só lê comentários JS/TS. O [Renovate](https://docs.renovatebot.com/key-concepts/dashboard/) resolve com um dashboard de atualizações ignoradas; trocar de ferramenta por um `ignore` seria desproporcional (YAGNI).
- **Próxima major derivada do TypeScript instalado**, nada fixo: depois de migrar para o 7, a mesma sentinela vigia o 8 se o `ignore` voltar.
- **`yaml` para ler o `dependabot.yml`**, não regex (que casaria com um comentário); arquivos validados com zod e `z.prettifyError`, como o `env.ts`.
- **`semver` 7.8.5, não 7.8.6:** a 7.8.6 tinha 3 dias; mesmo critério do `cooldown` de 7 dias.

**RED:**

1. Teste antes do código: `check:deps` ligado ao `package.json` antes do script existir → `Error: Cannot find module '...\scripts\check-dependency-ignores.ts'`.
2. Evento simulado: peer em `node_modules/typescript-eslint/package.json` trocado para `>=4.8.4 <7.1.0` → `typescript-eslint 8.72.1 accepts TypeScript 7 (peer: ">=4.8.4 <7.1.0"). Remove the typescript ignore from .github/dependabot.yml in a pull request of its own to main, then comment "@dependabot rebase" on this one.`, saída 1.
3. Correção prevista: no mesmo cenário, bloco `ignore` apagado (8 linhas) → `No typescript ignore in .github/dependabot.yml: nothing to check.`, saída 0.
4. `dependabot.yml` malformado (`ignore:` vazio) → `Unexpected shape of .github/dependabot.yml: ✖ Invalid input: expected array, received null → at updates[0].ignore`.
5. `ignore` reescrito com `versions: ['>=7']` no lugar de `update-types`, peer aceitando o TS 7 → mesma reprovação do RED 2, saída 1 (antes da correção do revisor, a sentinela ficaria muda).

Tudo restaurado depois; sem a simulação, a sentinela imprime `TypeScript major ignore still needed: typescript-eslint 8.72.1 peer ">=4.8.4 <6.1.0" rejects TypeScript 7.`

**Achados:**

- **Sonda errada de novo:** a primeira sonda da correção apagou só a entrada e deixou `ignore:` só com comentários, que em YAML é `null`; a sentinela quebrou com um `ZodError` cru. A sonda estava errada (a correção real apaga o bloco), mas o achado melhorou o código: a mensagem agora cita arquivo e campo.
- `npm run check` local reprova no Prettier por causa do `.vscode/settings.json` não rastreado (achado da Missão 2); no CI não existe.

**Revisor** (agente `reviewer`, diff completo): sem bugs de correção; conferiu `semver.intersects` nos casos de borda (prerelease só, range sem limite superior, range inválido lança). Dois achados, ambos aplicados: (1) faltava o procedimento de quando a sentinela dispara: corrigir no branch do Dependabot o deixaria sem rebase; agora mensagem, script, `dependabot.yml` e este resumo mandam corrigir num PR próprio e usar `@dependabot rebase`; (2) a sentinela só reconhecia a forma exata do `ignore` e ficaria muda com uma regra reescrita: agora qualquer entrada `typescript` conta (RED 5), e a ausência de `ignore` aparece no log.

**Próxima missão:** 3 — API: rooms/bookings/messages (#4).

## Missão 3 — API: rooms/bookings/messages (#4), concluída (#16)

**Entregue:** clientes `RoomApi`, `BookingApi` e `MessageApi` com contratos zod; `src/api/schemas.ts` com os três formatos de erro do app e o `authCookie`; fábricas de dados (`src/data/factories.ts`: nomes com sufixo, datas aleatórias de 1 a 10 anos à frente); fixtures `roomApi`, `bookingApi`, `messageApi` e `room` (um quarto por teste); helper `expectFound`; 20 testes novos (27 no total); `docs/KNOWN_ISSUES.md` com KI-1 a KI-6.

**Mapa da API corrigido pela sondagem** (o do spike vale, com estes ajustes):

| Endpoint                         | Observado na Missão 3                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/room`                 | 200 `{success:true}`, **sem o id**: a fixture acha o quarto pelo nome único na listagem; sem token → 401 `{errors:[...]}`                                                                      |
| `GET /api/room?checkin&checkout` | só exclui o quarto quando o período **envolve** a reserva (KI-6)                                                                                                                               |
| `POST /api/booking`              | 201 com a reserva (sem e-mail e telefone); sobreposição e checkout antes do check-in → 409 `{error}`; nomes fora do tamanho → 400 `{errors:[...]}`; check-in no dia do checkout anterior → 201 |
| `GET /api/booking?roomid=`       | sem token → 401 `{error}` (formato diferente do 401 de room)                                                                                                                                   |
| `GET /api/message/{id}`          | 500, como room e booking (KI-1 ampliado); `GET /api/message/count` é público                                                                                                                   |

**Decisões:**

- **Um quarto por teste (fixture `room`)** em vez de reservar os quartos do seed com datas aleatórias: as regras de sobreposição e disponibilidade não dependem de reservas de outros testes nem de outras pessoas (test isolation). Custo: o ambiente acumula quartos até a próxima limpeza; não dá para apagar (KI-1, e o `DELETE` foi barrado de propósito: não se apaga nada no ambiente compartilhado, nem o que se criou, enquanto a regra não for decidida).
- **Clientes devolvem a `APIResponse` crua e recebem o token opcional** (`authCookie`): o mesmo método serve ao caso autenticado e ao 401, sem um cliente "anônimo" paralelo.
- **`type` do quarto como `z.string()` na resposta** (tolerant reader): tipo novo não quebra os clientes.
- **`test.fail()` de bug cuja correção tem formato desconhecido** (KI-2, KI-4) afirma só o status, com o helper `expectStatus`: não inventamos o corpo de uma resposta que ainda não existe, nem exigimos JSON (com `expectJson`, uma correção que devolvesse um 401 vazio continuaria falhando pelo `Content-Type` e nunca seria avisada); a mensagem de falha traz URL e corpo.
- **`KNOWN_ISSUES` exportado de `tests/fixtures.ts`**, usado por todos os specs.
- **Reserva no passado aceita (201)** e reserva sem e-mail aceita: registradas aqui como achados, **sem** `test.fail()`: não há requisito escrito que as proíba, e um teste que afirma uma regra inventada não prova nada.

**RED:**

1. Teste antes do suporte: os três specs escritos antes dos clientes → `Cannot find module '...\src\api\booking-api.ts'`.
2. Uma mutação por teste (script que confere que o trecho mutado aparece **exatamente uma vez**, lição das sondas erradas anteriores), cada uma desfeita. Exemplos: sobreposição `stayAfter(stay, -2)`→`0` → `Expected: 409 Received: 201`; vizinha `stayAfter(stay)`→`-1` → `Expected: 201 Received: 409`; tipo `'Castle'`→`'Suite'` → `Expected: 400 Received: 200`; nomes `'Al'`→`'Alice'` → falta `size must be between 3 and 30`; mensagem `phone: '1'` → `Expected: 200 Received: 400` com `Body: ["Phone must be between 11 and 21 characters."]`; quarto listado `toBeGreaterThan(1000)` → `Received: 16`; listagem de mensagens `read: true` → `toContainEqual` reprova; 401s com mensagem trocada → `Received: "Authentication required"`.
3. Cada `test.fail()` trocado por `test` falha **pelo bug**: KI-1 `Expected: 200 Received: 500` (`Body: Internal Server Error`) em room, booking e message; KI-2 `Expected: 401 Received: 200` com a lista de mensagens no corpo; KI-4 `Expected: 400 Received: 409`; KI-6 `Expected value: not 21` com o quarto 21 na lista.
4. **Mutação sobrevivente virou bug:** na disponibilidade, trocar o período "livre" (`stayAfter(stay, 7)`) por um sobreposto (`-1`) **continuou verde**. Sondagem num quarto novo (reserva 10–13): o filtro só exclui 10–13 e 08–16; 11–12, 12–15 e 08–11 aparecem livres → KI-6. A mutação certa da asserção (consultar as mesmas datas) falha com `Expected value: 20`.
5. Asserção da listagem de reservas trocada para `toContainEqual` (ver Achados): mutação `depositpaid: true` → `toContainEqual` reprova; suíte com `--repeat-each=3`: 81 de 81.

**Achados:**

- **O ambiente limpa os dados de tempos em tempos, e não de forma atômica:** quartos apagados com ids reiniciados enquanto as reservas ficam (um quarto novo "herdou" 11 reservas do quarto anterior de mesmo id e derrubou `toEqual([created])`), e em outro momento reservas apagadas com o quarto mantido. Consequência: **nunca afirmar que um recurso novo está vazio**; afirmar só sobre o que o teste criou. A janela de datas foi ampliada para 10 anos para tornar improvável colidir com uma reserva herdada; os retries do CI marcam o raro caso como `flaky`.
- **Três formatos de erro** no mesmo app (`{error}`, `{errors:[]}`, array puro); cada teste declara o seu (`schemas.ts`).
- Criar reserva com e-mail gera uma mensagem "You have a new booking!" no admin, que o KI-2 expõe sem autenticação.
- O `DELETE` de sondagem foi barrado pelo modo automático do Claude Code ("Modify Shared Resources"): coerente com a regra de não apagar no ambiente compartilhado.
- Windows: `python` no Git Bash é o atalho da Microsoft Store e trava esperando interação; não usar (o projeto não precisa de Python).

**Revisor** (agente `reviewer`, diff completo): três achados, todos aplicados. (1) Os `test.fail()` do KI-2 e do KI-4 usavam `expectJson(..., z.unknown())`, que também exige JSON: uma correção com 401 vazio ou em texto continuaria falhando e nunca seria avisada. Novo helper `expectStatus` (ensinado ao `playwright/expect-expect`); RED refeito trocando por `test`: `Expected: 400 Received: 409` e `Expected: 401 Received: 200`. (2) `lists rooms matching the contract` afirmava `rooms.length > 0`, presumindo os quartos do seed, que a limpeza do ambiente pode apagar; agora usa a fixture `room` e `toContainEqual(room)` (mutação `roomPrice: 999` reprova). (3) O KI-5 apontava para a Missão 4, mas contato e admin de quartos são da Missão 5 (#6); corrigido. Suíte com `--repeat-each=3`: 81 de 81.

**Próxima missão:** 4 — E2E: fundação (#5). Os clientes de API servem para preparar dados dos testes de navegador (criar quarto e reserva pela API, verificar na UI). O KI-5 ganha o seu teste na Missão 5 (#6), com as jornadas de contato e admin.

## Extra — KNOWN_ISSUES em inglês e `npm audit` no CI (#17)

**Entregue:** `docs/KNOWN_ISSUES.md` em inglês americano, reescrito para o cliente (sem "spike" nem números de missão; nota "How they are tracked" explicando o `test.fail()`); regra de idioma ajustada; job `audit` (`npm audit`) no `needs` do `ci-passed`; `.vscode/` no `.gitignore`; [ordem de trabalho](#ordem-de-trabalho-entre-repositórios) registrada acima.

**Decisões:**

- **Regra de idioma pelo leitor, não pelo tipo de arquivo:** "documentação interna em português" classificava o `KNOWN_ISSUES.md` errado, porque ele é entregável de QA para o cliente. O critério agora é quem lê: o que vai para o cliente segue o idioma do código (inglês). Issues e PRs, que já eram em inglês, ficaram explícitos na regra.
- **Títulos `## KI-N: ...` intocados:** as anotações dos `test.fail()` apontam para as âncoras geradas a partir deles. Conferido gerando o slug de cada título e procurando cada `#ki-*` usado em `tests/`: 5 de 5 (o KI-5 ainda não tem teste).
- **"Confirme que o teste falha pelo motivo do bug antes de marcar `test.fail()`"** saiu do `KNOWN_ISSUES.md` para a regra de testes: é instrução para quem escreve teste, não informação para o cliente.
- **`npm audit` não é uma segunda fonte, ao contrário do `pip-audit`:** o `pip-audit` do UAT consulta a base PyPI/OSV, diferente da do Dependabot; o `npm audit` consulta a própria [GitHub Advisory Database](https://github.blog/security/supply-chain-security/github-advisory-database-now-powers-npm-audit/), a mesma dos alertas do Dependabot (ligados neste repo, com security updates). O valor do job é **bloquear o merge**, coisa que alerta não faz. Por isso ele **não tem `schedule`**: entre PRs, os alertas já vigiam a `main` com a mesma base (YAGNI).
- **Política igual à do UAT:** qualquer vulnerabilidade reprova (o `audit-level` padrão, `null`, sai com código diferente de zero para qualquer achado). A saída para uma vulnerabilidade transitiva é o `overrides`, nunca `npm audit fix --force` nem `continue-on-error`.
- **Sem cache e sem `npm ci` no job:** o `npm audit` lê o `package-lock.json` ([docs do npm](https://docs.npmjs.com/cli/v11/commands/npm-audit): "npm requires a package-lock or shrinkwrap"), então audita exatamente o que o `npm ci` instalaria, inclusive as dependências de desenvolvimento, que são o que este kit executa (sem `--omit=dev`).
- **`.vscode/` ignorada:** só tinha um ajuste pessoal de Python (`python.terminal.useEnvFile`), sem relação com o projeto. Configuração de editor pessoal não é configuração do projeto. Um `.vscode/extensions.json` compartilhado só entra quando houver motivo (YAGNI).

**RED:**

1. Local: sem o `override` do `minimatch` e com o lockfile regenerado (`npm install --package-lock-only`), `npm audit` sai com código 1 e `GHSA-g3hv-75wg-m249` (moderate); restaurado, `found 0 vulnerabilities`, código 0.
2. CI: commit-sonda no PR com o mesmo lockfile vulnerável, depois revertido (o lockfile voltou idêntico ao da `main`). Run 42304669865: `audit: failure` (`GHSA-g3hv-75wg-m249`, "10 moderate severity vulnerabilities", código 1) e `ci-passed: failure` com `audit: failure`; `check` e `api` verdes. O portão bloqueia o merge de ponta a ponta.

**Achado do chat:** `git revert` não aceita `-q` (a reversão não aconteceu, e o encadeamento com `&&` evitou efeito colateral). E `python` no Git Bash travou de novo (atalho da Microsoft Store, já registrado na Missão 3): não o chame.

**Revisor** (agente `reviewer`, diff completo): um achado, aplicado. No KI-5, a tradução trocou "Observado (spike)" por "Actual", apresentando ao cliente como fato atual uma observação que nenhum teste reverificou. Agora é "Actual (exploratory testing, not yet covered by a test)". Na Missão 5 (#6), o KI-5 precisa ser visto falhando de novo antes de receber o `test.fail()`.

## Missão 4 — E2E: fundação (#5)

**Entregue:** projetos `setup` e `e2e` (Chromium) no `playwright.config.ts`; Page Objects em `src/pages/` (`HomePage`, `AdminLoginPage`, `AdminRoomsPage`); fixtures de página em `tests/e2e/fixtures.ts`, estendendo as de API; `admin.setup.ts` salva a sessão de admin em `playwright/.auth/admin.json` (no `.gitignore`); 4 testes E2E (home, login válido, senha errada, sessão salva); script `test:e2e`; job `e2e` nos `needs` do `ci-passed`; `expectLoaded` ensinado ao `playwright/expect-expect`.

**Fontes consultadas:** [Authentication](https://playwright.dev/docs/auth) (projeto `setup` como dependência, `testMatch: /.*\.setup\.ts/`, `playwright/.auth` no `.gitignore`, reset com `storageState: { cookies: [], origins: [] }`); [Continuous Integration](https://playwright.dev/docs/ci) ("Caching browser binaries is not recommended, since the amount of time it takes to restore the cache is comparable to the time it takes to download the binaries").

**Sondagem da UI antes do código** (scripts descartáveis no scratchpad, lendo a árvore de acessibilidade com `ariaSnapshot`, que é o que o `getByRole` enxerga):

| Achado                                                                                                         | Consequência                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /api/auth/login` devolve o token no corpo, **sem `Set-Cookie`**; o JavaScript da página grava o `token`  | `request.storageState()` sairia vazio: o `setup` faz login **pela UI**                           |
| O botão "Logout" aparece também na tela de login                                                               | Não serve como prova de sessão                                                                   |
| Sem sessão, `/admin/rooms` mantém a URL ~300 ms (e pode desenhar o formulário "Create") antes de ir a `/admin` | `toHaveURL` e o botão "Create" dariam falso positivo                                             |
| Os links "Report", "Branding", "Messages" só aparecem com sessão válida                                        | Sinal do `expectLoaded()`, seguido do `toHaveURL`                                                |
| A página sempre tem um `alert` vazio; credencial errada → `alert` "Invalid credentials"                        | `getByRole('alert').filter({ hasText: /\S/ })`                                                   |
| A home desenha só os **3 primeiros** quartos de `GET /api/room` (`a.slice(0,3)` no bundle)                     | Quarto criado por teste nunca aparece ali: o teste lê a API e confere os 3 primeiros             |
| Cartões de quarto sem papel ARIA de agrupamento nem test id; a home mostra tipo e descrição, não o nome        | Contêiner pela classe de componente `.room-card`; dentro dele, localizadores voltados ao usuário |

**Decisões:**

- **Login do `setup` pela UI, não pela API:** a documentação indica a API quando ela é "easier/faster", e aqui não é: o login pela API exigiria montar à mão o cookie que o app grava pelo JavaScript (nome, domínio, `path`), acoplando o kit a um detalhe interno que pode mudar em silêncio. A UI custa ~2 s uma vez por execução.
- **Convidado por padrão, admin por opt-in** (`test.use({ storageState: ADMIN_SESSION })`): uma jornada de hóspede roda como hóspede (menor privilégio, realismo). O padrão da documentação (sessão para o projeto todo e reset por arquivo) inverteria isso.
- **Page Object expõe localizadores e ações; o teste afirma.** Exceção única: `expectLoaded()`, o "pronto" da página, que concentra o achado do sinal confiável num só lugar. O `expect-expect` aprendeu o nome numa lista explícita, não por padrão (`^expect`): explícito é melhor que implícito.
- **Home sem criar dados:** o teste lê `GET /api/room` na hora e confere tipo, preço e link `/reservation/{id}` dos 3 primeiros cartões, na ordem. Não presume quais quartos existem e não deixa lixo no ambiente. A descrição única que cheguei a pôr na fábrica foi desfeita (YAGNI).
- **Home mostrar só 3 quartos é achado, não KI:** na prática o hóspede não vê nem reserva o 4º quarto em diante pela home, mas não há requisito escrito (mesmo critério da Missão 3).
- **Sem cache de navegador e sem artefato no CI:** cache, pela fonte acima; artefato, porque o trace guardaria a senha digitada e o cookie de sessão (mesmo motivo do job `api`). **Missão 6:** desligar o trace não basta para publicar o relatório. O Playwright intitula o passo `Fill "<valor>"` (`Frame.fill` com `title: 'Fill "{value}"'` no `playwright-core`), então qualquer relatório que liste passos (HTML, blob, JSON) mostra a senha de admin do `setup` e do teste de login válido. Os reporters do CI hoje (`github`, `list`) não listam passos. A Missão 6 precisa resolver isso antes de publicar.

**RED:**

1. Teste antes do suporte: config, fixtures e specs escritos antes dos Page Objects → `Cannot find module '...\src\pages\admin-login-page.ts'`.
2. Premissa errada vista falhando: a primeira versão do teste da home criava um quarto e o procurava na página → `element(s) not found`; o `error-context.md` mostrou só 3 cartões, e o bundle, o `slice(0,3)`. Teste redesenhado (ver Decisões).
3. Uma mutação por teste (script que confere o trecho mutado **exatamente uma vez** e restaura), cada uma desfeita:
   - sessão salva: sem o `test.use({ storageState })` → `getByRole('navigation').getByRole('link', { name: 'Report' })` `element(s) not found`. Prova que a sessão salva é o que autentica **e** que o `expectLoaded` não é enganado pelo estado intermediário de `/admin/rooms`;
   - login válido: senha `'x'` → mesmo `element(s) not found` no link "Report";
   - senha errada: texto `'Wrong credentials'` → `Expected: "Wrong credentials" Received: "Invalid credentials"`; heading `toBeHidden` → `Received: visible`;
   - home: preço `+1` → `Expected substring: "£101 per night"` (recebido `£100`); link `roomid + 1` → `Expected pattern: /^\/reservation\/2[?]/ Received string: "/reservation/1?..."`; tipo `'Family'` → `element(s) not found`; contagem `FEATURED_ROOMS + 1` → `Expected: 4 Received: 3`.
4. Lint: os testes que só usam `expectLoaded()` reprovaram em `playwright/expect-expect` até a regra aprender o nome.
5. Estabilidade: suíte completa com `--repeat-each=3`: 94 de 94.
6. CI: commit-sonda no PR com o preço `+1` no teste da home, depois revertido. Run 42308064426: `e2e: failure` (`Expected substring: "£101 per night"`, nas 3 tentativas com os retries), `ci-passed: failure`, PR `BLOCKED`; `check`, `api` e `audit` verdes. No mesmo run, o `setup` e os outros 3 testes passaram: o login pela UI funciona no CI com os secrets.

**Achados:**

- **Sondar a UI antes de escrever o Page Object** evitou três sinais falsos de "logado" (URL, "Create", "Logout"). A amostragem a cada 100 ms tornou visível um estado intermediário que uma leitura única não mostraria.
- `\?` dentro de template literal num heredoc virou `\?` (`no-useless-escape`); `[?]` na regex é mais legível e não depende de escape.
- Para sondar fora do repositório, o script importa o `playwright-core` do projeto por URL `file:///` (ESM ignora `NODE_PATH`) e roda via `powershell.exe` com o `PATH` recarregado, porque o Git Bash não enxerga o Node.

**Revisor** (agente `reviewer`, diff completo): sem achado bloqueante; escopo da #5 cumprido. Dois achados, ambos aplicados. (1) Médio: a pendência da Missão 6 citava só o trace, mas o título do passo `fill` carrega a senha em qualquer relatório com passos, mesmo com o trace desligado (conferido no `playwright-core` instalado). Agora a pendência está completa aqui, no `ci.yml` e no `playwright.config.ts`. (2) Baixo: o teste da home lê a API antes de abrir a página, e um wipe do ambiente nessa janela o derrubaria sem bug no app. Ficou documentado no comentário do teste; a janela é de milissegundos e o retry do CI cobre, então o código não mudou.

**Próxima missão:** 5 — E2E: jornadas (#6): contato (com o KI-5 visto falhando antes do `test.fail()`), reserva (com `page.route` contornando o KI-1) e admin de quartos, reaproveitando `ADMIN_SESSION`, os Page Objects e a preparação de dados pela API.

## Missão 5 — E2E: jornadas (#6)

**Entregue:** três jornadas no navegador, cada uma conferindo o resultado também pela API. **Contato:** o hóspede envia a mensagem e ela aparece em `GET /api/message`. **Reserva:** num quarto novo, com datas aleatórias no futuro, a página confirma as datas e `GET /api/booking` guarda a reserva. **Admin de quartos:** o admin cria o quarto pelo formulário, a linha aparece na lista e `GET /api/room` guarda tipo, acessibilidade, preço e recursos. O KI-5 ganhou dois testes `test.fail()` (contato e formulário de criar quarto). Novos: `ReservationPage`, `serveRoomFromList` (`src/pages/known-issue-workarounds.ts`), `HomePage.sendMessage`, `AdminRoomsPage.createRoom/listing`. `KNOWN_ISSUES.md` (KI-1 e KI-5) e README atualizados.

**Sondagem da UI antes do código** (scripts descartáveis no scratchpad, como na Missão 4):

| Achado                                                                                                                 | Consequência                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `<label for="message">`, mas o textarea é `id="description"`                                                           | Causa exata do KI-5 no contato; o campo é achado pelo test id `ContactDescription`                                         |
| `/reservation/{id}` em branco (`GET /api/room/{id}` → 500); com o `page.route` a página desenha quarto e calendário    | Contorno do KI-1 confirmado antes de virar código                                                                          |
| As datas vêm da query string (`?checkin&checkout`) e o calendário já abre com elas selecionadas                        | Sem arrastar no calendário (seria frágil e lento)                                                                          |
| Reserva enviada → `POST /api/booking` 201 e heading "Booking Confirmed" com as datas                                   | Sinal de sucesso na UI; a API confirma que foi gravada                                                                     |
| No formulário de criar quarto, nenhum campo tem nome acessível; só o nome tem test id; tipo, acessível e preço só `id` | KI-5 no admin; os campos são achados pelo `id` (ver Decisões)                                                              |
| Linhas da lista de admin: `data-testid="roomlisting"`, uma célula `<p>` por coluna                                     | Escopo da linha pelo test id; asserção por célula exata                                                                    |
| `DELETE /api/room/{id}` continua 500 nos quartos que a sonda criou                                                     | Limpeza impossível, como a fixture `room` já documentava; nomes únicos evitam colisão                                      |
| Criar quarto com o formulário vazio → `POST /api/room` 400, **sem nenhuma mensagem na tela**                           | Achado, não KI (sem requisito escrito, mesmo critério da Missão 4); o formulário de reserva, ao contrário, mostra os erros |

**Decisões:**

- **Contorno do KI-1 explícito no spec** (`test.beforeEach` chamando `serveRoomFromList`), não escondido na fixture: quem lê o teste vê que a jornada depende de um contorno e por quê. Só a chamada quebrada é trocada, servida a partir de `GET /api/room` (dado real do app, não um quarto fabricado); o resto da página fala com o app de verdade. O bug continua acompanhado pelo teste de API com `test.fail()`, que o `page.route` não afeta.
- **Campos sem label pelo `id`** (`#type`, `#accessible`, `#roomPrice`): sem nome acessível nem test id, o `id` é estável e é o atributo que um `<label for>` corrigido apontaria. A alternativa, `getByRole('combobox').nth(n)`, quebraria em silêncio se as colunas mudassem de ordem. Registrado no JSDoc do `createRoom`.
- **UI + API em cada jornada:** a tela prova o que o usuário vê; a API prova que a ação foi gravada (o resultado, não um estado otimista da tela).
- **Asserção por célula exata na lista de admin:** a saída de uma mutação mostrou a linha como `"QA 64952506Doubletrue150WiFi, TV"`. Com `toContainText('150')`, um sufixo aleatório como `QA 1503abcd` também passaria. Trocado por `getByText(valor, { exact: true })` dentro da linha.
- **Validação da reserva fica na API** (hierarquia de testes): o formulário de reserva vazio mostra os erros do `POST /api/booking`, mas as regras já são cobertas lá. Nenhum teste E2E novo para isso (YAGNI).
- **Sem commit-sonda no CI:** o job `e2e` não mudou e o RED dele foi provado na Missão 4. Os testes novos rodam no mesmo job, e o run do PR mostra as contagens.

**RED:**

1. Teste antes do suporte: specs e fixtures escritos antes dos Page Objects → `Cannot find module '...\src\pages\reservation-page.ts'` (e `known-issue-workarounds.ts`).
2. KI-5 rodado primeiro como `test` comum, falhando **pelo motivo do bug**: `getByLabel('Message', { exact: true })` e `getByRole('textbox', { name: 'Room #' })` → `element(s) not found`, com a página carregada. Só então `test.fail()`.
3. Uma mutação por asserção (script confere o trecho **exatamente uma vez** e restaura): nome na confirmação +`x` → heading não encontrado; heading "Booking Confirmed" +`x` → não encontrado (acrescentada após o revisor); assunto → `Expected: "Another subject" Received: "Question about a room"`; datas trocadas → `Expected: "2032-02-15 - 2032-02-13" Received: "2032-02-13 - 2032-02-15"`; datas gravadas → diff do `toEqual`; **sem `serveRoomFromList`** → "Reserve Now" não encontrado (página em branco: prova que o contorno é o que viabiliza a jornada); tipo `'Suite'` e preço `'151'` na linha → não encontrados; preço gravado +1 e recursos `['Views']` → diff do `toMatchObject`.
4. Estabilidade: suíte completa (API + E2E) com `--repeat-each=3`: 109 de 109.

**Achados:**

- Uma mutação também revela fraqueza no próprio teste: a mensagem `Received string` mostrou que a asserção por substring tinha um falso positivo possível.
- Relatório (Missão 6): as jornadas novas digitam só dados de teste (hóspede, mensagem, quarto); a senha de admin continua só no `setup` e no teste de login válido. O alerta da Missão 4 sobre `Fill "<valor>"` não muda de tamanho.

**Revisor** (agente `reviewer`, diff completo): sem achado bloqueante; escopo da #6 cumprido. Quatro achados, todos aplicados. (1) Médio: o KI-1 (entregável do cliente) ainda dizia que `PUT`/`DELETE` não tinham sido sondados de novo, contradizendo o `DELETE` reverificado nesta missão; texto atualizado, e o comentário da fixture `room` deixou de dizer "no spike". (2) Baixo: a asserção do heading "Booking Confirmed" não tinha mutação (o mutante "sem contorno" falha antes, no `goto`); mutação feita e registrada no RED. (3) Baixo: o comentário do 404 no contorno dizia ser "a resposta que o app daria", sem evidência (o app responde 500); agora diz o que o código faz. (4) Baixo: o `test.fail()` do KI-5 no admin presume labels iguais aos cabeçalhos; uma correção com outros textos não seria anunciada. Premissa escrita no teste, com a instrução de conferir o formulário quando o KI-5 for dado como corrigido.

**Próxima missão:** 6 — Relatório (#7): relatório HTML no GitHub Pages (resolvendo antes a senha nos títulos de passo `Fill`), Firefox no CI e execução noturna.

## Missão 6 — Relatório (#7)

**Entregue:** relatório HTML mesclado (blobs dos jobs `api` e `e2e`), publicado pelo job `deploy` no [GitHub Pages](https://brunoccalmeida.github.io/playwright-qa-starter-kit/) a cada merge e na execução noturna (a primeira publicação só acontece depois do merge e é conferida no fechamento); projetos `chromium` e `firefox`; senha e corpos de resposta fora dos títulos de passo (`fillSecret`, regras de ESLint, `expectJson` sem mensagem no `expect`); Pages ligado em modo "GitHub Actions"; issues #21 (opção `secrets` oficial) e #22 (desvio de idioma do assistente, ver abaixo).

**O que o relatório vazava (sondas no relatório HTML decodificado, antes de publicar):**

| Vazamento                                                            | Quando               | Tratamento                                                     |
| -------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `Fill "password"` (todo método de digitação põe o valor no título)   | toda execução        | `fillSecret` (passo `Evaluate`) + regra `no-restricted-syntax` |
| 82 títulos `HTTP status of <url>\nBody: ...`, com tokens de login    | toda execução        | `expectJson`/`expectStatus` lançam `Error`: corpo só na falha  |
| `value="<senha>"` no log da asserção e `textbox "Password": <senha>` | só em falha no login | Risco documentado (README); #21 acompanha a censura oficial    |

**Decisões:**

- **Fonte + issue, sem guarda caseiro** (escolha do usuário entre três caminhos). A opção `secrets` dos reporters entrou no Playwright e foi revertida antes da 1.65 ([#43870](https://github.com/microsoft/playwright/pull/43870)); os mantenedores recomendam tratar relatórios como sensíveis, o que um Pages público não permite. Um guarda que procurasse o valor da senha não funciona aqui: a senha do demo é `password`, palavra que aparece legitimamente no relatório (`id="password"`, títulos de teste). Princípio: OWASP Logging Cheat Sheet ("authentication passwords" não se registram) e YAGNI para o guarda que a opção oficial vai substituir.
- **`fillSecret` grava pelo setter do protótipo** (`Reflect.set(HTMLInputElement.prototype, 'value', ...)`) e dispara só `input`, como o `fill`. O React sobrescreve o setter do input controlado, por isso `input.value = x` seria ignorado. Antes, `toBeEditable()` faz a checagem que o `fill` faria.
- **Mensagem do `expect` vira título do passo, mesmo passando.** Por isso o `expectJson` trocou `expect(valor, mensagem)` por `throw new Error(...)`, o padrão que o arquivo já usava para JSON inválido e contrato.
- **Um `setup` para os dois navegadores:** a sessão é um cookie, válido em qualquer navegador; um login por execução e um único `admin.json` (dois setups paralelos escreveriam o mesmo arquivo).
- **zstd no Firefox:** o `route.fetch()` do contorno do KI-1 reaproveita os cabeçalhos do navegador; o Firefox aceita zstd, que o fetch do Playwright não descomprime ([#37032](https://github.com/microsoft/playwright/issues/37032), fechada sem correção). O contorno pede só `gzip, deflate, br`.
- **CI:** blob por job com nome explícito (`PLAYWRIGHT_BLOB_OUTPUT_NAME`: o padrão não garante nomes diferentes entre jobs); `report` com `!cancelled()` (execução com falha é o relatório que mais importa), sem `--config` (o `merge-reports` carrega config vazia, então o job não recebe credenciais) e tolerando a saída 1 do `merge-reports` quando um teste falhou, mas exigindo `index.html`; `report` no `ci-passed` (relatório quebrado barra o merge); `deploy` fora do `ci-passed` (nunca roda em PR) e excluído explicitamente da sentinela; permissões `pages`/`id-token` só no `deploy`; `concurrency: pages` sem cancelar; ambiente `github-pages` só aceita a `main` (segunda camada além do `if`). Cron `23 6 * * *`: fora da hora cheia, quando o GitHub mais atrasa agendamentos; agendamentos são desligados após 60 dias sem atividade no repositório.
- **`audit` também roda à noite** (o workflow inteiro roda): repete o que os alertas do Dependabot já dizem, sem custo relevante. Revoga o "sem `schedule`" do extra #17, que era sobre o job isolado.
- **Screenshot em falha no CI:** com o trace desligado (guardaria credenciais e cookie), é a evidência visual do relatório; o campo de senha aparece como pontos.

**Fontes:** [playwright.dev/docs/test-sharding](https://playwright.dev/docs/test-sharding) (blob, `merge-reports`, `merge-multiple`), [playwright.dev/docs/test-reporters](https://playwright.dev/docs/test-reporters) (opções do blob e do HTML), [notas da 1.65](https://playwright.dev/docs/release-notes), [docs do GitHub sobre Pages com workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), issues do Playwright #36800, #38673, #43795, #43870, #37032, #43413; código do `playwright-core` 1.64.1 (`renderTitleForCall`, decodificação do fetch) e do `merge-reports` (`loadEmptyConfigForMergeReports`).

**RED:**

1. Relatório HTML de `setup` + `api`, decodificado (o HTML guarda os dados num zip em base64): `Fill "password"`, 82 títulos `HTTP status of` e tokens de login (`{"token":"<16 caracteres>"}`). Depois: zero dos três, também no relatório mesclado de api + chromium + firefox.
2. Sonda com senha distinta (`Zq9ProbeSecret`) e asserção falhando: senha no `Received:`, no log `value="..."` e no snapshot do `error-context.md`. Foi o que mostrou que a correção na fonte não basta para falhas.
3. Regra de lint nova sobre o código antigo: `admin-login-page.ts 31:11 The step title would show this secret in the report: use fillSecret`.
4. Mutações do `fillSecret`: sem nenhum evento, o `setup` falha (`element(s) not found`); sem `input` mas com `change`, o mutante sobreviveu (o React escuta os dois), por isso ficou só o `input`.
5. Mutações das mensagens do `expectJson`: 200 → 201 dá `Expected HTTP 201, received 200: .../api/auth/login Body: {...}`; Content-Type contra `application/xml` dá `Expected a JSON Content-Type, received "application/json": ...`.
6. `--project=firefox` antes do projeto: `Project(s) "firefox" not found`. Primeira execução no Firefox: `SyntaxError: Unexpected token '(', "(\xb5/\xfd X% &"...` (bytes mágicos do zstd).
7. Sentinela simulada com o `yaml` do projeto: sem `report` no `needs`, `MISMATCH`.
8. Estabilidade: chromium + firefox com `--repeat-each=3`, 55 de 55; suíte completa, 46 de 46.

**Achados:**

- **Bug do Firefox/Playwright, não do app nem do teste:** `browserContext.close: Protocol error ... "_maybeDontRestoreTabs"` uma vez em 110 execuções locais ([#43413](https://github.com/microsoft/playwright/issues/43413), fechada como _not planned_; relatos na 1.64.1 no Windows sob carga). No CI, os `retries` o marcam como _flaky_. Sem contorno; se ficar frequente, abrir issue.
- O `merge-reports` sai com 1 quando um teste mesclado falhou: sem tratar, a noite com falha nunca seria publicada.
- O relatório JSON não lista passos de ação (só `test.step`): não serve para auditar vazamento em títulos; a sonda precisa decodificar o HTML.
- **O relatório do CI embute o diff do git:** em CI, o `captureGitInfo` do Playwright vem ligado por padrão (`commit` e `diff`), e o HTML guarda o diff do PR em `metadata.gitDiff`. Num repositório público isso não expõe nada novo (o código já é público), mas qualquer segredo que entre no repositório vai junto para o relatório. Foi assim que a varredura do artefato `github-pages` do PR achou `Fill "password"` e um token: eram linhas deste resumo, que citava um token real da sonda como evidência. O token já estava inválido (`POST /api/auth/validate` → 403 `Invalid token`); saiu do resumo, e o squash usa o corpo do PR, que não o contém. A mensagem do commit `af07e8e` continua com ele nas refs do PR; sem reescrever o histórico, porque o token expirou (com token válido, o certo seria revogar primeiro). Lição: evidência de RED cita o formato do segredo, nunca o valor. Consequência para a varredura: procurar padrões no relatório do CI acusa também o diff; olhar o contexto antes de concluir.

**Revisor** (agente `reviewer`, diff completo): nada bloqueante; cinco achados, quatro aplicados. (1) Médio: se um job de teste morresse sem gravar o blob (timeout, falha no `playwright install`), o `report` mesclaria só a outra camada e o `deploy` publicaria um relatório parcial como se fosse completo. Agora o `report` exige `report-api.zip` e `report-e2e.zip` antes de mesclar; o Pages mantém o relatório anterior, que mostra a própria data. Sonda: o mesmo laço sobre uma pasta sem o blob do `e2e` sai com 1 e `::error::Missing report-e2e.zip`. (2) Baixo: a regra de lint só olhava o 1º argumento; `page.fill(seletor, senha)` passava. (3) Baixo: nada impedia a volta de ``expect(valor, `...${corpo}`)``; nova regra proíbe mensagem não constante (constante e objeto de opções, como no `expect.poll`, seguem permitidos). RED de (2) e (3): arquivo-sonda com `page.fill('#password', password)`, mensagem com template e com concatenação no `expect.soft`, aprovado pelo lint antigo (`exit 0`); com a regra nova, exatamente essas três linhas reprovam e as duas legítimas passam; `locator.fill(password)`continua barrado. (4) Baixo: os comentários de concorrência diziam que execuções da`main` nunca são canceladas e que merge e noturna podiam se sobrepor; pela [documentação do GitHub](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs), o grupo admite uma execução rodando e uma pendente, e uma nova substitui a pendente; texto corrigido. (5) Conferir o primeiro deploy real: vira passo do fechamento pós-merge; descartada só a dúvida sobre a URL, já confirmada pela API do Pages ao ligá-lo (`html_url`).

**Idioma do assistente (#22):** no meio deste chat, as mensagens ao usuário passaram para o inglês depois de longas sequências de ferramentas com conteúdo em inglês. A regra existia só como texto carregado no início da sessão (sem `settings.json` nem hooks); a #22 avalia um hook que a imponha.

**Próxima missão:** 7 — Documentação (#8): `docs/ADAPTING.md` (incluir o cuidado com relatório de cliente: conta de teste dedicada, senha aleatória, relatório privado até a #21), README em inglês e pt-BR, badges e "At a Glance", sem o aviso de "Work in progress".

## Missão 6, continuação (#7 reaberta, #25)

O PR #23 foi integrado, mas o relatório publicado mostrou defeitos da própria missão, e a #7 foi reaberta. A "Próxima missão" da seção anterior ficou para depois desta continuação.

**Achados do pós-merge do PR #23:**

- A primeira execução na `main` estourou o `timeout-minutes: 15` do job `e2e` dentro do `playwright install --with-deps`: o espelho apt (`azure.archive.ubuntu.com`) servia dezenas de KB/s (#24).
- Sem `report-e2e.zip`, o `report` recusou publicar um relatório parcial, como previsto pelo achado (1) do revisor da Missão 6: a guarda funcionou em produção.
- O primeiro deploy só veio com o rerun dos jobs falhos; nele o Firefox teve um _flaky_ em `admin-rooms.spec.ts` (#25).

**Entregue:**

1. **#25, flaky no Firefox:** `AdminRoomsPage.goto()` só retorna com a lista de quartos renderizada. Ele registra `waitForResponse` do `GET /api/room` antes da navegação e espera que o número de linhas na tela seja igual ao de quartos na resposta da própria página.
2. **Falhas esperadas legíveis:** `knownIssue('KI-n')` (`tests/known-issues.ts`) gera, a partir de um único mapa dos títulos de `docs/KNOWN_ISSUES.md`, uma anotação "Known issue" com a frase que explica a falha, o link para a entrada e a tag `@known-issue`. `KNOWN_ISSUES.md`, o README e a regra do projeto foram atualizados.

**Causa raiz do #25 (diagnóstico por hipóteses, cada uma testada com sonda):**

- Refutado: a chegada da lista reseta o estado do formulário. Com `GET /api/room` atrasado, o TV continuou marcado.
- Refutado: alguma resposta remonta o checkbox. Atrasando `auth/validate`, `message/count` ou `room`, o elemento original continuou no DOM (`isConnected`).
- Confirmado: **layout shift**. As linhas de quartos ficam acima do formulário e o empurram para baixo (o TV vai de y = 132 para y = 892 com 11 quartos). Nas coordenadas antigas fica a coluna de features de outro quarto. O `expectLoaded()` (só o link "Report") liberava o teste antes de o `GET /api/room` sequer sair. Se a lista chega entre o cálculo da posição e o clique, o clique cai numa linha de quarto, e a mensagem é `Clicking the checkbox did not change its state`.
- Por que só no CI: a falha depende de a resposta chegar nessa janela. No Windows e no container local, 20 + 60 repetições não a reproduziram, e por isso foi preciso **forçar** a condição em vez de repetir até "pegar".

**Decisões:**

- **"Pronto" = linhas na tela iguais aos quartos na resposta da própria página**, não "pelo menos uma linha" (a lista pode estar vazia no ambiente compartilhado) e não uma segunda chamada à API (outro tester pode criar um quarto no meio). Mesmo padrão do `HomePage.goto()`: `goto()` devolve a página utilizável. O `expectLoaded()` ficou só como prova de sessão (usado após o login de UI no `setup`).
- `roomList.catch(() => undefined)`: se o `expectLoaded()` falhar primeiro, a página fecha e a promessa do `waitForResponse` rejeitaria sem ninguém aguardando (rejeição não tratada). Aguardá-la depois ainda lança o próprio erro.
- **Âncora derivada do título** (regra de slug do GitHub) em vez de strings repetidas em 9 testes: uma fonte só para o nome mostrado e o link. As 6 âncoras derivadas são idênticas às antigas.
- **#24 em missão própria** (escolha do usuário): PR focado. Recomendação registrada abaixo.

**Fontes:** [playwright.dev/docs/api/class-test#test-fail](https://playwright.dev/docs/api/class-test#test-fail) (formas do `test.fail`; a com título não aceita `description`, por isso o relatório mostrava um `fail` solto); [playwright.dev/docs/test-annotations](https://playwright.dev/docs/test-annotations) (o HTML mostra anotações, menos as de `type` iniciado por `_`); [playwright.dev/docs/ci](https://playwright.dev/docs/ci) "Via Containers" e [playwright.dev/docs/docker](https://playwright.dev/docs/docker) (para a #24). Como o relatório exibe uma falha esperada não está documentado: foi visto num relatório local com screenshot.

**RED:**

1. #25: sonda temporária com `GET /api/room` atrasado 3 s (`route.continue` após a espera), lendo a contagem de linhas uma vez logo após `goto()` + `expectLoaded()`: `Expected: 11, Received: 0` no Chromium e no Firefox. Com a correção, 3 de 3.
2. `knownIssue`: `auth.spec.ts` passou a usá-lo antes de ele existir; `tsc`: `TS2724: '"../fixtures.ts"' has no exported member named 'knownIssue'`.

**Validação:** container `mcr.microsoft.com/playwright:v1.64.1-noble` (`--ipc=host --cpus=2`, `CI=true`), E2E completo em Chromium + Firefox, `--repeat-each=5 --retries=0 --workers=2`: 91 de 91. `--grep @known-issue` em api, chromium e firefox: 12 de 12 (setup + as 11 falhas esperadas). No relatório local, a busca `@known-issue` lista exatamente as 7 da API.

**Achados:**

- **Reproduzir no Linux sem CI:** a imagem oficial (já com o Node 26.13.0 do `.node-version`) roda a suíte com o código copiado por `git ls-files | tar` e `npm ci` dentro do container. Serve para qualquer falha "só no CI".
- Na primeira execução no container, o `setup` falhou uma vez com a página ainda em "Loading..." após 5 s (a API respondia em ~0,4 s) e não se repetiu nas 3 execuções seguintes. Fica só registrado; se reaparecer no CI, vira issue.
- Nas sondas, `route.fetch()` + `route.fulfill()` com atraso deixou o Firefox sem renderizar a lista de quartos. Com `route.continue()` após a espera, os dois navegadores funcionaram. Para atrasar uma resposta numa sonda, prefira `continue`.
- O comentário com a recomendação na #24 foi barrado pela permissão de escrita externa. A recomendação: job `e2e` no container oficial, com a tag derivada do `package-lock.json` por um job anterior (`container.image: ...:v${{ needs.<job>.outputs.version }}-noble`; o contexto `needs` é permitido em `jobs.<id>.container`), acoplando imagem e `@playwright/test` por construção. Conferir antes, na documentação do GitHub, os contextos de `container` e se o `setup-node` ainda é necessário.

**Próxima missão:** #24 (container no job `e2e`); depois 7 — Documentação (#8).

**Revisor** (agente `reviewer`, diff completo): nada bloqueante; três achados baixos, dois aplicados.

1. Descartado: "conferir se o RED está nas mensagens de commit". O revisor não tinha `git` para ler os corpos; os commits do #25 e do `knownIssue` trazem comando e erro. Procedia a observação de que o comportamento no relatório só tinha sido validado por observação, o que o achado 2 cobre em parte.
2. Aplicado: o mapa de `tests/known-issues.ts` podia divergir dos cabeçalhos de `docs/KNOWN_ISSUES.md` em silêncio, porque o GitHub não reclama de âncora inexistente. A sentinela `scripts/check-known-issues.ts` (`npm run check:known-issues`, dentro do `check`) compara os dois lados. RED: antes do export, `does not provide an export named 'knownIssueTitles'`; mutação do cabeçalho do KI-4 para "returns HTTP 409": saída 1, com os dois lados da divergência listados; desfeita, saída 0.
3. Aplicado: o README dizia que o `expectLoaded()` espera a página pronta; agora diz que é o `goto()`, e que o `expectLoaded()` prova a sessão.

## Extra — travas do agente de IA (#30)

**Entregue:** `.claude/settings.json` (configuração de projeto, versionada) com `permissions.deny` para `gh pr merge --admin`, force push (`--force*`, `-f`, refspec `+`), push na `main` (`main`, `:main`, `:refs/heads/main`) e leitura/escrita de `.env` e `.env.*` (exceto `.env.example`). Item novo em "Dependências e segurança" das regras.

**Decisões:**

- **`permissions.deny` em vez de hook `PreToolUse`:** é o mecanismo declarativo documentado, sem código para manter e testar. A documentação avisa que uma regra de Bash "isn't a security boundary around the program": `git -C . push --force` ou `bash -c '...'` escapam. Isso é aceitável aqui porque a fronteira real já existe no servidor: o ruleset `Protect main` (sem bypass) recusa force push, push direto e merge sem `ci-passed`, inclusive com `--admin`. As travas locais são defesa em profundidade, para o agente errar cedo e com uma mensagem clara.
- **Regras em dobro (`Bash(...)` e `PowerShell(...)`):** no Windows o agente tem as duas ferramentas, e regras de Bash não valem para o PowerShell.
- **`.env` por regras `Read`/`Edit`, sem sandbox:** a sandbox (fronteira no nível do sistema operacional) não roda no Windows nativo, só no WSL2. As regras `Read`/`Edit` cobrem as ferramentas de arquivo, comandos reconhecidos (`cat`, `Get-Content`) e redirecionamentos (`>>`). Não cobrem processos que abrem o arquivo por conta própria, e é isso que mantém o `loadEnvFile` dos testes funcionando.
- **Nomes sem caminho (`Read(.env)`):** seguem o gitignore e valem em qualquer profundidade; `Read(!.env.example)` libera o modelo, que não tem segredo.
- **Merge comum continua permitido:** o `/ship-pr` usa `gh pr merge --auto`; negar `gh pr merge` inteiro quebraria o fluxo.
- **README sem mudança:** ele ainda não descreve a configuração do agente; isso entra na Missão 7 (#8).

**Fontes:** [Configure permissions](https://code.claude.com/docs/en/permissions) (sintaxe de wildcard; "What a Bash rule doesn't match"; regras `Read`/`Edit` em `cat`, `head`, redirecionamentos; seção PowerShell; precedência deny > hook) e [Sandboxing](https://code.claude.com/docs/en/sandboxing) ("On native Windows, Claude Code runs commands unsandboxed").

**RED** (sondas inofensivas: `--dry-run`, PR inexistente 99999, só a contagem de bytes do `.env`, arquivo descartável `.env.probe`):

1. Sem o arquivo, todas executaram: `cat .env | wc -c` → 312; `gh pr merge 99999 --admin` → `Could not resolve to a PullRequest` (o comando rodou); `git push --dry-run --force ...` → `[new branch]`; `git push --dry-run origin HEAD:main` → `Everything up-to-date`; `Get-Content .env` no PowerShell → 303; Grep no `.env` → 3 ocorrências.
2. Com o arquivo, **uma sonda por regra**, cada uma montada para casar com um só padrão, todas negadas ("Permission to use Bash/PowerShell with command ... has been denied"), nos dois shells:

   | Regra                        | Sonda                                                                |
   | ---------------------------- | -------------------------------------------------------------------- |
   | `gh pr merge *--admin*`      | `gh pr merge 99999 --admin`                                          |
   | `git push *--force*`         | `git push --dry-run --force origin HEAD:refs/heads/x`                |
   | `git push -f*`               | `git push -f --dry-run origin HEAD:refs/heads/x`                     |
   | `git push * -f*`             | `git push --dry-run -f origin HEAD:refs/heads/x`                     |
   | `git push * +*`              | `git push --dry-run origin +HEAD:refs/heads/x`                       |
   | `git push * main`            | `git push --dry-run origin main`                                     |
   | `git push * main *`          | `git push origin main --dry-run`                                     |
   | `git push *:main`            | `git push --dry-run origin HEAD:main`                                |
   | `git push *:main *`          | `git push origin HEAD:main --dry-run`                                |
   | `git push * refs/heads/main` | `git push --dry-run origin refs/heads/main`                          |
   | `... refs/heads/main *`      | `git push origin refs/heads/main --dry-run`                          |
   | `git push *:refs/heads/main` | `git push --dry-run origin HEAD:refs/heads/main`                     |
   | `... :refs/heads/main *`     | `git push origin HEAD:refs/heads/main --dry-run`                     |
   | `Read(.env)`                 | ferramentas Read e Grep, `cat`, `Get-Content`, `gc`, `Select-String` |
   | `Read(.env.*)`               | ferramenta Read em `.env.local`                                      |
   | `Edit(.env)`                 | ferramenta Edit, `printf '' >> .env`                                 |
   | `Edit(.env.*)`               | ferramenta Write em `.env.probe`                                     |

3. Controles, que precisam passar: `gh pr merge 99999 --auto --squash` (o `/ship-pr`), push normal, `--follow-tags` e branch `security/main-x` em dry-run, Read e `Get-Content` do `.env.example` (`Read(!.env.example)`), `printf '' >> .env.example` (`Edit(!.env.example)`), `npm run check` e os testes de login da API (leem o `.env`).
4. As regras `*:main *` e as de `refs/heads/main` vieram do revisor: um padrão sem `*` no fim exige que o comando termine ali (documentação: `Bash(npm run build)` não casa `npm run build --watch`). Mutação: a remoção da linha pelo agente foi **barrada pelo classificador do modo automático** (remover uma trava); o usuário a removeu à mão e `git push origin HEAD:main --dry-run` **executou** (`dcba984..22fcc83  HEAD -> main`, nada enviado: `git ls-remote` confirmou a `main` em `dcba984`); com a linha de volta, negado.

**Limites conhecidos** (texto não resolve; quem barra é o ruleset da `main`): `git push` sem refspec estando na `main`; `git -C . push`, `/usr/bin/git`, `bash -c '...'`; flags curtas combinadas (`-uf`); processos que leem o `.env` sem nomeá-lo (Node, `grep -r .`).

**Achado:** logo após salvar o `settings.json`, a primeira sonda ainda usou a configuração antiga (passou com a regra já recolocada); a seguinte foi negada. O Claude Code recarrega o arquivo com atraso: depois de mudar uma regra, repita a sonda antes de concluir que ela não funciona.

**Achado:** o `Get-Content .env` barrado no PowerShell veio com a mensagem "may only access files in the allowed working directories", que sugeria um bloqueio por diferença de maiúscula no caminho (`c:` × `C:`), e não pela regra. A sonda de controle (`.env.example` no mesmo shell passou) mostrou que a regra é que barrava. Bloqueio pelo motivo errado não prova a regra; a sonda de controle é o que separa as duas hipóteses.

**Revisor** (agente `reviewer`, diff completo): cinco achados, todos procedentes. (1) `*:main` só casava com o refspec no fim: entraram as variantes com ` *` e `refs/heads/main` solto; (2) as sondas eram por amostragem: refeitas uma por regra (tabela acima); (3) e (4) lacunas que o texto não resolve: viraram "Limites conhecidos", e a frase da regra deixou de sugerir cobertura total; (5) o RED foi para o corpo do commit.

**Irmã:** brunoccalmeida/uat-automation-framework#146. Esta missão é a fonte; após o merge, comentar lá com o link do PR.

**Próxima missão:** #31 (gitleaks e zizmor, a outra P1 de segurança).

## Extra — gitleaks e zizmor no CI (#31)

**Entregue:** dois jobs novos no `ci.yml`, ambos nos `needs` do `ci-passed`: `secret-scan` (gitleaks 8.30.1 no histórico inteiro do commit testado) e `workflow-audit` (zizmor 1.32.0 via `zizmor-action` 0.8.1). README com a política de triagem; issue #37 (Betterleaks v2).

**Decisões:**

- **gitleaks, não Betterleaks (por ora):** o README do gitleaks o declara _feature complete_ (só correções de segurança) e os mantenedores migraram para o Betterleaks (MIT). Mas o Betterleaks v1 está em manutenção e o v2 é _release candidate_ com guia de migração (CLI, config, relatório): adotar agora seria migrar duas vezes. A #37 reavalia com o v2 estável.
- **Binário oficial, sem `gitleaks-action`:** a licença da action é proprietária e exige chave paga para organizações, que é onde o kit vai ser usado. O job baixa a release e confere o SHA-256 fixado no workflow (do `checksums.txt` da release); verificação contra o arquivo baixado da mesma origem não protegeria nada, o hash no repositório sim.
- **Histórico do commit testado (`fetch-depth: 0`, `--log-opts=HEAD`):** num PR, a head é o merge commit, então a varredura vê exatamente o que a `main` passaria a conter, incluindo commits que adicionaram e apagaram um segredo. Sem `--log-opts`, o gitleaks roda `git log --all` (visto no log de depuração), e com `fetch-depth: 0` um segredo em qualquer outra branch reprovaria todos os PRs e a execução noturna (achado do revisor). As outras branches ficam com o secret scanning nativo do GitHub (ligado neste repositório, com push protection), que vigia todas as refs para tokens de provedores conhecidos; o gitleaks soma os padrões genéricos, que o GitHub não cobre aqui (`non_provider_patterns` desligado). O clone raso padrão (1 commit) não veria o segredo apagado. `--redact`: o log do run é público.
- **`advanced-security: false` no zizmor:** com `true`, os achados vão em SARIF para o code scanning e o job sempre passa (documentação: em modo SARIF "zizmor will always exit with code 0"), invisível para o `ci-passed`. Com `false`, achado reprova o job (saída 11–14) e `annotations: true` marca a linha no PR.
- **Persona `regular`** (a padrão, feita para CI). As outras, rodadas localmente: `pedantic` só pede `name:` em 7 definições e um comentário na permissão do `deploy`; `auditor` aponta `secrets-outside-env` nas 4 referências às credenciais de teste. São credenciais públicas do app de demonstração: um GitHub Environment só para elas é cerimônia sem ganho. Para cliente com credencial real, vale reavaliar.
- **SHA obrigatório sem arquivo de config:** desde o zizmor 1.20, a política padrão do `unpinned-uses` exige SHA para todas as actions, inclusive `actions/*`; com a versão fixada, o padrão não muda sem um commit. Um `zizmor.yml` repetindo o padrão seria redundante (YAGNI).
- **Versões fixadas à mão:** `version: 1.32.0` (o padrão do input é `latest`, que deixaria uma release nova do zizmor reprovar um PR que não mudou nada) e a release do gitleaks. O Dependabot atualiza a action do zizmor, não esses valores; atualizar à mão (registrado no README e nos comentários do workflow).
- **Triagem:** o histórico completo de todas as branches (`--log-opts=--all`, 25 commits, mais do que o CI passa a varrer) não tem vazamento, então não há `.gitleaksignore`. Falso positivo futuro: `gitleaks:allow` na linha ou fingerprint no `.gitleaksignore`; segredo real: revogar primeiro, depois remover. Achado do zizmor só se ignora na linha, com motivo.

**Fontes:** [docs.zizmor.sh/usage](https://docs.zizmor.sh/usage/) (códigos de saída, `# zizmor: ignore[...]`), [docs.zizmor.sh/audits](https://docs.zizmor.sh/audits/) (`unpinned-uses`, política padrão desde a 1.20), [docs.zizmor.sh/integrations](https://docs.zizmor.sh/integrations/), [zizmor-action](https://github.com/zizmorcore/zizmor-action) (inputs), [gitleaks](https://github.com/gitleaks/gitleaks) (`gitleaks git`, `--redact`, códigos de saída, ignorar achados, aviso de _feature complete_), [gitleaks-action](https://github.com/gitleaks/gitleaks-action) (licença para organizações), [Betterleaks](https://github.com/betterleaks/betterleaks) (v1 × v2).

**RED:**

1. Local, gitleaks num repositório descartável com uma `apiKey` de alta entropia commitada e apagada no commit seguinte: `leaks found: 1`, saída 1.
2. Local, zizmor numa cópia do `ci.yml` com `actions/checkout@v7`: `error[unpinned-uses] ... action is not pinned to a hash (required by blanket policy)`, 1 high, saída 14. Sem a mutação, `No findings to report`.
3. CI, PR descartável (#36, fechado sem merge, branch apagada), uma sonda por vez:
   - Run 42377703515, `actions/checkout@v7`: `workflow-audit: failure` (`ci.yml:33: unpinned action reference`, saída 14), `ci-passed: failure`, PR `BLOCKED`; os demais jobs, `secret-scan` inclusive, verdes.
   - Run 42377881287, segredo falso commitado e apagado no commit seguinte (árvore da head idêntica à da branch da missão): `secret-scan: failure` (`RuleID: generic-api-key`, `File: src/probe-leak.ts`, no commit que já tinha sido apagado; `Secret: REDACTED`; 22 commits), `ci-passed: failure`; `workflow-audit` verde.
4. Escopo (depois do revisor), repositório descartável com uma branch `pr` (segredo adicionado e apagado), uma `other` (outro segredo) e a `main` limpa: com `--log-opts=HEAD` na `main`, `no leaks found`, saída 0; com o padrão (`--all`), `leaks found: 2`, saída 1 (o defeito); no merge commit de `pr` na `main` (árvore só com `a.txt`), `--log-opts=HEAD` dá `leaks found: 1`, saída 1. Os runs de CI acima são do escopo antigo; o segredo da sonda estava no histórico da própria head, então a conclusão deles vale para os dois escopos.
5. A sentinela de `needs` do `ci-passed` passou com os dois jobs novos incluídos (sem eles, ela já reprova, provado na Missão 1).

**Achados:**

- **Por que a sonda do gitleaks não podia ser commit + revert no PR da missão:** o revert apaga o segredo da árvore, mas não do histórico; o job varre o histórico, então a branch ficaria vermelha até reescrevê-la (force push, barrado pelas travas do agente). É a demonstração do próprio portão: segredo commitado continua vazado depois de apagado. Daí o PR descartável.
- Os commits da sonda continuam acessíveis em `refs/pull/36/head` (o GitHub guarda refs de PR fechado). O segredo é falso; com um real, só a revogação resolveria, como no achado do token da Missão 6.
- `git revert -q` não existe; o `&&` parou a sequência, mas um `;` seguinte deixou o push sair com as duas sondas ativas. Corrigido com um revert antes do run terminar (o novo push cancelou o anterior). Mesma lição da Missão 1: conferir `git diff <branch> --stat` antes de ler o resultado de uma sonda.
- O workflow já passava limpo no zizmor (persona `regular`): as convenções da Missão 1 (SHA, `persist-credentials: false`, permissões mínimas) estavam certas; agora são impostas.

**Revisor** (agente `reviewer`, diff completo): dois achados, ambos aplicados. (1) Médio: o comentário do workflow, o README e este resumo diziam que a varredura cobria só o histórico do commit testado, mas o padrão do `gitleaks git` é `--all`; confirmado no log de depuração (`git log -p -U0 --full-history --all`, 20 commits contra 14 da `HEAD`) e corrigido com `--log-opts=HEAD` (RED 4). O RED original provou que o portão reprova, não o escopo. (2) Baixo: a triagem local usou um escopo maior que o do CI sem dizer; agora explícito.

**Irmã:** brunoccalmeida/uat-automation-framework#147. Esta missão é a fonte; após o merge, comentar lá com o link do PR.

**Próxima missão:** #24 (container oficial do Playwright no job `e2e`); depois 7 — Documentação (#8).

## Extra — job `e2e` no container oficial do Playwright (#24)

**Entregue:** o job `e2e` roda em `mcr.microsoft.com/playwright:v1.64.1-noble@sha256:…` e não tem mais o passo `playwright install --with-deps`; `merge.config.ts` para o `report` mesclar blobs do host e do container; sentinela `scripts/check-playwright-image.ts` (`npm run check:playwright-image`, dentro do `check`); README com a política de atualização da imagem; label `blocked` na #37.

**Decisões:**

- **Container, não `timeout-minutes` no passo nem retry** (opções 2 e 3 da issue): os dois só mudam _como_ o job falha quando o espelho `apt` fica lento; o container tira o `apt` do caminho. A imagem traz navegadores e bibliotecas do sistema; o pull vem do MCR, não do espelho do Ubuntu.
- **`setup-node` continua:** a imagem traz Node 24 (`ARG NODE_VERSION=24` no `Dockerfile.noble` da v1.64.1) e o projeto exige 26 (`.node-version`, `engines`, scripts `.ts` com _type stripping_). Fonte única do Node continua sendo o `.node-version`.
- **`--user 1001 --ipc=host --init`:** `--user 1001` é o exemplo de playwright.dev/docs/ci (o usuário do runner, dono do workspace montado; a imagem usa root por padrão); `--ipc=host` e `--init` são recomendações de playwright.dev/docs/docker (memória compartilhada do Chromium; processos zumbis no PID 1).
- **Tag + digest**, como as actions fixadas por SHA: tag pode ser republicada, digest não. A persona `regular` do zizmor (`unpinned-images`) aceita tag; a `pedantic` exige digest. Digest do índice multi-arquitetura, lido do cabeçalho `Docker-Content-Digest` do registro (o comando está no comentário do job). Se alguém subir a tag sem o digest, o Docker baixa a imagem antiga e o job falha alto, não em silêncio.
- **Sentinela, não tag derivada do lockfile em tempo de execução:** derivar eliminaria a manutenção, mas exige um job a mais antes do `e2e` e impede fixar digest. A sentinela compara a tag com o `@playwright/test` do `package-lock.json` (não do `node_modules`, que pode estar velho localmente), exige digest e **falha fechada** quando não acha nenhuma imagem (nome de registro errado não pode virar verde). O Dependabot não atualiza a imagem: o PR dele que sobe o Playwright fica vermelho até a tag e o digest serem atualizados **no mesmo PR** (diferente da sentinela do TypeScript, aqui a correção é parte da atualização).
- **Helpers duplicados** (`readFile`/`parseFile`, iguais aos de `check-dependency-ignores.ts`): segunda cópia; pela regra de três, extrair só no terceiro uso.

**Fontes:** [playwright.dev/docs/ci](https://playwright.dev/docs/ci) ("Via Containers", `--user 1001`), [playwright.dev/docs/docker](https://playwright.dev/docs/docker) (formato da tag, fixar versão, "unable to locate browser executables" com versões divergentes, `--ipc=host`, `--init`, root desliga o sandbox do Chromium), [Dockerfile.noble v1.64.1](https://github.com/microsoft/playwright/blob/v1.64.1/utils/docker/Dockerfile.noble) (Node 24), [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) (`container`, `--network`/`--entrypoint` não suportados), [docs.zizmor.sh/audits](https://docs.zizmor.sh/audits/) (`unpinned-images`).

**RED:**

1. Local, sentinela antes do container: `npm run check:playwright-image` saiu com 1, `No mcr.microsoft.com/playwright image found in .github/workflows: nothing to compare.`
2. Mutações locais (desfeitas), todas com saída 1: tag `v1.63.0` (`image v1.63.0, @playwright/test 1.64.1`); digest removido e referência só por digest (`is not mcr.microsoft.com/playwright:v<version>-<codename>@sha256:<digest>`); lockfile em 1.65.0 com o `node_modules` ainda em 1.64.1 (prova que a fonte é o lockfile).
3. CI, primeiro run do PR (42379897049): `e2e` verde no container, mas o `report` reprovou: `Blob reports being merged were recorded with different test directories, and merging cannot proceed`. Correção: `merge.config.ts` só com `testDir` (exemplo de playwright.dev/docs/test-sharding). Run seguinte (42380136406) todo verde, `e2e` com 19 testes passando em 69 s.
4. CI, sonda do caminho quebrado (run 42380308119, commit revertido em seguida; árvore final idêntica à do run verde): tag `v1.64.1` com o digest da `v1.63.0`, o único erro que a sentinela não vê. `check` verde, `e2e` vermelho em 43 s com `browserType.launch: Executable doesn't exist at /ms-playwright/chromium_headless_shell-1248/...`, `ci-passed` vermelho.

**Achados:**

- **O container muda o caminho do workspace** (`/__w/...` no container, `/home/runner/work/...` no host) e os blobs gravam o `testDir` absoluto. Só apareceu porque o `report` roda também em PR (decisão da Missão 6): na `main`, teria derrubado a publicação. O `merge.config.ts` não importa o `playwright.config.ts`, que valida credenciais ao carregar.
- **A dica do Playwright engana no container:** a falha da sonda diz "Looks like Playwright was just updated… run `npx playwright install`". Com imagem, a correção é atualizar tag e digest no workflow (comando no comentário do job), nunca instalar navegadores no job.
- **Tempo:** o `e2e` levava 67–78 s com espelho saudável e 15 min (timeout) no dia ruim; no container, 69–75 s. O ganho não é velocidade, é não depender do espelho `apt`.

**Revisor** (agente `reviewer`, diff completo antes do PR): quatro achados, todos aplicados. (1) Médio: faltava o RED do container, e a afirmação "subir só a tag faz o job falhar alto" era inferência; virou a sonda 4, desenhada para o caso que a sentinela não vê. (2) Baixo: comentário do `report` ainda citava "failed browser install". (3) Baixo: a sentinela lia o `node_modules`; agora lê o lockfile. (4) Baixo: referência só por digest escapava do filtro; agora reprova no formato. `services:` e `docker://` ficam fora (o projeto não usa; YAGNI), dito no comentário.

**Próxima missão:** 7 — Documentação (#8).

## Missão 7 — Documentação (#8)

**Entregue:** `docs/ADAPTING.md` (em inglês: guia passo a passo para levar o kit ao app de um novo cliente); `README.md` com badges, "At a Glance" e seção de reaproveitamento, sem o aviso de "Work in progress"; `README.pt-BR.md` com link cruzado; `tests/known-issues.ts` e `scripts/check-known-issues.ts` aceitam o mapa de known issues vazio.

**Decisões:**

- **Repositório novo, não fork:** "Public repository forks are public" e "You cannot change the visibility of a fork by itself". O guia clona, apaga o `.git` e cria o repositório. O caminho "Use this template" exigiria ligar o `is_template` neste repositório (hoje `false`), e não muda o resultado: um único commit inicial.
- **O guia não assume relatório público:** publicar no Pages de forma restrita exige GitHub Enterprise Cloud; fora disso, o relatório é legível por quem tiver a URL. O guia oferece os dois caminhos (publicar, ou apagar o `deploy` e baixar o artefato `github-pages`, que expira em 1 dia pelo padrão da `upload-pages-artifact`).
- **Pages configurado pela interface no guia, não por `gh api`:** a documentação da API não diz se `source` é dispensável com `build_type=workflow`; o guia só traz o comando que pôde ser conferido.
- **Corrigir o kit, não contornar no guia:** o mapa de known issues vazio reprovava o lint; um KI de enfeite faria o guia funcionar deixando dado falso num entregável do cliente.
- **Contagens no "At a Glance", sem sentinela:** seguem o padrão do `uat-automation-framework` e ajudam quem avalia o kit, mas envelhecem (YAGNI: atualizar à mão ao mudar o número de testes). O relatório publicado é a fonte da verdade. Medido com `playwright test --list`: 27 API, 9 E2E por navegador + `setup`, 46 no total. O mesmo vale para manter o README em inglês e o em português alinhados.
- **Badge da versão do Playwright dinâmico** (shields lendo o `package.json`), porque um valor fixo envelheceria a cada PR do Dependabot.

**Fontes:** [visibilidade de forks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-permissions-and-visibility-of-forks), [repositório a partir de template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template), [planos do GitHub](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), [visibilidade do site do Pages](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site), [secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning), [badge de workflow](https://docs.github.com/en/actions/how-tos/monitor-workflows/add-a-status-badge), [API de rulesets](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset), `action.yml` da `upload-pages-artifact` (retenção padrão).

**RED** (ensaio do guia numa cópia descartável no scratchpad, clonada do GitHub):

1. Passo 2, sem variáveis: `npx playwright test --list` → `Invalid environment configuration` nomeando `BASE_URL`, `ADMIN_USERNAME` e `ADMIN_PASSWORD`.
2. Passo 4, depois de apagar o app de exemplo: `npx tsc` listou os imports quebrados de `tests/fixtures.ts`, `tests/e2e/fixtures.ts` e `src/pages/admin-rooms-page.ts`, que viraram a tabela de edições do guia.
3. Mapa de known issues vazio, antes da correção: `npm run check` reprovado no ESLint com 3 erros de `restrict-template-expressions` (`never` em `tests/known-issues.ts`, `unknown` em `scripts/check-known-issues.ts`). Depois da correção: saída 0.
4. Estado final do ensaio: `npm run check` saída 0; 6 testes de API e 5 de E2E (setup + 2 por navegador) passando contra o app real.
5. Sentinela: KI só no mapa → `tests/known-issues.ts and docs/KNOWN_ISSUES.md disagree`, saída 1.
6. Renomear o pacote: `npm install --package-lock-only` atualiza o lockfile e `npm ci` continua passando.
7. Links: script no scratchpad resolveu os 68 links relativos e âncoras dos três documentos (0 quebrados), e todos os externos responderam 200, incluindo os quatro badges.

**Não ensaiado** (exige um repositório novo no GitHub; pendência registrada em issue própria): o `gh repo create --push` do passo 2, o passo 6 (secrets, merge settings, ruleset, caminho "Keep the report private") e o passo 7 inteiro, inclusive o PR bloqueado. O JSON do ruleset foi escrito a partir do `GET` do ruleset real e dos campos obrigatórios da API, mas não foi executado.

**Revisor** (agente `reviewer`, diff completo): sete achados, todos aplicados. (1) Alto: o passo 2 publicava o workflow ainda apontando para o demo; depois do passo 6, a execução noturna enviaria as credenciais do cliente a um site de terceiros. O `BASE_URL` agora muda antes do primeiro commit. (2) Médio: "one manual step" ignorava as versões do gitleaks e do zizmor. (3) Médio: a Missão extra das travas adiou para cá a descrição da configuração do agente; entrou nos dois READMEs. (4) Baixo: faltava criar a branch antes de os commits do passo 3 esbarrarem no ruleset. (5) Baixo: a regra dos 60 dias vale só para repositório público (confirmado em "Events that trigger workflows"); o comentário do `ci.yml` continua certo, porque este repositório é público. (6) Baixo: o `admin-login.spec.ts` ficava fora do passo 5. (7) Baixo: a nota "Não ensaiado" subdeclarava. Descartada só a dúvida sobre os badges: o conteúdo renderizado foi lido (`@playwright/test: 1.64.1`, `CI - passing`), não apenas o status 200.

**Achados:**

- O PowerShell 5.1 corrompe as aspas duplas de um `--jq` passado ao `gh`; o Bash preserva.
- O kit tem dois pontos amarrados ao demo que nenhum portão vê num clone: a URL de `tests/known-issues.ts` e o `BASE_URL` duplicado no workflow. O `grep` do passo 3 os encontra.

**Próxima missão:** #29 (política escrita de testes flaky).

## Extra — 409 intermitente na primeira reserva (#42)

**Entregue:** fixture `createBooking` e `src/api/create-booking.ts`: reserva recusada informa status, corpo, quarto, datas pedidas e as reservas do quarto naquele momento (só id e datas). Teste novo fixa a mensagem e a ausência de nome, e-mail e token. Seção "Test environment limit" no `docs/KNOWN_ISSUES.md`. Issue #43 aberta.

**Levantamento** (scripts no scratchpad, pela API de jobs, que alcança tentativas que terminaram verdes):

- 49 runs, 51 tentativas, 74 jobs `api` e `e2e`, nenhum log indisponível (histórico inteiro do repositório, de 05 a 08/11/2026; a retenção é de 90 dias).
- O erro aparece em **3 das 36 tentativas** do job `api` que rodaram testes de reserva: 42301533569 (06/11 22:02), 42304669865 (06/11 22:26) e 42505286187 (08/11 17:30). A issue conhecia só a última.
- Nos três casos falharam **os mesmos dois testes**, os primeiros da execução a criar quarto e reserva, durante 3 a 5 s; a reserva seguinte funcionou. Só no terceiro os retries se esgotaram.

**Hipóteses:**

| Hipótese                                      | Situação                               | Evidência                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disputa no backend com 409 genérico           | **Descartada**                         | O `route.ts` do [código público](https://github.com/mwinteringham/restful-booker-platform) repassa o status do serviço Java; falha interna seria 500. O `BookingService` só devolve CONFLICT para data inválida ou conflito no banco. Ressalva: é o código do repositório, e o implantado pode diferir      |
| Partida a frio por ociosidade dos nossos runs | **Enfraquecida**                       | Os maiores intervalos (672 e 1403 min) passaram sem falha; outros testers também aquecem o ambiente                                                                                                                                                                                                         |
| Reserva herdada pelo id reiniciado do quarto  | **Em aberto, com evidência contrária** | A favor: um `DatabaseScheduler` por serviço; `seedDB` reinicia os ids e as reservas ficam. Contra: cada retry usou quarto novo e datas novas, sorteadas em 9 anos, e uma reserva herdada não some em 3 a 5 s. Nenhuma foi capturada: a sonda de leitura (17:57) achou o ambiente recém-limpo, só com o seed |

**Em aberto:** a causa exata. A issue aceita esse desfecho; a próxima ocorrência já registra o estado do quarto. **Ao ver a mensagem nova num run:** uma reserva cobrindo as datas sustenta a herança; lista vazia não decide, porque o quarto é lido depois da recusa e um reset pode ocorrer entre as duas chamadas.

**Decisões:**

- **Fixture em vez de método no `BookingApi`:** os clientes devolvem a `APIResponse` crua e o teste decide o que afirmar (Missão 2). `createBooking` serve só a quem _precisa_ que a reserva exista; quem testa a recusa continua com `bookingApi.create`.
- **Sem custo no caminho feliz:** a listagem só roda na falha, e o `adminToken` já é criado pela fixture `room`.
- **Só id e datas das reservas:** elas podem ser de outras pessoas e o relatório é público (minimização de dados).
- **O diagnóstico nunca falha:** perder o detalhe não pode substituir a recusa original.
- **Sem correção no teste:** mudar datas ou quartos sem causa provada seria chute (regra de diagnóstico).

**RED:**

1. Teste antes do suporte: specs escritos antes da fixture → `Test has unknown parameter "createBooking".`
2. Ponta a ponta (mutação em `accepts a check-in`, `stayAfter(stay, -1)`): 409 real com `Requested: room 25, 2034-05-30 to 2034-06-01` e `Bookings of room 25 now (1): #20: 2034-05-29 to 2034-05-31`.
3. Uma mutação por asserção do teste novo, todas reprovadas: texto do status; linha `Requested`; listagem vazia; sobrenome na listagem; sobrenome, e-mail e token na mensagem.
4. Token no erro: requisição a uma porta fechada com cookie falso → `Cookie: token=FAKE-SENTINEL-VALUE` no call log. Por isso a captura descarta o erro.
5. `catch` da listagem (teste `keeps the refusal...`, com subclasse de `BookingApi` cuja listagem rejeita com o token no erro): vazar o erro na mensagem reprova em `not.toContain(adminToken)`; relançar reprova em `toContain('HTTP 409')`.
6. `--repeat-each=3` em bookings e rooms: 51 de 51.

**Achados:**

- A asserção das datas passava pela linha da listagem mesmo com a linha `Requested` errada; as duas viraram uma, antes das mutações.
- `gh run view --log-failed` e a lista de runs falhos não veem tentativas que terminaram verdes. Para flaky, percorrer `actions/runs/{id}/attempts/{n}/jobs`.
- A #43 cobre o cookie no call log, fora do escopo daqui: vale para toda requisição autenticada que falhe por rede.
- **Para a #29:** dois dos três casos passaram no retry dentro do mesmo job. É o argumento concreto para a política.

**Revisor** (agente `reviewer`, diff completo): três achados, todos aplicados. (1) O `catch` da listagem, único caminho com risco real de credencial, não tinha teste; entrou o teste do RED 5. (2) O `docs/ADAPTING.md` não acompanhou: o `create-booking.ts` ficaria órfão no passo 4 e a seção do ambiente ficaria no entregável do cliente; o passo 4 agora remove os dois, o que dispensa ampliar o `grep` do passo 3. (3) "Principal" superestimava a herança: retries com quarto e datas novos e uma janela de segundos pesam contra ela; rebaixada aqui e no `KNOWN_ISSUES.md`, com a ressalva de que lista vazia não decide.

**Próxima missão:** #43 (segurança, desbloqueada, vem antes pela ordem de prioridade), depois #29.
