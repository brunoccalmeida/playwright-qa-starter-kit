<!-- LTeX: language=pt-BR -->

# Resumo das sessões

Estado do projeto entre chats. Lido no início de cada missão (ver `.github/copilot-instructions.md`).

## Estado atual

| Item           | Estado                                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Missão atual   | 2 — API: autenticação (#3), concluída com o merge deste PR                                                      |
| Próxima missão | 3 — API: rooms/bookings/messages (#4)                                                                           |
| PRs abertos    | nenhum após o merge (Dependabot pode abrir os seus: tratar no início do chat)                                   |
| Portões        | `npm run check` (job `check`) e testes de API (job `api`) no CI; ruleset `Protect main` exige `ci-passed` verde |
| Testes         | API: autenticação (7, um deles `test.fail()` do KI-3); E2E a partir da Missão 4                                 |

## Plano de missões

| #   | Missão                       | Escopo                                                                                                               |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0   | Fundação                     | Repo, issues, tooling (TS estrito, ESLint, Prettier), regras do projeto, este resumo                                 |
| 1   | CI de qualidade              | Workflow com `npm run check` e job agregador `ci-passed`; ruleset na `main`; skill `ship-pr`                         |
| 2   | API: autenticação            | `@playwright/test`, `playwright.config.ts`, env validado (zod), cliente de API, helper `expectJson`, testes de login |
| 3   | API: rooms/bookings/messages | Testes de contrato e regra de negócio; `docs/KNOWN_ISSUES.md` com os bugs do app                                     |
| 4   | E2E: fundação                | Page Objects, projeto `setup` + `storageState`, home e login                                                         |
| 5   | E2E: jornadas                | Contato, reserva (com `page.route` contornando o bug #1), admin de quartos                                           |
| 6   | Relatório                    | Relatório HTML no GitHub Pages, Firefox no CI, execução noturna                                                      |
| 7   | Documentação                 | `docs/ADAPTING.md` (como reaproveitar o kit num cliente), README EN e pt-BR                                          |

Princípio: cada dependência entra na missão que a usa (YAGNI). Por isso `@playwright/test`, `zod` e `playwright.config.ts` ficam para a Missão 2.

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
