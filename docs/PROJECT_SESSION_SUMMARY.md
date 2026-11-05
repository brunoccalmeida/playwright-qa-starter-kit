<!-- LTeX: language=pt-BR -->

# Resumo das sessões

Estado do projeto entre chats. Lido no início de cada missão (ver `.github/copilot-instructions.md`).

## Estado atual

| Item           | Estado                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| Missão atual   | 0 — Fundação (#1), concluída com o merge deste PR                               |
| Próxima missão | 1 — CI de qualidade + ruleset na `main` (#2)                                    |
| PRs abertos    | nenhum após o merge                                                             |
| Portões        | `npm run check` (tsc estrito, ESLint type-checked, Prettier) — só local, sem CI |
| Testes         | nenhum ainda (API a partir da Missão 2, E2E a partir da Missão 4)               |

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

| Endpoint                   | Auth           | Comportamento observado                                                        |
| -------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `POST /api/auth/login`     | —              | `{username, password}` → `{token}` (credenciais do demo: `admin` / `password`) |
| `POST /api/auth/validate`  | cookie `token` | token inválido → 403 `{"error":"Invalid token"}`                               |
| `GET /api/room`            | público        | lista quartos; `?checkin&checkout` filtra os disponíveis                       |
| `POST /api/room`           | exige (401)    | dados inválidos → 400 `{errors:[...]}`                                         |
| `POST /api/booking`        | público        | 201                                                                            |
| `GET /api/booking?roomid=` | exige          | —                                                                              |
| `POST /api/message`        | público        | 200 `{success:true}`; 400 devolve **array puro** de erros (formato diferente)  |

A autenticação usa o cookie `token`, não header `Authorization`.

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

**Achado: fim de linha (LF × CRLF).** Com `* text=auto` e `core.autocrlf=true` (padrão do Git no Windows), o checkout grava CRLF e o Prettier, que exige LF, reprova o clone novo. RED: apagar o `tsconfig.json`, restaurar com `git checkout` e rodar `prettier --check` → "Code style issues found". Correção recomendada pela [documentação do Prettier](https://prettier.io/docs/options#end-of-line): `* text=auto eol=lf` no `.gitattributes`. **Não volte para `text=auto` sem `eol=lf`.**

**Revisor:** três achados, todos aplicados: registrar o achado de LF neste resumo; provar o RED do lint pelo `npm run check` com a sonda isolada (o registro original misturava as duas sondas e o código 2 vinha do `tsc`); marcar que `docs/KNOWN_ISSUES.md` só existe a partir da Missão 3.

**Próxima missão:** 1 — CI de qualidade (#2). Sem CI, os portões dependem de cada pessoa lembrar de rodá-los.
