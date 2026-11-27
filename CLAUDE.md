<!-- LTeX: language=pt-BR -->

# CLAUDE.md

As regras do projeto ficam em um único lugar, compartilhado com o GitHub Copilot:

@.github/copilot-instructions.md

As regras que valem para todo projeto estão em [`.claude/rules/core.md`](.claude/rules/core.md), que vem do [automation-template](https://github.com/brunoccalmeida/automation-template) (versão em `.copier-answers.yml`) e não é editado aqui. Onde as duas divergem, vale a exceção abaixo.

Estado do projeto e próxima missão: [docs/PROJECT_SESSION_SUMMARY.md](docs/PROJECT_SESSION_SUMMARY.md)

## Exceções ao core

- **"Everything written to the repository is in English"** (Engineering defaults): a conversa, a documentação interna (regras, resumo de sessão) e a tradução `README.pt-BR.md` ficam em português (Brasil); código, commits, issues, PRs, README principal e os entregáveis para o cliente, em inglês (seção "Comunicação"). Motivo: o critério é quem lê; o dono do projeto trabalha em pt-BR, e o que vai para o cliente segue o idioma do código.
