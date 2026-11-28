<!-- LTeX: language=pt-BR -->

# CLAUDE.md

As regras do projeto ficam em um único lugar, compartilhado com o GitHub Copilot:

@.github/copilot-instructions.md

As regras que valem para todo projeto estão em [`.claude/rules/core.md`](.claude/rules/core.md), que vem do [automation-template](https://github.com/brunoccalmeida/automation-template) (versão em `.copier-answers.yml`) e não é editado aqui. Onde as duas divergem, vale a exceção abaixo.

Estado do projeto e próxima missão: [docs/PROJECT_SESSION_SUMMARY.md](docs/PROJECT_SESSION_SUMMARY.md)

## Idioma

Documentation language: English

Vale para o README principal, `docs/` e os entregáveis para o cliente (ex.: `docs/KNOWN_ISSUES.md`). Código e commits ficam em inglês pelo core; issues e PRs também, pela seção "Comunicação".

## Exceções ao core

- **"documentation is in the language set by `Documentation language:`"** (Engineering defaults): a documentação interna fica em português (Brasil): as regras (este arquivo, `.github/copilot-instructions.md`, `REVIEW.md`), o resumo de sessão e a tradução `README.pt-BR.md`. Motivo: o critério é quem lê; quem lê a documentação interna é o dono do projeto, que trabalha em pt-BR, e o que vai para o cliente segue o idioma do código.
