<!-- LTeX: language=en-US -->

# Known issues in the application under test

Defects in the [Restful Booker Platform](https://automationintesting.online) found by this test suite.

**How they are tracked:** each issue has a test marked `test.fail()` that asserts the **correct** behavior and links here. While the defect exists, the test "fails as expected" and the run stays green; once the defect is fixed, the test starts failing and signals that the marker must be removed. The suite keeps documenting the defect and detects its fix, without hiding it behind a skipped test.

**In the [test report](https://brunoccalmeida.github.io/playwright-qa-starter-kit/):** these tests count as passed and carry the `known-issue` tag; search `@known-issue` to list them. Each one names its issue, explains why it fails, and links to its entry below. The red error inside the test is the evidence of the defect, not a broken test.

Issues are numbered in the order they were found.

## KI-2: guest messages listed without authentication

- **Endpoint:** `GET /ui-api/message`
- **Expected:** 401 without the `token` cookie, like `GET /ui-api/booking`.
- **Actual:** 200 with the ID, guest name, subject and read status of every message (`GET /ui-api/message/count` is public too).
- **Impact:** security and privacy: anyone can read who wrote to the hotel and about what. Bookings with an email address also create messages ("You have a new booking!"), exposing the name of whoever booked.
- **Test:** [messages.spec.ts](../tests/api/messages.spec.ts), `GET /ui-api/message › requires authentication`.

## KI-3: logout does not invalidate the token

- **Endpoint:** `POST /ui-api/auth/logout`
- **Expected:** after logout, the token is no longer valid: `POST /ui-api/auth/validate` with it returns 403.
- **Actual:** logout returns `200 {"success":true}`, but the token stays valid: `validate` returns `200 {"valid":true}` and the token still opens protected endpoints (`GET /ui-api/booking?roomid=1` with the `token` cookie → 200; without it → 401).
- **Impact:** security. A leaked token cannot be revoked by its user.
- **Test:** [auth.spec.ts](../tests/api/auth.spec.ts), `POST /ui-api/auth/logout › invalidates the token`.

## KI-4: check-out before check-in returns 409

- **Endpoint:** `POST /ui-api/booking`
- **Expected:** 400, like the other invalid booking data (a short name → `400 {"errors":[...]}`).
- **Actual:** `409 {"error":"Failed to create booking"}`, the same response as an overlapping booking.
- **Impact:** API clients cannot tell "invalid dates" from "room already booked"; the message does not say what to fix.
- **Test:** [bookings.spec.ts](../tests/api/bookings.spec.ts), `POST /ui-api/booking › rejects a check-out before the check-in with 400`.

## KI-5: form fields without associated labels

- **Pages:** the contact form on the home page and the create-room form in the admin area (`/admin/rooms`).
- **Expected:** every field has an accessible name, so it can be found by its label.
- **Actual:** on the contact form, the "Message" label points to `id="message"`, but the textarea has `id="description"`; it can only be found by its test ID `ContactDescription`. On the create-room form, no field has a label: the column headers above it ("Room #", "Type", "Accessible", "Price") are plain paragraphs, not labels.
- **Impact:** accessibility: screen readers do not announce what each field is for.
- **Tests (browser):** [contact.spec.ts](../tests/e2e/contact.spec.ts), `Contact form › the message field is found by its label`; [admin-rooms.spec.ts](../tests/e2e/admin-rooms.spec.ts), `Admin rooms › the create-room fields are found by their labels`.

## KI-6: availability ignores partially overlapping bookings

- **Endpoint:** `GET /ui-api/room?checkin=&checkout=`
- **Expected:** a room with a booking that covers any night of the requested period is left out of the list.
- **Actual:** the room is left out only when the requested period **contains** the whole booking. With a booking from the 10th to the 13th: requesting 10–13 or 08–16 leaves it out; requesting 11–12 (inside), 12–15 (overlapping the end) or 08–11 (overlapping the start) lists it as available. Booking that period afterward returns 409.
- **Impact:** guests see the room as available and their booking fails.
- **Test:** [rooms.spec.ts](../tests/api/rooms.spec.ts), `GET /ui-api/room › leaves out a room booked for part of the requested dates`.

## KI-7: unknown room id returns 500

- **Endpoints:** `GET /ui-api/room/{id}` and `DELETE /ui-api/room/{id}`.
- **Expected:** `404` for an id with no room, whether it was deleted or never existed ([RFC 9110, 404 Not Found](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.5)).
- **Actual:** `500`, after about 31 seconds. Observed on 2026-11-27: `GET` on a room just deleted and on id `999999` returns `{"status":500,"error":"Internal Server Error"}` in 31.3 s (an existing room: 0.25 s); deleting the same room a second time returns `{"errors":["An unexpected error occurred"]}`. The delay comes from the UI API, which sends these requests through a fetch that retries a `500` after 1, 2, 4, 8 and 16 seconds ([`route.ts`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/assets/src/app/ui-api/room/%5Bid%5D/route.ts#L3)).
- **Impact:** a client cannot tell a missing room from a server failure ([RFC 9110, 500 Internal Server Error](https://www.rfc-editor.org/rfc/rfc9110#section-15.6.1)), every lookup of a deleted room counts as a server error, and each one holds the request for half a minute.
- **Test:** [rooms.spec.ts](../tests/api/rooms.spec.ts), `DELETE /ui-api/room/{id} › a deleted room is not found`.

## KI-8: a stored booking is refused with 409

- **Endpoint:** `POST /ui-api/booking`
- **Expected:** the response says what happened to the booking: `201` when it is stored, an error only when it is not: a `409` means the request "could not be completed" ([RFC 9110, 409 Conflict](https://www.rfc-editor.org/rfc/rfc9110#section-15.5.10)).
- **Actual:** if anything fails after the booking is stored, the guest gets `409 {"error":"Failed to create booking"}` about a second later, and the booking stays in the room. Reproduced on 2026-11-27 with a valid email address of 256 characters: `409` after 1.3 s, booking stored; with 255 characters: `201` in 0.2 s.
- **Cause, read in the [application source](https://github.com/mwinteringham/restful-booker-platform):** the booking service stores the booking and then sends the guest's message to the message service, which keeps the email in a 255-character column. A server error or an unreachable message service is not caught ([`MessageRequests.java`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/booking/src/main/java/com/automationintesting/requests/MessageRequests.java#L34)) and turns the response into a `500`. The UI API sends the `POST` through a fetch that retries on `408, 429, 500, 502, 503, 504` after 1, 2, 4, 8 and 16 seconds ([`route.ts`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/assets/src/app/ui-api/booking/route.ts#L3), [`fetch-retry.ts`](https://github.com/mwinteringham/restful-booker-platform/blob/2069ba1c622c7327395d329eccdbe4e8ea90349f/assets/src/utils/fetch-retry.ts)); the retry clashes with the booking the first attempt stored. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-9.2.2): "A proxy MUST NOT automatically retry non-idempotent requests", and `POST` is not idempotent.
- **Impact:** the guest is told the room is taken while the booking holds it, and booking again is refused too. The same happens with a normal address whenever the message service fails for a moment: the suite's booking tests were refused this way in CI ([#54](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/54)).
- **Test:** [bookings.spec.ts](../tests/api/bookings.spec.ts), `POST /ui-api/booking › does not refuse a booking it stored`.

## Test environment limit: rooms and bookings reset independently

This is a limit of the shared environment, not a numbered defect: no test asserts it.

- **How it works:** the [application source](https://github.com/mwinteringham/restful-booker-platform) has one reset schedule per service. Resetting rooms restarts their ids at 1; bookings stay until the booking service runs its own reset. Until then, a new room can inherit bookings from an older room with the same id. A new room inheriting 11 bookings was observed during this suite's development.
- **Consequence for the tests:** a test never assumes that a new room is empty, and each one books random dates one to ten years ahead.
- **Detected, not hidden:** a reset can also wipe a room in the middle of the test that created it ([#65](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/65): ids went from 54 to 4 between the room's creation and the page reading the list). No test can prevent that in a shared environment, and a retry would hide it. When a test fails and its room was deleted by something other than the test itself, the report adds an error that starts with `Environment:` and lists the room ids at that moment.
- **Refused bookings in CI:** in 3 of the 36 CI attempts up to 2026-11-08, the first bookings of a run were refused with `409` for 3 to 5 seconds; on 2026-11-26 two refusals showed the room already holding a booking with **exactly** the requested (random) dates. That is [KI-8](#ki-8-a-stored-booking-is-refused-with-409), triggered by a moment when the message service failed; what made it fail is not observed.
- **Diagnosis:** a refused booking reports the room, the requested dates, how long the refusal took and the dates the room holds at that moment, marking the one that has the refused request's guest (names stay out of the report). A refusal that took over a second while the room holds the same guest's booking supports the cause, since the first retry waits one second; a plain clash was refused in about 200 ms in local runs. An empty list would not settle it, because the room is read after the refusal and a reset could happen in between.

## Resolved issues

Kept so the numbering stays stable and the record shows how each fix was detected.

### KI-1: GET by id returns 500

- **Resolved:** 2026-11-26, by the application change [mwinteringham/restful-booker-platform#382](https://github.com/mwinteringham/restful-booker-platform/pull/382), which also moved the UI API from `/api` to `/ui-api`. The suite detected the fix: the `test.fail()` tests started failing with "Expected to fail, but passed" ([#59](https://github.com/brunoccalmeida/playwright-qa-starter-kit/issues/59)).
- **Endpoints (then):** `GET /api/room/{id}`, `GET /api/booking/{id}`, `GET /api/message/{id}`, plus `PUT` and `DELETE` on `/api/{room,booking}/{id}`.
- **Was:** `500` with the body `Internal Server Error` (plain text, not JSON).
- **Impact while open:** the `/reservation/:id` page rendered blank, so guests could not book a room; the browser tests served that room from `GET /api/room` with `page.route`. Data created by the tests could not be deleted.
- **Now:** `GET`, `PUT` and `DELETE` by id under `/ui-api` return 200. The tests below assert it as regular tests: [rooms.spec.ts](../tests/api/rooms.spec.ts) `GET /ui-api/room/{id} › returns the room`; [bookings.spec.ts](../tests/api/bookings.spec.ts) `GET /ui-api/booking/{id} › returns the booking`; [messages.spec.ts](../tests/api/messages.spec.ts) `GET /ui-api/message/{id} › returns the full message`.
