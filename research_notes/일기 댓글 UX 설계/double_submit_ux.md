# Preventing Double Clicks / Duplicate Submissions on Action Buttons (mobile web, vanilla JS)

Scope: comment post/edit/delete and save buttons in a vanilla-JS mobile web app. Covers what to lock, what feedback to show, how to keep it accessible, and server-side backup. Research date: 2026-10-14.

Source quality note: GOV.UK (docs and source code), NN/g, MDN, Primer, Atlassian, Shopify Polaris (shopify.dev), Stripe, the IETF draft, React docs, Adrian Roselli and GitLab issues were all fetched directly. Apple HIG and Material 3 pages would not render (JS-only), so the claims about them come from third-party mirrors or search summaries and are flagged as such.

---

## 1. Loading-button patterns (spinner vs. text change, width stability, flicker, disabled vs. aria-disabled)

### Takeaway
Design systems agree on one approach. When a button is pressed, it switches right away to an in-progress state, either a spinner in place of the label (Atlassian, Polaris) or an "-ing" label like "Checking out…" (Apple, React docs). The button then ignores further activation. Show the spinner only if the request runs past about 300–500 ms, and once it appears keep it up for at least about 200–400 ms so it doesn't flicker. The newer guidance prefers a button that stays focusable and ignores clicks in JS over the native `disabled` attribute, because `disabled` drops focus and removes the button from the tab order.

### Cited Findings
**Spinner vs. label text**
- Atlassian: a loading spinner "can be displayed in place of the button label," and loading "disables the button and blocks user interaction." The page says nothing on width stability or ARIA. — [Atlassian Button examples](https://atlassian.design/components/button/examples)
- Shopify Polaris (web components): `loading` "replaces the button content with a loading indicator" and also disables the button. Polaris says to use `loading` rather than `disabled` for async work "because loading signals that an action is in progress." It recommends specific loading labels such as "Saving product..." and "Updating 247 variants...". — [Polaris Button](https://shopify.dev/docs/api/app-home/polaris-web-components/actions/button)
- Polaris Spinner docs: "For loading states on buttons, use the 'loading' property on the Button component instead" of a separate spinner. Spinner accessibility labels should "accurately explain the state," e.g. "Loading", "Submitting", "Processing". — [Polaris Spinner](https://shopify.dev/docs/api/app-home/polaris-web-components/feedback/spinner)
- Apple HIG (via a **third-party mirror**, not verified on apple.com): on iOS/iPadOS a button can show an activity indicator while an action finishes, and the label can change during the wait, e.g. "Checkout" → "Checking out…". — [Apple HIG Buttons mirror (glama.ai)](https://glama.ai/mcp/servers/@tmaasen/apple-dev-mcp/blob/b82f0efe2115dc4539c83a2374a714a84aeb350a/content/universal/buttons.md)
- Apple HIG progress indicators (mirror): on iOS, activity indicators are always indeterminate. Don't switch between the spinner and the bar style. A stationary indicator makes people think the process has stalled. — [Apple HIG progress indicators mirror](https://developer-mdn.apple.com/design/human-interface-guidelines/components/status/progress-indicators)
- React docs pattern: on click, the button immediately shows "Submitting..." and is disabled. Per-item states are "(Adding...)" and "Deleting..." (dims and strikes through the item and disables its button). — [react.dev useOptimistic](https://react.dev/reference/react/useOptimistic)

**Width stability / layout**
- Primer: put the indicator next to the content it stands in for and avoid "a jarring layout shift" when content replaces it. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- Polaris and Atlassian don't document width behavior for the loading state. (Gap, see below.)

**Timing thresholds and flicker**
- NN/g (Nielsen): 0.1 s feels instantaneous and needs no feedback beyond the result. At 1 s the user's flow of thought holds, and per the 2014 update, delays over 1 s should show the computer is working. At 10 s the user's attention is lost, so use percent-done, an estimate and a way to interrupt. — [NN/g Response Times: 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- NN/g Progress Indicators (2014): "For anything that takes less than 1 second to load, it is distracting to use a looped animation." Shorter actions still need immediate visual feedback, such as a button changing state. Looped spinners are for 2–10 s waits. Text like "Loading comments…" helps. Avoid "don't click again" warnings and show that the first click was accepted instead. — [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- Primer: under 1 s, "Don't show a loading state," because a flashing indicator can make the product feel slower. Use indeterminate for 1–3 s, determinate if possible for 3–10 s, and determinate plus a background task for over 10 s. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- spin-delay (npm) describes both failure modes: "Network request can be so fast that rendering a spinner does more harm than good." With a plain delay, a request that runs just past the threshold gives "a spinner for 10ms. This flicker can be annoying." Defaults are `{ delay: 500, minDuration: 200 }` (ms). — [spin-delay README](https://cdn.jsdelivr.net/npm/spin-delay@2.0.1/README.md)
- Other numbers, from a search summary I could not open directly: a useDelayedLoading hook defaults to 300 ms delay and 1000 ms minimum. Adobe Commerce suggests a 500 ms delay. Firefox Acorn reportedly says no spinner under 200 ms and a 400 ms minimum display. The Acorn page did not render, so its numbers are **unverified**. — [Significa useDelayedLoading](https://foundations.significa.co/hooks/use-delayed-loading); [Adobe Commerce progress indicator](https://developer.adobe.com/commerce/admin-developer/pattern-library/feedback-to-user/progress-indicator); [Firefox Acorn loading indicators](https://acorn.firefox.com/latest/foundations/global-patterns/loading-indicators-SKyqf3Lj)

**disabled vs. aria-disabled**
- GitLab design system: the native `disabled` attribute on a loading button "makes it inaccessible via screen-reader and removes it from the tab order," so focus is lost and users have to navigate back. Their fix is an opt-in `accessibleLoading` prop that sets `aria-disabled="true"` instead of `disabled`, suppresses click events, and keeps the disabled look in CSS. It cites Adrian Roselli's "Don't Disable Form Controls." — [GitLab design.gitlab.com issue #2981](https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com/-/issues/2981)
- ARIA doesn't change behavior: "ARIA attributes never change the application behavior or styles by default," so you still have to block the click in JS. — [CSS-Tricks (via search)](https://css-tricks.com/?p=339960)
- W3C APG list (James Scholes): use "aria-disabled if the control should still be focusable, HTML disabled otherwise." — [public-aria-practices, Jul 2023](https://lists.w3.org/Archives/Public/public-aria-practices/2023Jul/0006.html)
- Adrian Roselli (posted 2024-02, updated 2026-07): disabling submit buttons and form fields is "generally bad." Disabled styling is a weak signal and is exempt from WCAG contrast. Disabling can cause focus loss. Alternatives are to keep the control enabled and `preventDefault()` in script, or use `aria-disabled`. — [Adrian Roselli, Don't Disable Form Controls](https://adrianroselli.com/2024/02/dont-disable-form-controls.html)
- Primer: "You may disable form controls after submission so users know their changes are being saved," but the page states that the button that starts a process should **not** be semantically disabled with `aria-disabled`. This came through a summarizer and may be paraphrased. It partly conflicts with GitLab's `aria-disabled` approach, though both agree the trigger should stay reachable. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- Polaris: "Disabled buttons are removed from the tab order and can't receive keyboard focus." If you disable a button temporarily, show visible text explaining why. — [Polaris Button](https://shopify.dev/docs/api/app-home/polaris-web-components/actions/button)
- Atlassian: avoid `isDisabled` where possible because disabled elements leave the tab order. Note that Atlassian's `isLoading` itself blocks interaction. — [Atlassian Button examples](https://atlassian.design/components/button/examples)

### Inferences
- For Korean UI, a label swap such as "저장" → "저장 중…" or "등록" → "등록 중…" combined with a small inline spinner matches both the Apple/React label-change pattern and the Polaris advice on specific labels. Plain text without a spinner is enough for operations under 1 s. Add the spinner only after a delay of about 300–500 ms.
- Width stability in vanilla JS: before swapping content, lock the width (`btn.style.minWidth = btn.offsetWidth + 'px'`). Alternatively, stack the label and spinner in the same grid cell (`display:grid; > * {grid-area:1/1}`) and toggle `visibility:hidden` on the label, so the button keeps the label's width. Korean "-ing" labels are usually longer ("저장" → "저장 중…"), so `min-width` alone won't stop growth. Either reserve the longer width up front or keep the original label and overlay the spinner.
- Suggested timing (synthesized from the numbers above): flip state on the click itself (under 100 ms, NN/g instantaneous). Start the spinner after about 400 ms, keep it at least about 300–400 ms once shown, then show success or error.
- Recommended blocking mechanism: a JS in-flight flag (`if (btn.dataset.busy) return;`) plus `aria-disabled="true"` and a disabled-looking style. Avoid the native `disabled` attribute, especially on the button that has focus. For a native `<form>`, guard in the `submit` handler, not just `click`, because Enter in a field also submits.

### Gaps
- No primary source gave an official minimum spinner display time. GOV.UK, NN/g, Primer, Polaris and Atlassian don't specify one. All the numbers come from libraries or secondary design systems (Firefox Acorn unverified).
- Neither Polaris nor Atlassian documents how a loading button keeps its width.
- I could not read Apple HIG wording from apple.com (JS-rendered). The "Checking out…" example comes from a mirror.

---

## 2. Scope of locking (pressed button vs. whole form vs. related area)

### Takeaway
Sources mostly lock the trigger button, and Primer explicitly allows locking the submitting form's controls. React's per-item pattern locks only the affected item, so its delete button is disabled and the item dimmed. No authoritative source says to lock unrelated UI. The emerging best practice is to lock exactly the controls that could create a conflicting or duplicate request for the same entity and leave everything else usable.

### Cited Findings
- Primer: "You may disable form controls after submission so users know their changes are being saved." This means the whole form, not just the button. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- React docs per-item pattern: a pending delete sets `deleting: true` on that item, which "dims and strikes through the item and disables its button." Other items remain interactive. A pending add shows "(Adding...)" only on the new item. — [react.dev useOptimistic](https://react.dev/reference/react/useOptimistic)
- GOV.UK's `preventDoubleClick` is scoped to the single button. It ignores a repeat click within 1 second of the first, using `DEBOUNCE_TIMEOUT_IN_SECONDS = 1` and `event.preventDefault()` while the timer runs. The window starts at the first click and is not extended. The feature is off by default. — [govuk-frontend button.mjs](https://raw.githubusercontent.com/alphagov/govuk-frontend/main/packages/govuk-frontend/src/govuk/components/button/button.mjs)
- GOV.UK: use it only "if you are working in production and research shows that users are frequently sending information twice". Example: GOV.UK Notify users got invitations twice because the sender double-clicked "send". Causes include habitual double-clickers, slow connections without feedback, and motor impairments such as tremors. — [GOV.UK Design System Button](https://design-system.service.gov.uk/components/button/)
- Practitioner sources (lower authority) recommend a serializable mutation queue with IDs and timestamps so concurrent edits to the same entity are applied in order. — [optimistic-ui-mutation-patterns (playbooks.com)](https://playbooks.com/skills/harborgrid-justin/lexiflow-premium/optimistic-ui-mutation-patterns); [Optimistic UI in Frontend Architecture](https://javascript.plainenglish.io/optimistic-ui-in-frontend-architecture-do-it-right-avoid-pitfalls-7507d713c19c)

### Inferences
- Recommended scope by action:
  - **New comment (post):** lock the submit button (busy state). Make the textarea `readOnly` rather than `disabled`, so the text stays visible and selectable, focus isn't lost, and it doesn't feel like data loss. Leave other comments' actions enabled.
  - **Edit comment (save):** lock that comment's Save, Cancel, Edit and Delete controls, so you can't delete while a save is in flight or press Save twice. Other comments stay interactive.
  - **Delete comment:** lock that comment's whole action group and dim the comment with an "삭제 중…" state, as in the React per-item pattern. Other comments stay interactive.
  - **Whole-page lock / modal overlay:** avoid for comments. It's only justified if a request changes global state, such as a diary save that changes the page. GOV.UK mentions a modal only as one possible feedback option for slow connections.
- Trade-offs: a narrow lock (button only) leaves the form editable mid-flight, so a user can change text that is already being sent and see a confusing result. Locking the form fixes that. A wide lock (area or page) blocks unrelated work and is worse on flaky mobile networks, where requests can hang for many seconds.
- Use a per-entity in-flight registry, for example `const inFlight = new Map(); // key: 'comment:123:delete'`, rather than one global flag. The same key can feed the idempotency key (section 5).
- A time-based debounce like GOV.UK's 1 s is a minimal fallback. A flag held until the request settles is stronger, because on mobile a slow request can easily outlast 1 s.

### Gaps
- No major design system I fetched explicitly discusses locking sibling actions (e.g. other comments) during an in-flight request. The recommendations above are synthesized, not cited.

---

## 3. Optimistic UI vs. pessimistic updates for comments; error/retry UX

### Takeaway
Optimistic UI means showing the result immediately with a visible pending marker, then reconciling with the server. It suits frequent, low-stakes, high-success actions such as posting or editing a comment, as long as there is a clear pending state, an explicit error message, retry, and no loss of the user's typed text. Pessimistic UI, where the button stays busy until the server confirms, is safer for destructive or irreversible actions such as delete unless you offer undo, and for anything the server may reject (validation, permissions, moderation).

### Cited Findings
- React docs: optimistic state "is used to immediately present the user with the result of performing an Action, even though the Action actually takes time to complete." Pending items carry a flag ("(Adding...)"), and on success "the optimistic state updates to the confirmed item without the pending flag." On error, "the Transition still ends, and React renders with whatever value currently is," which reverts the UI, so you have to catch the error and show a message yourself. — [react.dev useOptimistic](https://react.dev/reference/react/useOptimistic)
- React docs caveat: setting an absolute value can go stale if base state changes mid-action. Recompute from the latest state. — [react.dev useOptimistic](https://react.dev/reference/react/useOptimistic)
- Practitioner guidance (blogs, lower authority): snapshot previous state and revert in `catch`. Keep optimistic patches small and reversible. Show a pending state so users don't assume success. Surface failures quickly (one source suggests about 2 s). Retries should use backoff, and the server should dedupe by request/action ID. Some prefer auto-retry, then manual retry or a failed-operations list, over silent rollback. Dropping a rejected optimistic edit can lose what the user typed. — [optimistic-ui-mutation-patterns](https://playbooks.com/skills/harborgrid-justin/lexiflow-premium/optimistic-ui-mutation-patterns); [DEV: React useOptimistic patterns 2026](https://dev.to/stacknotice/react-useoptimistic-optimistic-ui-patterns-that-actually-work-2026-5460); [Optimistic UI in Frontend Architecture](https://javascript.plainenglish.io/optimistic-ui-in-frontend-architecture-do-it-right-avoid-pitfalls-7507d713c19c)
- Primer: on failure, show "an error message that explains what went wrong," with a retry option if the user can retry. If the user stays on the page, show success as "a green checkmark or a success message." — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- Stripe: idempotency keys exist so that "if a connection error occurs, you can safely repeat the request without risk of creating a second object." This is what makes a client retry button safe. — [Stripe Idempotent requests](https://docs.stripe.com/api/idempotent_requests)

### Inferences
- **Post comment (optimistic is recommended):** append the comment right away with a muted style and a "전송 중…" marker, clear the input, and keep the draft text in memory. On failure, mark the comment "전송 실패" with "다시 시도" and "삭제" actions instead of removing it silently, or put the text back into the textarea. The user's text must never disappear. On retry, send the same idempotency key.
- **Edit comment:** optimistic display with "저장 중…" is fine. On failure, restore the old text, put the user's edit back into edit mode, and show an error. Don't throw the edit away.
- **Delete comment:** prefer pessimistic (dim plus "삭제 중…", remove on success). The alternative is optimistic removal plus a short "삭제됨 · 실행 취소" toast with the server call deferred, which is the undo pattern. Optimistic delete that rolls back later makes the comment "reappear," which is jarring.
- Pessimistic is the better default if the backend can reject content (length limits, profanity filters, auth expiry). In those cases the pending-then-fail path is common, and an optimistic flash would mislead.
- With optimistic UI, the double-submit risk shifts. The button is free again right away, but the same content can be sent twice, so the server-side dedupe in section 5 matters even more.

### Gaps
- I found no NN/g or major design-system article specifically on optimistic comment posting. The authoritative material is the React docs (framework-specific) plus blog posts. web.dev has no dedicated optimistic UI article that I could locate in this pass.
- No quantitative data (error rates, user preference) comparing optimistic and pessimistic comment UX.

---

## 4. Accessibility (aria-busy, aria-live, focus management, disabled focus loss, reduced motion)

### Takeaway
Keep the pressed button focusable: block it in JS, mark it `aria-disabled="true"`, don't use native `disabled`. Announce state changes through one live region that is rendered at page load (`role="status"`, polite). Use `aria-busy` on the region or list being updated, not as the main signal on the button. On error, move focus to the error or retry control. Spinners should be subtle. Sources disagree on whether `prefers-reduced-motion` should stop a spinner or only soften it.

### Cited Findings
- MDN `aria-busy`: a global state meaning an element "is being modified." Assistive tech "should wait until modifications are complete before exposing the content to the user," and the `aria-live` value governs how the change is announced once busy returns to false. Mainly for live regions, widgets and feeds. MDN says nothing about using it on buttons. — [MDN aria-busy](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy)
- Primer: status updates should use a `role="status"` element, "which must always be rendered," or an `aria-live` region. Set `aria-busy="true"` on a live region while it updates, then false. Avoid over-announcing. Loading indicators need text labels (can be visually hidden), as specific as possible. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- Primer focus guidance: "On failure, move focus to the first focusable element in the error message." When new content loads, move focus to its first focusable element. When a dialog closes, focus returns to the element that opened it. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- Polaris Spinner: provide an accessibility label (e.g. "Submitting") when no visible text says something is loading. In Polaris React, set `hasFocusableParent` when the spinner is inside a focusable element so the correct role is applied. — [Polaris Spinner](https://shopify.dev/docs/api/app-home/polaris-web-components/feedback/spinner); [Polaris React Spinner](https://polaris-react.shopify.com/components/feedback-indicators/spinner)
- Disabled-button focus loss: the GitLab issue reports focus lost when a loading button gets `disabled` and adopts `aria-disabled` instead. Gutenberg made the same switch in 2018 so that focus is not lost when undo/redo become unavailable. — [GitLab issue #2981](https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com/-/issues/2981); [WordPress Gutenberg PR (via search)](https://gitblind.noratr.app/WordPress/gutenberg/pull/11379)
- Salt design system: a disabled element should stay focusable "if the user or the system can enable" it, which describes a loading button that will become active again. — [Salt Button accessibility](https://saltdesignsystem.com/salt/components/button/accessibility)
- GOV.UK: "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible." — [GOV.UK Button](https://design-system.service.gov.uk/components/button/)
- Reduced motion: practice varies. GitLab keeps its spinner under reduced motion because it "can be considered essential to understanding the state of the application." Other systems swap the spin for a fade or pulse, slow it down, or nearly stop it. Per one secondary source, WCAG 2.3.3 (AAA) covers interaction-triggered motion and allows essential animation. I found no W3C statement on spinners specifically. — [GitLab Spinner](https://design.gitlab.com/components/spinner); [WCAG 2.3.3 explainer (disabilityworld.org)](https://www.disabilityworld.org/toolkit/standards/wcag/2-3-3-animation-from-interactions/)
- Primer: keep loading animations subtle, because large, flashy animations can harm motion-sensitive users. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)

### Inferences
- Concrete vanilla-JS a11y recipe:
  - One `<div role="status" class="sr-only" id="comment-status"></div>` in the initial HTML, never injected late. Set `textContent` to "댓글 등록 중…", then "댓글이 등록되었습니다" or "댓글 등록에 실패했습니다. 다시 시도 버튼을 누르세요." Use `role="alert"` (assertive) only for errors, if at all.
  - Button: `aria-disabled="true"` plus a JS guard. If the visible label changes ("저장 중…"), screen readers that re-read the focused button pick that up. If only a spinner shows, keep a visually hidden label or rely on the live region. Mark the spinner SVG `aria-hidden="true"` so it isn't announced twice.
  - Put `aria-busy="true"` on the comment list (or the single comment `<li>`) during optimistic insert or delete, and clear it on settle.
  - Focus after a successful post: keep focus in the (cleared) textarea so the user can keep typing, or move it to the new comment if that's the main next action. Don't let focus drop to `<body>`. After delete: move focus to the next or previous comment's action, or to the list heading, because the focused element was removed. After edit-save: return focus to that comment's Edit button. On error: focus the retry button or error text (Primer).
  - Reduced motion: `@media (prefers-reduced-motion: reduce) { .btn-spinner { animation-duration: 2.4s; } }`, or swap rotation for an opacity pulse. Don't hide the indicator, since the status is essential information.
- Mobile-specific: `aria-disabled` buttons still receive taps, so the JS guard must run on every activation path (`click`, form `submit`, Enter key). Don't use only `pointer-events:none`, which doesn't stop keyboard or AT activation.

### Gaps
- No primary source (MDN, APG) prescribes `aria-busy` on a button itself. Its effect on buttons across screen readers is undocumented in the sources I read.
- I found no authoritative testing data on how VoiceOver iOS and TalkBack announce a label change on a focused button. Worth device-testing.
- WCAG's position on spinners under reduced motion is an interpretation from secondary sources, not official guidance.

---

## 5. Server-side idempotency complement (why client-only locking isn't enough)

### Takeaway
Every source that addresses it says client locking is UX only. JS can fail or be bypassed, networks retry, and users refresh, so the server must dedupe. The standard mechanism is a client-generated `Idempotency-Key` (UUID v4) sent with POST/PATCH. The server stores the first result and replays it for retries, returns 409 while the original is still in flight, and returns 422 if the key is reused with a different payload.

### Cited Findings
- GOV.UK: `preventDoubleClick` "only works for users with JavaScript enabled," and you "should also think about the issue server-side to protect against attacks." — [GOV.UK Button](https://design-system.service.gov.uk/components/button/)
- Adrian Roselli: scripts can fail regardless of approach, so double submits must be handled on the back end even if the button is disabled. — [Don't Disable Form Controls](https://adrianroselli.com/2024/02/dont-disable-form-controls.html)
- Polaris: "Don't rely on `loading` alone to block repeated actions. Add debouncing or disable the action in your handler." — [Polaris Button](https://shopify.dev/docs/api/app-home/polaris-web-components/actions/button)
- Stripe (API v1): the client generates the key, V4 UUIDs suggested, up to 255 chars, no sensitive data. Stripe saves the status code and body of the first request, and retries return the saved response, "including 500 errors". Keys can be pruned after 24 hours or more. Parameters are compared, and a mismatch errors. If validation fails or there's a concurrent conflict, nothing is saved and the request is retryable. Only POST takes keys, since GET and DELETE are idempotent by definition. — [Stripe Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- IETF draft-ietf-httpapi-idempotency-key-header-07 (2025-10-15; **expired Internet-Draft, not an RFC**): the `Idempotency-Key` header makes POST/PATCH fault-tolerant. It recommends a UUID or similar random key, with an optional payload fingerprint. Responses: 400 if a required key is missing, 422 if a key is reused with a different payload, 409 Conflict if the original is still processing. A retry after completion SHOULD return the original result, success or error. Expiry policy is up to the resource and MUST be published if it applies. — [IETF datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/); [draft-07 HTML](https://www.ietf.org/archive/id/draft-ietf-httpapi-idempotency-key-header-07.html)

### Inferences
- Minimal implementation for a comments API:
  - Client: create `crypto.randomUUID()` when the user first presses submit, and keep it with the draft until success. Send `Idempotency-Key: <uuid>` on POST /comments and PATCH /comments/:id. Reuse the same key for the manual "다시 시도" retry. Generate a new key only when the content changes.
  - Server: a table or cache with `(user_id, key) → (status, response, payload_hash, created_at)` and a unique constraint on `(user_id, key)`, so a duplicate insert fails atomically. Return the stored response on replay and 409 while in flight. Expire after about 24 h, matching Stripe.
  - DELETE is naturally idempotent if a repeat delete returns 204/404 without side effects. Treat 404 on a retry as success in the UI.
- Cheap fallback without keys: reject an identical `(user, diary_id, body)` within N seconds. This is weaker, since it blocks legitimate identical comments and can't replay the response, but it's easy to add.
- Client locking still matters for UX: it prevents confusing duplicate optimistic entries and gives immediate feedback. The server key handles correctness. The two complement each other.

### Gaps
- Not checked in this pass: Firebase/Supabase-specific dedupe patterns, which may matter depending on the vocab-web backend.

---

## 6. Concrete guidance by design system (quick reference)

### Takeaway
The systems converge on four points. Give feedback on the button itself. Ignore repeat activations. Prefer a loading state over plain `disabled`. Back it with server-side checks. They differ on whether the loading button is semantically disabled: Atlassian and Polaris disable it, while GitLab, Roselli, Primer and GOV.UK prefer keeping it reachable or avoiding `disabled`.

### Cited Findings
- **GOV.UK Design System:** `data-prevent-double-click="true"` (Nunjucks `preventDoubleClick: true`) ignores a second click within 1 s, is off by default, and should be used only when production research shows duplicates. Give feedback (spinner or modal) for slow connections. Avoid disabled buttons. Also handle duplicates server-side. — [GOV.UK Button](https://design-system.service.gov.uk/components/button/); [button.mjs source](https://raw.githubusercontent.com/alphagov/govuk-frontend/main/packages/govuk-frontend/src/govuk/components/button/button.mjs)
- **Shopify Polaris:** the button's `loading` prop replaces content with an indicator and disables the button. Use `loading`, not `disabled`, for async work. Use specific labels ("Saving product..."). Still debounce in the handler. Use the button's loading prop, not a separate Spinner. — [Polaris Button](https://shopify.dev/docs/api/app-home/polaris-web-components/actions/button); [Polaris Spinner](https://shopify.dev/docs/api/app-home/polaris-web-components/feedback/spinner)
- **Atlassian:** `isLoading` puts a spinner in place of the label, disables the button and blocks interaction. Avoid `isDisabled` where possible (tab order). — [Atlassian Button examples](https://atlassian.design/components/button/examples)
- **GitHub Primer:** no loading state under 1 s. Indeterminate for 1–3 s. You may disable form controls after submit, but don't `aria-disabled` the trigger button. Use an always-rendered `role="status"`, `aria-busy` on live regions, focus to the error on failure, a success check or message, an error plus retry, and subtle motion. — [Primer Loading pattern](https://primer.style/product/ui-patterns/loading/)
- **GitLab Pajamas:** `accessibleLoading` uses `aria-disabled` instead of `disabled` to keep focus and screen-reader access. The spinner stays animated under reduced motion as essential. — [GitLab issue #2981](https://gitlab.com/gitlab-org/gitlab-services/design.gitlab.com/-/issues/2981); [GitLab Spinner](https://design.gitlab.com/components/spinner)
- **Apple HIG** (third-party mirror only): a button can show an activity indicator while an action completes and can change its label ("Checking out…"). Keep indicators moving. Don't switch indicator styles. — [HIG Buttons mirror](https://glama.ai/mcp/servers/@tmaasen/apple-dev-mcp/blob/b82f0efe2115dc4539c83a2374a714a84aeb350a/content/universal/buttons.md); [HIG Progress mirror](https://developer-mdn.apple.com/design/human-interface-guidelines/components/status/progress-indicators)
- **Material 3** (no official page retrieved): M3 Expressive adds a `LoadingIndicator` and `ContainedLoadingIndicator` (Jetpack Compose) for short waits where progress isn't measurable. Determinate mode morphs shapes from progress 0.0–1.0. No source found on a loading state inside M3 buttons. — [Compose LoadingIndicator (composables.com)](https://composables.com/jetpack-compose/androidx.compose.material3/material3/components/LoadingIndicator.md); [ContainedLoadingIndicator (developer.android.com)](https://developer.android.com/reference/kotlin/androidx/compose/material3/ContainedLoadingIndicator.composable); [material_3p mirror of M3 guidance](https://pub.dev/packages/material_3p)
- **NN/g:** 0.1 / 1 / 10 s limits. No looped animation under 1 s, but give immediate state change. Spinner for 2–10 s with explanatory text. Percent-done over 10 s. Don't write "don't click again", show that the first click registered. — [NN/g Response Times](https://www.nngroup.com/articles/response-times-3-important-limits/); [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)

### Inferences
- Consolidated vanilla-JS recipe consistent with all of the above (sketch, not from a single source):
  ```js
  async function runAction(btn, key, label, fn) {
    if (btn.dataset.busy) return;                 // JS guard (ignore repeat taps)
    btn.dataset.busy = '1';
    btn.setAttribute('aria-disabled', 'true');    // stay focusable; no native disabled
    btn.style.minWidth = btn.offsetWidth + 'px';  // width lock
    const original = btn.textContent;
    btn.textContent = label;                      // e.g. '저장 중…' (immediate, <100ms)
    status('저장 중…');                            // role=status live region
    let shownAt = 0;
    const t = setTimeout(() => { btn.classList.add('is-spinning'); shownAt = Date.now(); }, 400);
    try {
      const res = await fn(key);                  // key = crypto.randomUUID() kept with draft
      status('저장되었습니다');
      return res;
    } catch (e) {
      status('저장에 실패했습니다. 다시 시도해 주세요.');
      throw e;                                    // caller shows inline error + retry, moves focus
    } finally {
      clearTimeout(t);
      const wait = shownAt ? Math.max(0, 400 - (Date.now() - shownAt)) : 0; // min display
      setTimeout(() => {
        btn.classList.remove('is-spinning');
        btn.textContent = original;
        btn.removeAttribute('aria-disabled');
        btn.style.minWidth = '';
        delete btn.dataset.busy;
      }, wait);
    }
  }
  ```
  CSS: `[aria-disabled="true"]{opacity:.6;cursor:not-allowed}`, plus `@media (prefers-reduced-motion: reduce){ .is-spinning::after{ animation-duration:2s } }`.

### Gaps
- Material 3: the official m3.material.io pages (Buttons, Loading indicator) render client-side and couldn't be fetched. I couldn't confirm whether M3 defines a loading state inside buttons.
- Apple HIG: wording is from third-party mirrors only and should be checked on developer.apple.com.
- Firefox Acorn timing numbers (200 ms / 400 ms) are unverified because the page didn't render.
