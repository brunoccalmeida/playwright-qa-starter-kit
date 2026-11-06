<!-- LTeX: language=pt-BR -->

# Playwright QA Starter Kit - Regras do projeto

Regras que valem em todo chat, compartilhadas entre Claude Code (`CLAUDE.md` importa este arquivo) e GitHub Copilot. Estado do projeto e próxima missão: [docs/PROJECT_SESSION_SUMMARY.md](../docs/PROJECT_SESSION_SUMMARY.md).

## O que é este projeto

Kit reaproveitável de automação de QA para clientes: Playwright + TypeScript, testes E2E e de API, CI no GitHub Actions e relatório HTML publicado. O app alvo é o [Restful Booker Platform](https://automationintesting.online), um **ambiente compartilhado** (outros testers usam ao mesmo tempo) e com **bugs conhecidos** (`docs/KNOWN_ISSUES.md`).

## Regra de ouro: todo teste foi visto falhando

Teste que nunca falhou não prova nada. O app alvo é de terceiros, então o RED vem de um destes caminhos:

1. **Teste antes do código de suporte:** escreva o teste usando o cliente de API, o Page Object ou a fixture que ainda não existe; rode e veja FALHAR pelo motivo esperado; implemente o mínimo para passar (GREEN); refatore com tudo verde.
2. **Mutação:** se o teste já nasce verde, altere a expectativa (status, texto, campo) ou o dado e veja-o falhar com uma mensagem que aponta o problema; desfaça.

Registre no commit como o RED foi visto (comando e erro). Portões de qualidade (lint, tipos, CI) seguem a mesma regra: prove com uma sonda que eles reprovam o que devem.

## Melhores práticas sempre

- Havendo mais de um caminho, recomende o indicado pelas melhores práticas e cite o princípio que o sustenta (ex.: YAGNI, fail fast, test isolation).
- Antes de perguntar uma decisão ao usuário, **consulte** a documentação oficial (playwright.dev, typescriptlang.org, docs do GitHub), sem citar de memória; a pergunta traz as fontes e a recomendação.
- Sem atalhos por conveniência (ex.: `test.skip` para silenciar falha, `// eslint-disable` sem motivo, `any`). Desvios só com justificativa explícita no commit ou na documentação.
- Regra deste arquivo que não siga as melhores práticas deve ser substituída, não contornada.

## Ciclo de missão (uma missão por chat)

Contexto longo degrada a qualidade; cada chat cuida de **uma missão** (uma GitHub Issue) e **o estado mora no repositório, não na conversa**.

**Início de cada chat** (automático):

1. Ler `docs/PROJECT_SESSION_SUMMARY.md`.
2. Listar issues e PRs abertos (`gh issue list`, `gh pr list`).
3. Propor a missão de maior prioridade e confirmar com o usuário. Prioridade: bloqueio → segurança → visibilidade → dívida técnica (labels `priority: P0/P1/P2`).

**Fechamento** (automático): skill `/close-mission`, a Definition of Done; o registro de sessão vai no PR da própria missão.

## Gasto de tokens (contexto)

- Regras sempre carregadas < 200 linhas; regra de uma parte do código vai para arquivo com escopo de caminho (`.claude/rules/` e `.github/instructions/`).
- Não repita o que lint/tipos/testes já impõem; regra sem exceção vira lint, teste ou hook.
- Filtre saídas na origem (`grep`, `head`, `--jq`, `gh run view --log-failed`, `--reporter=line`); nunca despeje log inteiro.
- Subagente só com motivo: trabalho paralelo independente, saída volumosa ou revisor independente.

## Testes com Playwright

**Hierarquia:** API (contrato e regras de negócio, rápidos) · E2E (jornadas de usuário no navegador). Cobertura de regra vai para a API; E2E cobre só o que precisa do navegador.

- **Isolamento:** cada teste cria os próprios dados, únicos (datas aleatórias no futuro, nomes com sufixo), e não depende de ordem nem de dados de outro teste. O ambiente é compartilhado: nunca presuma estado prévio nem apague o que não criou.
- **Localizadores voltados ao usuário:** `getByRole`, `getByLabel`, `getByText`; `getByTestId` só quando não há alternativa acessível (registre o porquê). Nada de CSS/XPath frágil. `getByRole` casa por substring sem diferenciar maiúsculas: use `exact: true` quando houver ambiguidade.
- **Bug conhecido do app:** `test.fail()` com o link da entrada em `docs/KNOWN_ISSUES.md`, nunca `skip`. Quando o bug for corrigido, o teste passa a "falhar" e avisa. Antes de marcar, troque temporariamente por `test` e confirme que falha **pelo motivo do bug**: `test.fail()` aceita qualquer falha, inclusive um erro no próprio teste.
- **Configuração** (URL, credenciais) vem de variáveis de ambiente validadas na inicialização; nunca no código.

## Espere o estado ficar pronto antes de agir

Toda leitura ou decisão após uma ação espera o **resultado** da ação, nunca um estado intermediário. Pergunte: _"isto vê o resultado, ou um estado que ainda está mudando?"_

| Contexto             | Armadilha                                                         | Como esperar corretamente                                                           |
| -------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Asserção na UI       | `expect(await loc.textContent()).toBe(x)` lê uma vez, cedo demais | Asserção web-first: `await expect(loc).toHaveText(x)` (tenta até o timeout)         |
| Navegação em SPA     | A URL muda antes de o conteúdo renderizar                         | Esperar um elemento do destino, não só `toHaveURL`                                  |
| Ação que dispara API | A UI otimista aparece antes de a resposta chegar                  | `page.waitForResponse` registrado **antes** da ação, ou asserção no resultado final |
| Checks de CI         | Logo após um push, os checks verdes ainda são do commit anterior  | Consultar checks pelo SHA da head atual; check ausente é pendente                   |

- **"Ainda não sei" não é "sim".** Pendente, `UNKNOWN` ou resposta vazia significam _esperar_.
- **Espere por condição, nunca por tempo** (`waitForTimeout` é barrado pelo lint).

## Diagnóstico de erros

Nunca "chute" soluções. Antes de propor uma correção:

1. **Observe:** mensagem completa, stack trace, trace do Playwright (`npx playwright show-trace`) ou screenshot.
2. **Contextualize:** código ao redor, padrões do projeto.
3. **Investigue:** o mesmo padrão em outros lugares; compare com o que funciona.
4. **Causa raiz**, não sintoma: bug do teste, do app (vai para `KNOWN_ISSUES.md`) ou do ambiente compartilhado?
5. **Corrija** de forma consistente com a arquitetura, em todos os locais afetados.
6. **Valide:** sem regressão; rode o teste repetidas vezes (`--repeat-each`) se a falha era intermitente.

Ao reportar um erro: **erro observado**, **causa raiz**, **análise**, **solução proposta** com justificativa e **prevenção**.

## Comunicação

- Conversa e documentação interna (regras, resumo de sessão) em **português (Brasil)**.
- Em **inglês**: código, commits, issues, PRs, README principal e **entregáveis de QA para o cliente** (ex.: `docs/KNOWN_ISSUES.md`). O critério é quem lê: o que vai para o cliente segue o idioma do código.
- Explicar o **porquê**, não só o quê; opiniões fundamentadas, não só concordância.

## Dependências e segurança

- npm com `package-lock.json` commitado; versões fixadas exatas (`--save-exact`). Node fixado em `.node-version`.
- Nunca commitar credenciais; `.env` fica fora do Git.
- Vulnerabilidade em dependência transitiva: `overrides` para a versão corrigida, nunca `npm audit fix --force` que rebaixa versão maior.
- Versão maior é decisão humana: ler as notas de versão e medir o impacto antes de atualizar. Conferir _peer dependencies_ (ex.: `typescript-eslint` limita a versão do TypeScript).

## Git e Pull Requests

- **Conventional Commits** (`feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, `chore`; escopo opcional), commits atômicos.
- Antes de commitar: `npm run check` verde.
- **Um PR aberto por vez**; trabalho pronto espera em commit local até a fila esvaziar.
- **Antes de abrir o PR da missão**, o subagente `reviewer` revisa o diff (salvo em arquivo no scratchpad) contra a issue; corrija os achados que procedem e registre os descartados com o porquê.
- **Merge só pelo usuário** (skill `/ship-pr`, que liga o auto-merge). Squash, com os checks obrigatórios verdes no SHA da head. Nunca `--admin` para furar proteção de branch.

## Princípios

Explícito é melhor que implícito; simples é melhor que complexo; legibilidade conta; erros nunca passam em silêncio; diante da ambiguidade, recuse a tentação de adivinhar.
