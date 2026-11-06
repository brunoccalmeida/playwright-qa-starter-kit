<!-- LTeX: language=pt-BR -->

# Bugs conhecidos do app alvo

Bugs do [Restful Booker Platform](https://automationintesting.online) que os testes encontraram. Cada um tem um teste marcado com `test.fail()` que afirma o comportamento **correto** e aponta para cá: enquanto o bug existir, o teste "falha como esperado"; quando o bug for corrigido, o teste passa a reprovar e avisa que a marcação deve sair.

Antes de marcar um teste com `test.fail()`, confirme que ele falha **pelo motivo do bug** (troque temporariamente por `test` e leia a mensagem): `test.fail()` aceita qualquer falha, inclusive um erro no próprio teste.

Os números seguem a ordem em que os bugs foram encontrados (KI-1 a KI-5 no spike, KI-6 na Missão 3).

## KI-1: GET by id returns 500

- **Endpoints:** `GET /api/room/{id}`, `GET /api/booking/{id}`, `GET /api/message/{id}` (com ou sem o cookie `token` de admin). No spike, `PUT` e `DELETE` em `/api/{room,booking}/{id}` também responderam 500; não foram sondados de novo, para não apagar dados do ambiente compartilhado.
- **Esperado:** 200 com o recurso, para um id que acabou de ser criado.
- **Observado:** `500` com corpo `Internal Server Error` (texto, não JSON).
- **Impacto:** a página `/reservation/:id` fica em branco (Missão 5 contorna com `page.route`); os dados criados pelos testes não podem ser apagados.
- **Testes:** [rooms.spec.ts](../tests/api/rooms.spec.ts) `GET /api/room/{id} › returns the room`; [bookings.spec.ts](../tests/api/bookings.spec.ts) `GET /api/booking/{id} › returns the booking`; [messages.spec.ts](../tests/api/messages.spec.ts) `GET /api/message/{id} › returns the full message`.

## KI-2: guest messages listed without authentication

- **Endpoint:** `GET /api/message`
- **Esperado:** 401 sem o cookie `token`, como `GET /api/booking`.
- **Observado:** 200 com id, nome do hóspede, assunto e status de leitura de todas as mensagens (`GET /api/message/count` também é público).
- **Impacto:** segurança e privacidade: qualquer pessoa lê quem escreveu ao hotel e sobre o quê. As reservas com e-mail também geram mensagens ("You have a new booking!"), expondo o nome de quem reservou.
- **Teste:** [messages.spec.ts](../tests/api/messages.spec.ts), `GET /api/message › requires authentication`.

## KI-3: logout does not invalidate the token

- **Endpoint:** `POST /api/auth/logout`
- **Esperado:** depois do logout, o token deixa de valer: `POST /api/auth/validate` com ele responde 403.
- **Observado:** o logout responde `200 {"success":true}`, mas o token continua válido: `validate` responde `200 {"valid":true}` e o token ainda abre endpoints protegidos (`GET /api/booking?roomid=1` com o cookie `token` → 200; sem token → 401).
- **Impacto:** segurança. Um token vazado não pode ser revogado pelo usuário.
- **Teste:** [tests/api/auth.spec.ts](../tests/api/auth.spec.ts), `POST /api/auth/logout › invalidates the token`.

## KI-4: check-out before check-in returns 409

- **Endpoint:** `POST /api/booking`
- **Esperado:** 400, como os outros dados inválidos da reserva (nome curto → `400 {"errors":[...]}`).
- **Observado:** `409 {"error":"Failed to create booking"}`, a mesma resposta de uma reserva sobreposta.
- **Impacto:** quem chama a API não distingue "datas inválidas" de "quarto ocupado"; a mensagem não diz o que corrigir.
- **Teste:** [bookings.spec.ts](../tests/api/bookings.spec.ts), `POST /api/booking › rejects a check-out before the check-in with 400`.

## KI-5: form fields without associated labels

- **Página:** formulário de contato da home (a label "Message" não está associada ao textarea) e formulário de criar quarto no admin (campos sem label).
- **Esperado:** cada campo com nome acessível, encontrável por `getByLabel`.
- **Observado (spike):** o textarea só é encontrável pelo test id `ContactDescription`.
- **Impacto:** acessibilidade: leitores de tela não anunciam o campo.
- **Teste:** E2E na Missão 5 (#6), nas jornadas de contato e de admin de quartos (bug de navegador; não se testa pela API).

## KI-6: availability ignores partially overlapping bookings

- **Endpoint:** `GET /api/room?checkin=&checkout=`
- **Esperado:** um quarto com reserva que cruza qualquer noite do período pedido fica fora da lista.
- **Observado:** o quarto só sai da lista quando o período pedido **envolve** a reserva inteira. Reserva de 10 a 13: pedir 10–13 ou 08–16 o exclui; pedir 11–12 (dentro), 12–15 (cruza o fim) ou 08–11 (cruza o início) o lista como livre. Reservar esse período depois dá 409.
- **Impacto:** o hóspede vê o quarto disponível e a reserva falha.
- **Teste:** [rooms.spec.ts](../tests/api/rooms.spec.ts), `GET /api/room › leaves out a room booked for part of the requested dates`.
