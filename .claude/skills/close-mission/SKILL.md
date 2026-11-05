---
name: close-mission
description: Definition of Done da missão do chat. Use quando a implementação estiver pronta, antes do revisor e do PR, sem esperar o usuário pedir.
---

<!-- LTeX: language=pt-BR -->

Feche a missão; cada item é verificado, não presumido. O registro de sessão entra **no PR da própria missão**: o squash grava código e estado num commit só; nunca abra PR separado de registro.

1. **Portões verdes:** `npm run check` (e os testes, quando existirem) passam localmente.
2. **Issues em dia:** as resolvidas citadas no PR (`Closes #N`); pendências descobertas viram issues novas com label `priority: P0/P1/P2`.
3. **`docs/PROJECT_SESSION_SUMMARY.md`**, na branch da missão: estado atual (tabela, com a fila de PRs como ficará após o merge), uma seção "Missão N (#issue)" com decisões, fontes consultadas, como o RED foi visto (ou a mutação) e achados; próxima missão recomendada. Cite issues, não o número do PR (ele ainda não existe).
4. **README** acompanha o que mudou para quem usa o kit.
5. **Revisor** (`reviewer`) sobre o diff completo (`git diff main...HEAD` salvo no scratchpad); corrija os achados que procedem e registre os descartados com o porquê; atualize o resumo com o que as correções mudaram.
6. Commit, push, PR com `Closes #N`; peça ao usuário o merge.
7. Com o PR integrado: confirme as issues fechadas (`gh issue view <n> --json state`) e a `main` local atualizada; avise que a missão terminou e que o próximo chat pode começar.
