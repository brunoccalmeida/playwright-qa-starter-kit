---
name: ship-pr
description: Liga o auto-merge (squash) de um PR na main, preso ao SHA da head; o GitHub integra só quando o ruleset aprovar. Só o usuário dispara, porque o merge é decisão humana.
disable-model-invocation: true
argument-hint: '[pr-number]'
---

<!-- LTeX: language=pt-BR -->

Integre à `main` o PR $ARGUMENTS (sem número: o PR da branch atual, `gh pr view --json number`).

Quem decide se pode integrar é o **ruleset** da `main` (`ci-passed` verde no SHA da head, branch atualizada, histórico linear). A skill não reimplementa essa decisão: liga o [auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request), que só integra depois que todos os requisitos passam.

1. Se houver outro PR aberto (`gh pr list`), pare e pergunte: um PR aberto por vez.
2. Leia `gh pr view <n> --json headRefOid,mergeStateStatus` até sair de `UNKNOWN` (logo após um merge na `main` ele ainda não foi calculado). Se vier `BEHIND`, rode `gh pr update-branch <n>` e leia de novo, porque o SHA da head mudou.
3. `gh pr merge <n> --auto --squash --match-head-commit <sha>`. O `--match-head-commit` faz o GitHub recusar o merge se a head mudar depois desta leitura. Título e corpo do squash vêm do PR (configuração do repositório), então revise-os antes.
4. Espere o resultado, não um estado intermediário: `gh pr checks <n> --watch --required` como comando longo (em segundo plano, aguardando a notificação). Depois, `gh pr view <n> --json state,mergeStateStatus`:
   - `MERGED`: `git switch main`, `git pull --ff-only` e apague a branch local.
   - Check com falha: o PR não integra. Diagnostique pelo log (`gh run view <run-id> --log-failed`). Depois do push da correção, confira `gh pr view <n> --json autoMergeRequest`: se vier `null`, volte ao passo 2 (o SHA preso no passo 3 era o antigo).
   - `BEHIND`: volte ao passo 2.
5. Nunca `--admin`.
