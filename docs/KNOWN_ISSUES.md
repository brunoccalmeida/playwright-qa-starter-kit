<!-- LTeX: language=en-US -->

# Known issues in the application under test

Defects in the [Restful Booker Platform](https://automationintesting.online) found by this test suite.

**How they are tracked:** each issue has a test marked `test.fail()` that asserts the **correct** behavior and links here. While the defect exists, the test "fails as expected" and the run stays green; once the defect is fixed, the test starts failing and signals that the marker must be removed. The suite keeps documenting the defect and detects its fix, without hiding it behind a skipped test.

**In the [test report](https://brunoccalmeida.github.io/playwright-qa-starter-kit/):** these tests count as passed and carry the `known-issue` tag; search `@known-issue` to list them. Each one names its issue, explains why it fails, and links to its entry below. The red error inside the test is the evidence of the defect, not a broken test.

Issues are numbered in the order they were found.

## KI-1: GET by id returns 500

- **Endpoints:** `GET /api/room/{id}`, `GET /api/booking/{id}`, `GET /api/message/{id}` (with or without the admin `token` cookie). During exploratory testing, `PUT` and `DELETE` on `/api/{room,booking}/{id}` also returned 500; `DELETE /api/room/{id}` was confirmed again (500) on rooms created by the tests themselves; `PUT` and the booking endpoints were not probed again, to avoid changing data the tests did not create.
- **Expected:** 200 with the resource, for an ID that was just created.
- **Actual:** `500` with the body `Internal Server Error` (plain text, not JSON).
- **Impact:** the `/reservation/:id` page renders blank, so guests cannot book a room. The browser tests work around it by answering `GET /api/room/{id}` with the room from `GET /api/room` ([known-issue-workarounds.ts](../src/pages/known-issue-workarounds.ts)). Data created by the tests cannot be deleted.
- **Tests:** [rooms.spec.ts](../tests/api/rooms.spec.ts) `GET /api/room/{id} › returns the room`; [bookings.spec.ts](../tests/api/bookings.spec.ts) `GET /api/booking/{id} › returns the booking`; [messages.spec.ts](../tests/api/messages.spec.ts) `GET /api/message/{id} › returns the full message`.

## KI-2: guest messages listed without authentication

- **Endpoint:** `GET /api/message`
- **Expected:** 401 without the `token` cookie, like `GET /api/booking`.
- **Actual:** 200 with the ID, guest name, subject and read status of every message (`GET /api/message/count` is public too).
- **Impact:** security and privacy: anyone can read who wrote to the hotel and about what. Bookings with an email address also create messages ("You have a new booking!"), exposing the name of whoever booked.
- **Test:** [messages.spec.ts](../tests/api/messages.spec.ts), `GET /api/message › requires authentication`.

## KI-3: logout does not invalidate the token

- **Endpoint:** `POST /api/auth/logout`
- **Expected:** after logout, the token is no longer valid: `POST /api/auth/validate` with it returns 403.
- **Actual:** logout returns `200 {"success":true}`, but the token stays valid: `validate` returns `200 {"valid":true}` and the token still opens protected endpoints (`GET /api/booking?roomid=1` with the `token` cookie → 200; without it → 401).
- **Impact:** security. A leaked token cannot be revoked by its user.
- **Test:** [auth.spec.ts](../tests/api/auth.spec.ts), `POST /api/auth/logout › invalidates the token`.

## KI-4: check-out before check-in returns 409

- **Endpoint:** `POST /api/booking`
- **Expected:** 400, like the other invalid booking data (a short name → `400 {"errors":[...]}`).
- **Actual:** `409 {"error":"Failed to create booking"}`, the same response as an overlapping booking.
- **Impact:** API clients cannot tell "invalid dates" from "room already booked"; the message does not say what to fix.
- **Test:** [bookings.spec.ts](../tests/api/bookings.spec.ts), `POST /api/booking › rejects a check-out before the check-in with 400`.

## KI-5: form fields without associated labels

- **Pages:** the contact form on the home page and the create-room form in the admin area (`/admin/rooms`).
- **Expected:** every field has an accessible name, so it can be found by its label.
- **Actual:** on the contact form, the "Message" label points to `id="message"`, but the textarea has `id="description"`; it can only be found by its test ID `ContactDescription`. On the create-room form, no field has a label: the column headers above it ("Room #", "Type", "Accessible", "Price") are plain paragraphs, not labels.
- **Impact:** accessibility: screen readers do not announce what each field is for.
- **Tests (browser):** [contact.spec.ts](../tests/e2e/contact.spec.ts), `Contact form › the message field is found by its label`; [admin-rooms.spec.ts](../tests/e2e/admin-rooms.spec.ts), `Admin rooms › the create-room fields are found by their labels`.

## KI-6: availability ignores partially overlapping bookings

- **Endpoint:** `GET /api/room?checkin=&checkout=`
- **Expected:** a room with a booking that covers any night of the requested period is left out of the list.
- **Actual:** the room is left out only when the requested period **contains** the whole booking. With a booking from the 10th to the 13th: requesting 10–13 or 08–16 leaves it out; requesting 11–12 (inside), 12–15 (overlapping the end) or 08–11 (overlapping the start) lists it as available. Booking that period afterward returns 409.
- **Impact:** guests see the room as available and their booking fails.
- **Test:** [rooms.spec.ts](../tests/api/rooms.spec.ts), `GET /api/room › leaves out a room booked for part of the requested dates`.

## Test environment limit: rooms and bookings reset independently

This is a limit of the shared environment, not a numbered defect: no test asserts it.

- **How it works:** the [application source](https://github.com/mwinteringham/restful-booker-platform) has one reset schedule per service. Resetting rooms restarts their ids at 1; bookings stay until the booking service runs its own reset. Until then, a new room can inherit bookings from an older room with the same id. A new room inheriting 11 bookings was observed during this suite's development.
- **Consequence for the tests:** a test never assumes that a new room is empty, and each one books random dates one to ten years ahead.
- **Open question:** in 3 of the 36 CI attempts up to 2026-11-08, the first bookings of a run were refused with `409 {"error":"Failed to create booking"}` for 3 to 5 seconds, then bookings worked again. In the application source, this 409 comes from the booking service itself (a date conflict in that room, or invalid dates), not from a generic error. An inherited booking is one possible explanation, and the evidence so far weighs against it: each retry used a new room and new random dates, and an inherited booking would not go away after a few seconds. The cause is unknown.
- **Diagnosis:** a refused booking now reports the room, the requested dates and the dates the room holds at that moment. A booking covering the requested dates would support the inherited-booking explanation. An empty list would not settle it, because the room is read after the refusal and a reset could happen in between.
