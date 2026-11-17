<!-- LTeX: language=pt-BR -->

# Instruções de revisão

Verificações específicas deste kit para o revisor (`mission:reviewer` e o Code Review da Anthropic), somadas à lista genérica dele. As regras gerais estão em [.github/copilot-instructions.md](.github/copilot-instructions.md).

## Sempre verificar

- **Espera do estado final:** toda leitura após uma ação espera o resultado dela por condição: asserção web-first (`await expect(loc).toHaveText(x)`), e `page.waitForResponse` registrado **antes** da ação que dispara a requisição. Nunca por tempo.
- **Isolamento no ambiente compartilhado:** cada teste cria os próprios dados, únicos (datas aleatórias no futuro, nomes com sufixo), e não depende de ordem nem de estado prévio; nunca apaga o que não criou.

## Não reportar

- O que `tsc`, ESLint e Prettier já impõem (estilo, formatação, imports, tipos).
