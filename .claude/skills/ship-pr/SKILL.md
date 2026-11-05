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
2. Leia `gh pr view <n> --json headRefOid,mergeStateStatus` até sair de `UNKNOWN` (logo após um merge na `main` ele ainda não foi calculado).
   - `BEHIND`: `gh pr update-branch <n>` e leia de novo, porque o SHA da head mudou.
   - `DIRTY` (conflito com a `main`): pare; o conflito se resolve localmente, e o auto-merge nunca integraria.
3. `gh pr merge <n> --auto --squash --match-head-commit <sha>`. O `--match-head-commit` faz o GitHub recusar o merge se a head mudar depois desta leitura. Título e corpo do squash vêm do PR (configuração do repositório), então revise-os antes.
4. Espere o **resultado**, não um estado intermediário. Os checks são lidos pelo SHA da head (logo após um push, `gh pr checks` ainda mostra os do commit anterior, ou nenhum), e o merge acontece depois dos checks, de forma assíncrona. Rode em segundo plano, aguardando a notificação, este laço (Bash), que só sai num estado final:

   ```sh
   n=<n>; sha=<sha>; : "${n:?}" "${sha:?}"; deadline=$((SECONDS + 1800))
   until out=$(gh pr view "$n" --json state,autoMergeRequest --jq '"\(.state) \(.autoMergeRequest != null)"') \
     && gate=$(gh api "repos/{owner}/{repo}/commits/$sha/check-runs?check_name=ci-passed" --jq '[.check_runs[] | select(.status == "completed")][0].conclusion // "pending"') \
     && { [ "${out%% *}" != OPEN ] || [ "${out#* }" = false ] || { [ "$gate" != pending ] && [ "$gate" != success ]; }; }
   do [ "$SECONDS" -lt "$deadline" ] || { echo "timeout: $out ci-passed=$gate" >&2; exit 1; }; sleep 30; done
   echo "$out ci-passed=$gate"
   ```

   Erro de rede ou da API conta como "ainda não sei" e o laço tenta de novo; persistindo, o prazo de 30 min encerra com `timeout` e o último estado lido.

   - `MERGED`: `git switch main`, `git pull --ff-only` e apague a branch local.
   - `ci-passed` com falha: o PR não integra. Diagnostique pelo log (`gh run view <run-id> --log-failed`) e, depois do push da correção, volte ao passo 2 (o SHA preso no passo 3 era o antigo).
   - `OPEN false` (auto-merge desligado, por exemplo por head nova ou `BEHIND`): volte ao passo 2.

5. Nunca `--admin`.
