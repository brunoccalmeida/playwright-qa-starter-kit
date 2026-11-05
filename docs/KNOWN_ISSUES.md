<!-- LTeX: language=pt-BR -->

# Bugs conhecidos do app alvo

Bugs do [Restful Booker Platform](https://automationintesting.online) que os testes encontraram. Cada um tem um teste marcado com `test.fail()` que afirma o comportamento **correto** e aponta para cá: enquanto o bug existir, o teste "falha como esperado"; quando o bug for corrigido, o teste passa a reprovar e avisa que a marcação deve sair.

Antes de marcar um teste com `test.fail()`, confirme que ele falha **pelo motivo do bug** (troque temporariamente por `test` e leia a mensagem): `test.fail()` aceita qualquer falha, inclusive um erro no próprio teste.

Os demais bugs observados no spike (lista em [PROJECT_SESSION_SUMMARY.md](PROJECT_SESSION_SUMMARY.md), seção "Bugs do app") entram aqui na Missão 3, junto com os testes que os cobrem.

## KI-3: logout does not invalidate the token

- **Endpoint:** `POST /api/auth/logout`
- **Esperado:** depois do logout, o token deixa de valer: `POST /api/auth/validate` com ele responde 403.
- **Observado:** o logout responde `200 {"success":true}`, mas o token continua válido: `validate` responde `200 {"valid":true}` e o token ainda abre endpoints protegidos (`GET /api/booking?roomid=1` com o cookie `token` → 200; sem token → 401).
- **Impacto:** segurança. Um token vazado não pode ser revogado pelo usuário.
- **Teste:** [tests/api/auth.spec.ts](../tests/api/auth.spec.ts), `POST /api/auth/logout › invalidates the token`.
