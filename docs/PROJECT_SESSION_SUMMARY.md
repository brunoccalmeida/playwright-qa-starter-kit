<!-- LTeX: language=pt-BR -->

# Resumo das sessões

Estado do projeto entre chats. Lido no início de cada missão (ver `.github/copilot-instructions.md`).

## Estado atual

| Item           | Estado                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Missão atual   | 5 — E2E: jornadas (#6), concluída com o merge deste PR                                                                                           |
| Próxima missão | 6 — Relatório (#7), seguindo a [ordem de trabalho](#ordem-de-trabalho-entre-repositórios)                                                        |
| PRs abertos    | nenhum após o merge (Dependabot pode abrir outros: tratar no início do chat)                                                                     |
| Portões        | `npm run check` (job `check`, inclui a sentinela de ignores), testes de API (`api`), E2E (`e2e`) e `npm audit` (`audit`); `ci-passed` no ruleset |
| Testes         | API: 27 (auth, rooms, bookings, messages), 7 deles `test.fail()` (KI-1, KI-2, KI-3, KI-4, KI-6); E2E: 9 + `setup`, 2 deles `test.fail()` (KI-5)  |

## Plano de missões

| #   | Missão                       | Escopo                                                                                                               |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0   | Fundação                     | Repo, issues, tooling (TS estrito, ESLint, Prettier), regras do projeto, este resumo                                 |
| 1   | CI de qualidade              | Workflow com `npm run check` e job agregador `ci-passed`; ruleset na `main`; skill `ship-pr`                         |
| 2   | API: autenticação            | `@playwright/test`, `playwright.config.ts`, env validado (zod), cliente de API, helper `expectJson`, testes de login |
| 3   | API: rooms/bookings/messages | Testes de contrato e regra de negócio; `docs/KNOWN_ISSUES.md` com os bugs do app                                     |
| —   | Extra (#17)                  | `docs/KNOWN_ISSUES.md` em inglês (entregável do cliente) e regra de idioma ajustada; `npm audit` no CI               |
| 4   | E2E: fundação                | Page Objects, projeto `setup` + `storageState`, home e login                                                         |
| 5   | E2E: jornadas                | Contato, reserva (com `page.route` contornando o bug #1), admin de quartos                                           |
| 6   | Relatório                    | Relatório HTML no GitHub Pages, Firefox no CI, execução noturna                                                      |
| 7   | Documentação                 | `docs/ADAPTING.md` (como reaproveitar o kit num cliente), README EN e pt-BR                                          |

Princípio: cada dependência entra na missão que a usa (YAGNI). Por isso `@playwright/test`, `zod` e `playwright.config.ts` ficam para a Missão 2.

## Ordem de trabalho entre repositórios

Combinada em 06/11/2026, quando o [automation-template](https://github.com/brunoccalmeida/automation-template) foi **pausado** até o primeiro trabalho pago de automação. Pela regra de três, duas fontes (este kit e o `uat-automation-framework`) não bastam para extrair o núcleo comum; até lá, as melhorias entram à mão em cada repositório. Por isso a #15 tem a label `blocked`. Detalhes na seção "Pausa" do [resumo do automation-template](https://github.com/brunoccalmeida/automation-template/blob/main/docs/PROJECT_SESSION_SUMMARY.md).

A ordem é de **prioridade, não de dependência**: itens de repositórios diferentes andam em paralelo, em chats separados ("um PR aberto por vez" vale por repositório).

1. ✅ Este repo: Missão 3 (#4), integrada no PR #16.
2. `uat-automation-framework`: `timeout-minutes` e `persist-credentials: false` em todos os jobs.
3. ✅ Este repo: `docs/KNOWN_ISSUES.md` em inglês, com a regra de idioma ajustada, e `npm audit` no CI (#17).
4. Este repo: Missões 4, 5 e 6 (#5, #6, #7: E2E e relatório HTML no GitHub Pages). Depois, README com badges e um "At a Glance", sem o aviso de "Work in progress".
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
3. Uma mutação por asserção (script confere o trecho **exatamente uma vez** e restaura): nome na confirmação +`x` → heading não encontrado; assunto → `Expected: "Another subject" Received: "Question about a room"`; datas trocadas → `Expected: "2032-02-15 - 2032-02-13" Received: "2032-02-13 - 2032-02-15"`; datas gravadas → diff do `toEqual`; **sem `serveRoomFromList`** → "Reserve Now" não encontrado (página em branco: prova que o contorno é o que viabiliza a jornada); tipo `'Suite'` e preço `'151'` na linha → não encontrados; preço gravado +1 e recursos `['Views']` → diff do `toMatchObject`.
4. Estabilidade: suíte completa (API + E2E) com `--repeat-each=3`: 109 de 109.

**Achados:**

- Uma mutação também revela fraqueza no próprio teste: a mensagem `Received string` mostrou que a asserção por substring tinha um falso positivo possível.
- Relatório (Missão 6): as jornadas novas digitam só dados de teste (hóspede, mensagem, quarto); a senha de admin continua só no `setup` e no teste de login válido. O alerta da Missão 4 sobre `Fill "<valor>"` não muda de tamanho.

**Próxima missão:** 6 — Relatório (#7): relatório HTML no GitHub Pages (resolvendo antes a senha nos títulos de passo `Fill`), Firefox no CI e execução noturna.
