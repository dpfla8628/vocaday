# Global Comment / Reply Thread UI Patterns (Platforms + Design Systems), for a Mobile Diary Comment Section

Scope note: These notes cover global platforms (Instagram, YouTube, Reddit, Facebook, X/Threads, Discord, Slack) and design systems (Material 3, Apple HIG, Atlassian, Ant Design, GitHub Primer). Researched October 2026. The only hard px numbers I could verify came from design-system source code (Ant Design 4.x LESS and Primer React CSS). Platform apps don't publish their pixel specs, and Material 3 and Apple HIG pages are JS-rendered, so I couldn't fetch them directly (see Gaps).

## 1. Single-comment layout on mobile (avatar, name + timestamp line, body text, spacing, relative timestamps)

### Takeaway
Comment components share one anatomy everywhere: a fixed-width avatar column on the left; a content column with a header line (author name, then a smaller grey timestamp, then an optional "Edited" marker); the body text; and a row of small text actions below. The only verified concrete numbers come from Ant Design 4.x: 32px avatar, 12px gap, 14px name/body, 12px meta/actions, line-height 1.5715, and 16px vertical padding per comment.

### Cited Findings
- **Ant Design Comment anatomy (4.x).** Props are `author`, `avatar`, `content`, `datetime`, `actions` (shown below the content) and `children` (nested comments). The 4.x docs list no defaults for sizes. — [Ant Design 4.x Comment docs](https://4x.ant.design/components/comment/)
- **Ant Design Comment CSS (4.x source), exact values:**
  - The comment's inner wrapper is `display:flex` with `padding: @comment-padding-base`, which equals `@padding-md 0` = **16px 0**. That gives 16px top and bottom per comment and no horizontal padding.
  - The avatar img is **32px × 32px**, `border-radius: 50%`, with `margin-right: @margin-sm` = **12px**, and the avatar column has `flex-shrink:0`.
  - The content column is `flex: 1 1 auto; min-width: 1px; word-wrap: break-word`.
  - The author row is `display:flex; flex-wrap:wrap` with `margin-bottom: @margin-xss` = **4px**. Spans inside it get `padding-right: 8px`, font-size **12px** and `line-height: 18px`. The author name gets font-size **14px**.
  - The time is `color: #ccc` with `white-space: nowrap`. The author name color is `@text-color-secondary` = rgba(0,0,0,0.45).
  - Body paragraphs use `white-space: pre-wrap`, which keeps the user's line breaks.
  - — [antd comment/style/index.less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/comment/style/index.less); [antd themes/default.less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/style/themes/default.less)
- **Ant Design base tokens:**
  - Spacing: `@margin-xss` 4px, `@margin-xs` 8px, `@margin-sm` 12px, `@padding-xs` 8px, `@padding-md` 16px.
  - Type: `@font-size-base` 14px, `@font-size-sm` 12px, `@line-height-base` 1.5715.
  - Avatar sizes: `@avatar-size-base` 32px, `@avatar-size-sm` 24px.
  - — [antd default.less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/style/themes/default.less)
- **Atlassian Comment** is built from separate parts: `Avatar`, `CommentAuthor`, `CommentTime`, an `edited` slot (`CommentEdited`), `content`, and `actions` (an array of `CommentAction`). The default heading level is `h3`, configurable with `headingLevel`; the docs say "Make sure that headings are in the correct order and don't skip levels." The examples page gives no avatar size. — [Atlassian Comment examples](https://atlassian.design/components/comment/examples)
- **Atlassian's "optimistic saving" mode** (`isSaving`) "hides actions and lets people know the comment is saving" by showing `savingText` (example: "Saving..."). The docs describe it as "a fast, responsive experience even on limited connections." — [Atlassian Comment examples](https://atlassian.design/components/comment/examples)
- **Primer Timeline (GitHub's PR/issue comment timeline) CSS:**
  - Items have **16px** (`--base-size-16`) top and bottom padding and a **16px** left margin.
  - The vertical connector is a **2px**-wide `::before` line in `--borderColor-muted`.
  - The badge is a **32×32px** circle.
  - The body has `margin-top: calc(4px + 1px)` and uses `--text-body-size-medium` in `--fgColor-muted`, with `min-width:0; max-width:100%`.
  - The avatar sits in a left gutter about 72px wide (`-(40px+32px)`).
  - — [Primer React Timeline.module.css](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Timeline/Timeline.module.css)
- **Primer condensed variant.** Padding drops to **4px** top and 0 bottom, and the badge shrinks to **16px** tall with 8px vertical margins and no background. The docs say it "Reduces vertical padding and removes background from an item's badge." — [Primer Timeline CSS](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Timeline/Timeline.module.css); [Primer Timeline docs](https://primer.style/components/timeline)
- **Primer's narrow-screen rule.** When the container is narrower than 480px, items switch to a two-column grid (`auto 1fr`), and the actions wrap onto a second row with `margin-top: 8px`. Actions have `min-height: 32px` and an 8px gap. — [Primer Timeline CSS](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Timeline/Timeline.module.css)
- **YouTube (2025 mobile redesign).** The comments section gained a thread design "making it easier to follow conversations and replies." — [Android Headlines, Oct 2025](https://www.androidheadlines.com/2025/10/youtubes-major-ui-redesign-is-now-hitting-android-and-ios.html)

### Inferences
- **Baseline spec for a two-friend diary thread, derived from the cited Ant Design numbers:**
  ```css
  .comment { display:flex; gap:12px; padding:16px 0; }
  .comment__avatar { width:32px; height:32px; border-radius:50%; flex-shrink:0; }
  .comment__body { flex:1 1 auto; min-width:0; overflow-wrap:anywhere; }
  .comment__meta { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px; margin-bottom:4px; }
  .comment__name { font-size:14px; font-weight:600; }
  .comment__time { font-size:12px; line-height:18px; color:var(--text-secondary); white-space:nowrap; }
  .comment__text { font-size:15px; line-height:1.5; white-space:pre-wrap; }
  ```
  - I bumped the body text to 15px (Ant Design uses 14px) because readers are learning English on a phone. This is a judgment call, not a sourced number.
  - Ant Design's `#ccc` timestamp color is likely too low-contrast on white. Use a secondary-text token that meets a 4.5:1 contrast ratio instead. This is my inference; I didn't measure it.
- **Accessibility headings.** Following Atlassian, give each comment's author line a consistent heading level (or use `<article>` with an accessible name) so screen-reader users can jump between comments.
- **Optimistic sending.** Since the app has only two users and replies should feel instant, use Atlassian's optimistic pattern: render the comment immediately with muted "Sending…" text and hide its actions until the server confirms.

### Gaps
- **Platform pixel specs.** I found no authoritative pixel specs (avatar size, font size, line-height, spacing between comments) for the Instagram, YouTube, Reddit, Facebook, X/Threads, Discord or Slack mobile apps. None of them publish design specs, and the teardown or measurement articles I looked for didn't surface. Any numbers attributed to these apps would need measuring from screenshots.
- **Relative timestamps.** I found no sourced guidance on relative timestamp formats. From unverified general familiarity: Instagram uses compact forms ("2h", "3d", "1w"), and YouTube uses long forms ("2 hours ago"), with "(edited)" appended. Treat both as unverified.
- **NN/g.** I couldn't find a Nielsen Norman Group article specifically on comment-thread layout. Search returned nothing relevant.
- **X/Threads.** I couldn't source the X/Threads single-post layout (the thread line connecting avatars in a self-thread).

## 2. Reply threading (indentation, thread lines, "View N replies" collapse, max nesting depth)

### Takeaway
Mainstream social apps (Facebook, Instagram, Slack) cap threading at one level of replies under a top-level comment. Only Reddit-style discussion apps nest deeply, and YouTube's 2025 redesign added a visual thread line but still doesn't thread replies-to-replies. Design systems nest replies by indenting them to line up with the parent's text column (Ant Design: 44px = 32px avatar + 12px gap) and draw thin 2px connector lines (Primer).

### Cited Findings
- **Ant Design nesting.** Nested comments are passed as `children` of the parent Comment. The `.ant-comment-nested` class gets `margin-left: @comment-nest-indent` = **44px**. That equals the 32px avatar plus the 12px gap, so a reply's avatar lines up with the parent's body text. — [antd comment less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/comment/style/index.less); [antd default.less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/style/themes/default.less); [Ant Design 4.x Comment docs](https://4x.ant.design/components/comment/)
- **Atlassian nesting.** "Comments can be nested inside of each other by passing comments as `children`." The docs give no indent values. — [Atlassian Comment examples](https://atlassian.design/components/comment/examples)
- **Primer connector line.** A 2px vertical line, `--borderColor-muted`, connects timeline items. `Timeline.Break` is a separator between groups: 24px tall with a thicker top border, and decorative only, so it is "not conveyed to assistive technologies." — [Primer Timeline CSS](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Timeline/Timeline.module.css); [Primer Timeline docs](https://primer.style/components/timeline)
- **Facebook.** It is described as supporting "only a single level of comment nesting." Because of that, it sometimes shows a same-level reply while the comment it answers is out of view. The same commenter suggests a "show parent" cue to restore context. (Third-party observation.) — [LessWrong/GreaterWrong comment](https://www.greaterwrong.com/posts/tFwNi24kXeZ2BzvZz/shortform-beta-launch/comment/QZEFhkQRKj6gWncdg)
- **Instagram.**
  - It originally showed comments on one flat level, which made conversations hard to follow, so it moved to threaded replies, bringing it closer to Facebook. — [Digital Trends](https://www.digitaltrends.com/?p=1228129)
  - In the Android test, "replies appear indented under the parent comment." — [WERSM](https://wersm.com/?p=49309)
  - As of July 2026, Instagram threads are described as two levels deep: a top-level comment and its replies. Replies are fetched separately from top-level comments. — [SociaVault blog, Jul 2026](https://sociavault.com/blog/instagram-comment-replies-api)
- **YouTube.**
  - YouTube tested a "Reddit-inspired threaded comment interface" for Premium users on Android and iOS, with "the updated design visually connecting main comments with their replies." The test ran until mid-August 2025. — [AlternativeTo, Jul 2025](https://alternativeto.net/news/2025/7/youtube-tests-threaded-comment-ui-and-nested-replies-for-premium-users)
  - The design later rolled out to non-Premium users. — [Android Authority](https://www.androidauthority.com/youtube-redesign-android-3609898/)
  - Critics called it mostly cosmetic. A thread line connects the commenter's profile picture with the replies below, but "once you open a specific comment's replies, unlike Reddit, all subsequent comments aren't threaded." — [Yahoo Tech (syndicated Android Police piece)](https://tech.yahoo.com/general/articles/youtubes-redesign-threading-thin-ice-182025815.html)
- **Reddit collapse.**
  - The official app reportedly defaults to tap-and-hold to collapse a thread, and a swipe-to-collapse gesture can be enabled under Settings → Advanced. This guide may be dated. — [Adweek guide](https://www.adweek.com/?p=1095355)
  - Users of Reddit-like apps complain that tap-to-collapse fires by accident when they meant to vote or tap a link. Some ask for a visible +/− indicator, and some clients add a "Swap tap and long press in comments" setting. These are user discussions, not official guidance. — [lemmy.mariusdavid.fr thread](https://lemmy.mariusdavid.fr/post/94118); [lemm.ee thread](https://lemm.ee/post/6948)
- **Slack mobile threads.** On mobile you open a thread by tapping a message and choosing "Reply in Thread," or by using the "Add a reply" field. A checkbox under the composer can also send the reply to the channel. On desktop a thread can be opened in a separate window. The help page doesn't say whether threads nest further. — [Slack Help: Use threads](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-)

### Inferences
- **Use a single level of replies.** Every mainstream social app either caps nesting at one level (Facebook, Instagram, Slack) or adds a cosmetic thread line without real deep nesting (YouTube). A diary thread between two friends doesn't need more. A reply to a reply stays at level 1, optionally prefixed with "@name". This also avoids the narrow-column problem on 360–390px phones.
- **Indent replies to the parent's text column.** Use `margin-left: 44px` (32px avatar + 12px gap, as in Ant Design), and consider a smaller avatar for replies (24px, Ant Design's `@avatar-size-sm`).
- **Optional thread line.** A 2px line in a muted border color (Primer) can run from under the parent's avatar down beside the replies:
  ```css
  .reply-list { margin-left:44px; position:relative; }
  .reply-list::before { content:""; position:absolute; left:-28px; top:0; bottom:0; width:2px; background:var(--border-muted); }
  ```
  `-28px` puts the line at the parent avatar's centre (16px from the left edge, 44 − 16 = 28).
- **Collapse.** With only two participants, reply counts stay small. Show all replies by default, or collapse only when there are more than 2–3, with a text button such as "View 3 more replies" that has a full-height touch target. Avoid Reddit-style tap-anywhere-to-collapse, given the mis-tap complaints above.

### Gaps
- I found no official documentation (help centre or design blog) from Instagram, Facebook or YouTube stating their exact maximum nesting depth or the wording and threshold of their "View N replies" control. The one source quoting the "View replies (5)" format was low quality, so I excluded it.
- I couldn't source how Discord threads (side threads with a "N Messages" link) or X/Threads reply chains look on mobile.

## 3. Placement of reply/edit/delete actions, deletion confirmation, "edited" indicators, deleted-comment placeholders

### Takeaway
Design systems put Reply, Edit and similar actions as small inline text links in a row under the body (Atlassian shows "Reply · Edit · Like" separated by middle dots; Ant Design uses 12px secondary-grey actions with a 12px top margin). Mobile apps also use long-press and swipe (Slack, Discord, Reddit). For deletion, NN/g says to prefer undo and to reserve confirmation dialogs for irreversible actions, with specific button labels. "Edited" is shown as a small label next to the timestamp (Facebook, Instagram, Discord, Atlassian). When a deleted comment has replies, Reddit keeps a placeholder so the replies stay readable.

### Cited Findings
- **Atlassian actions.** Actions are an array of `CommentAction` text actions. The examples render "Reply", "Edit" and "Like" separated by middle dots, below the content. — [Atlassian Comment examples](https://atlassian.design/components/comment/examples)
- **Ant Design actions.** `actions` are rendered "below the content." The CSS sets `margin-top: 12px` on the actions list, inline-block `li`s, `margin-right: 10px` between actions, font-size **12px**, color rgba(0,0,0,0.45) changing to #595959 on hover, and `user-select:none`. — [antd comment less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/comment/style/index.less); [antd default.less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/style/themes/default.less)
- **Primer actions.** Timeline actions are right-aligned (`margin-left:auto`, `align-self:flex-start`) with `min-height: 32px`. Below 480px container width they wrap to their own row. — [Primer Timeline CSS](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Timeline/Timeline.module.css)
- **Slack mobile.** Secondary message actions (for example "Send reply to this channel") are reached by pressing and holding the reply on mobile, versus the "three dots icon" on desktop. — [Slack Help: Use threads](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-)
- **Discord mobile.** After a UI change, swiping right-to-left on a message starts a reply. Some users found this unexpected because the gesture used to open the member list. (Community feedback.) — [Discord community: New Mobile UI Feedback](https://support.discord.com/hc/vi/community/posts/19989495753751-New-Discord-Mobile-UI-Feedback)
- **NN/g on confirm vs. undo** (Jakob Nielsen, Feb 2018, last reviewed Aug 2026). — [NN/g: Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/)
  - "consider a confirmation dialog before actions that cannot be undone."
  - "do try your best to offer undo."
  - "Do not use confirmation dialogs for routine actions."
  - Overuse trains people to click through: "if you cry wolf too many times, people will stop paying attention."
  - The dialog "must restate the user's request and explain what the computer is about to do."
  - Use action-specific button labels (the example is "Delete file" / "Keep file"), not Yes/No, and preferably no default answer.
- **Instagram "Edited" label (2026).**
  - Comment editing launched for all users in April 2026; sources differ on whether the date was April 9 or April 14.
  - Users get a **15-minute** edit window with unlimited edits inside it. After that, only delete is available.
  - Edited comments show an "Edited" label, but viewers can't see previous versions.
  - Only text can be edited, not GIFs or stickers.
  - — [Vaizle, Apr 2026](https://insights.vaizle.com/news/instagram-adds-comment-editing-with-a-15-minute-window); [Inro guide 2026](https://www.inro.social/blog/comment-editing-on-instagram)
- **Facebook "Edited" label.**
  - Comments show an "Edited" label even after Facebook removed the label from posts. — [VentureBeat](https://venturebeat.com/ai/facebook-makes-it-harder-to-notice-when-posts-are-edited)
  - The label appears next to the timestamp, and clicking it opens the edit history. — [Louise Myers guide](https://louisem.com/1620/how-to-edit-facebook-comment); [Adweek (older, launch-era)](https://www.adweek.com/socialtimes/edit-past-comments/3)
- **Discord "(edited)" label.** A small "(edited)" text label appears inline beside edited messages. A community feature request asks to replace it with a pencil icon that reveals details on hover, because the label clutters messages. — [Discord community request](https://support.discord.com/hc/vi/community/posts/360042841131-Changing-the-position-of-the-edited-label-A-new-icon-for-it-QoL-change)
- **Atlassian "edited" marker.** "Mark a comment as edited by passing a `CommentEdited` component to the `edited` prop." It sits in the header with the author and time. — [Atlassian Comment examples](https://atlassian.design/components/comment/examples)
- **Deleted placeholders.**
  - On Reddit, by user accounts, a creator-deleted comment stays in place with a "deleted" placeholder and its replies remain visible. Lemmy, by contrast, hides replies when the parent is deleted. — [lemm.ee user comment](https://lemm.ee/post/4488635/2351116)
  - Reddit shows "[deleted]" (deleted by the user) and "[removed]" (removed by moderators) as distinct placeholders. — [Tildes thread, Jun 2023](https://tildes.net/~tech/16on/reddit_is_silently_restoring_deleted_edited_comments)
  - These are user reports, not official Reddit documentation.
- **Discord deletion.** Discord has no visible "deleted" stamp by default. A community feature request asks for a "(deleted)" placeholder that reveals the deletion time on hover. That implies deleted messages currently just disappear. — [Discord community request](https://support.discord.com/hc/it/community/posts/360042614551-Delete-Time-Stamps)

### Inferences
- **Action placement for the diary app.** Show "Reply" as a visible inline text action under every comment. It's the most frequent action and the one people need to discover. Put "Edit" and "Delete" (own comments only) behind a `⋯` overflow button at the end of the header row, or inline as text if you want everything visible.
  - At Ant Design's 12px text size, each action needs an enlarged hit area, for example `min-height:44px` and horizontal padding (see Section 5). The visual size can stay small.
  - If you add long-press, treat it as a shortcut, never the only path. The Slack and Discord gesture reports show that gesture-only actions are hard to discover and easy to trigger by accident.
- **Deletion.** For a casual diary comment, follow NN/g's undo-first advice: delete immediately (optimistically) and show a snackbar, "Comment deleted · Undo", for about 5 seconds. The 5-second figure is a common convention, not sourced here.
  - If you can't implement undo, use a confirm dialog titled "Delete this comment?" with the buttons "Delete" (destructive colour) and "Cancel"/"Keep", and no default selection.
- **"Edited" marker.** Put a small "· Edited" (or "(edited)") label in the meta line right after the timestamp, in the same 12px secondary colour. You can also adopt Instagram's 15-minute edit window to keep friends' replies coherent.
- **Deleted comment with replies.** Keep a placeholder row such as "This comment was deleted." in italic secondary text, without avatar emphasis, so the replies keep their context (the Reddit model). If there are no replies, remove the row entirely.

### Gaps
- I found no official help-centre documentation for Instagram, YouTube or Facebook describing the exact delete confirmation UX (dialog vs. sheet) or deleted-comment placeholder text.
- Slack's help page didn't mention its placeholder text for deleted thread parents or its edited indicator. I couldn't confirm the exact Slack wording.
- I found no source for X/Threads edit or delete UI.

## 4. Comment composer (sticky bottom vs. inline, send button states, multi-line growth)

### Takeaway
Messaging-style threads (Slack mobile's "Add a reply" field) use a composer pinned to the bottom of the screen. Convention, documented in chat SDKs, is to disable Send when the input is empty or only whitespace, and also while a send is in flight to prevent duplicates. For IME users, don't submit on Enter while composition is in progress. The disabled state needs enough contrast and a clear reason, because disabled buttons cause usability problems.

### Cited Findings
- **Slack mobile composer.** On mobile, you reply via "Reply in Thread" or the "Add a reply" field in the thread view. A checkbox under the reply field also sends the reply to the channel. — [Slack Help: Use threads](https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-)
- **MUI X Chat Composer.** The send button is disabled when the text area is empty and there are no queued attachments, and also while a response is streaming. Enter shouldn't submit during IME composition. — [MUI X Chat Composer](https://mui.com/x/react-chat/basics/composer/)
- **Stream Chat.** Keep send controls disabled when there is no sendable data. — [Stream Chat RN: message input customization](https://getstream.io/chat/docs/sdk/react-native/guides/message-input-customization/)
- **assistant-ui.** The Send primitive is disabled when the composer is empty. — [assistant-ui Composer primitive](https://www.assistant-ui.com/docs/api-reference/primitives/composer.md)
- **Disabled-button critique.** Disabled buttons "often have insufficient contrast" and don't have a focused state, and users may not know why a control is unavailable. The same article cites Slack and Microsoft Teams as keeping Send disabled until the user types. — [UX Planet: Disabled buttons](https://uxplanet.org/disabled-buttons-ux-usability-issues-and-how-to-avoid-them-8f2246186e80)
- **Insert Chat.** Disable the button during processing to prevent duplicate submission. A mic icon can stand in when the input is empty (optional pattern). — [Insert Chat glossary: Send button](https://insertchat.com/glossary/send-button)

### Inferences
- **Sticky composer.** Pin a composer to the bottom of the diary's comment view: `position: sticky; bottom: 0`, with `padding-bottom: calc(8px + env(safe-area-inset-bottom))`.
  - Also handle the on-screen keyboard: `interactive-widget=resizes-content` in the viewport meta, or the `visualViewport` API.
  - When the user taps "Reply" on a comment, focus the same composer and show a dismissible "Replying to {name} ×" chip above it, rather than opening a separate inline box. This mirrors Slack's "Add a reply" field.
- **Auto-growing textarea.**
  - Start at one line (`rows=1`, roughly 40–44px tall including padding).
  - Grow with content up to about 4–5 lines (`max-height` ≈ 120px), then scroll internally. In browsers that support it, `field-sizing: content` grows the field without JavaScript.
  - Use a 16px input font. iOS Safari zooms into inputs under 16px; this is common knowledge, not sourced here.
- **Send button states.**
  - Disabled when `value.trim()===''`.
  - Disabled and showing a spinner while the request is in flight.
  - Enabled otherwise.
  - Keep the disabled icon at about 38% opacity or more, or a clearly greyed colour, and keep the button's 44×44 hit area in every state.
- **Enter key and IME.** Because users may switch to a Korean IME, check `event.isComposing` (or `keyCode 229`) before treating Enter as submit. On mobile, the safer default is Enter = newline and Send button = submit.

### Gaps
- I found no authoritative source (platform docs or NN/g) on Instagram, YouTube or Facebook mobile composer specifics: their sticky composer heights, placeholder copy, or growth limits.
- I found no usability research comparing sticky-bottom and inline reply composers for comment threads. The guidance above comes from vendor docs and convention.

## 5. Design-system guidance with numbers (Material 3, Apple HIG, Atlassian, Ant Design, Primer)

### Takeaway
The numbers to build on are touch targets of at least 48×48dp (Material) and at least 44×44pt (Apple). WCAG 2.2 sets 24×24 CSS px at AA and 44×44 at AAA. For spacing, the Ant Design and Primer tokens follow 4/8/12/16 steps. For component sizes, use a 32px avatar (24px small), a 44px reply indent, 14px body and 12px meta at line-height 1.5715 (Ant Design), and Primer's 16px item padding, 2px connector line, and 32px action min-height, with actions wrapping below 480px.

### Cited Findings
- **Touch targets.** Apple HIG recommends 44×44pt minimum and Google Material Design recommends 48×48dp minimum. These figures come from secondary sources that link to Material 2 docs, so the Material 3 page itself is not verified. — [specification.website: Touch target size](https://specification.website/spec/accessibility/touch-target-size/); [Front-End Checklist: touch targets](https://frontendchecklist.io/rules/accessibility/touch-targets)
- **WCAG 2.2.** AA requires 24×24 CSS px, and 44×44 CSS px is the AAA level. Google's 48dp exceeds both. These sizes correspond to roughly 9–12mm physically. — [Front-End Checklist](https://frontendchecklist.io/rules/accessibility/touch-targets); [OpenReplay: improving tap targets](https://blog.openreplay.com/improving-tap-targets-mobile-ux/)
- **Ant Design 4.x Comment tokens.**
  - `@comment-padding-base` 16px 0, `@comment-nest-indent` 44px.
  - Avatar 32px, avatar–content gap 12px, author row margin-bottom 4px.
  - Name and body 14px, time and actions 12px with line-height 18px.
  - Actions margin-top 12px and margin-right 10px between actions; time color #ccc.
  - Base line-height 1.5715.
  - — [antd comment less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/comment/style/index.less); [antd default.less](https://raw.githubusercontent.com/ant-design/ant-design/4.x-stable/components/style/themes/default.less)
  - Note: Comment is a 4.x component. I didn't verify its v5 status (it is commonly said to have moved to `@ant-design/compatible`), and the 4.x docs page doesn't mention it.
- **Primer React Timeline tokens.**
  - Item padding 16px (condensed: 4px top, 0 bottom); badge 32×32 (condensed: 16px tall).
  - Connector line 2px in `--borderColor-muted`; break 24px tall.
  - Actions min-height 32px with an 8px gap; a container query at 480px wraps actions to their own row with an 8px top margin.
  - — [Primer Timeline CSS](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Timeline/Timeline.module.css)
- **Atlassian Comment** gives structure and states but no numbers on its examples page.
  - Parts: avatar, author, time, `edited`, `actions`, nested `children`.
  - States: `isSaving` with `savingText`, `highlighted`, `restrictedTo` (for example "Restricted to Admins"), and `headingLevel` (default h3).
  - — [Atlassian Comment examples](https://atlassian.design/components/comment/examples)

### Inferences
- **Token set reconciling these sources (8pt-grid friendly, with 4px half-steps):**
  ```css
  :root{
    --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
    --avatar:32px; --avatar-reply:24px; --reply-indent:44px;   /* antd */
    --font-body:15px; --lh-body:1.5; --font-meta:12px; --lh-meta:18px;
    --touch-min:44px;                                          /* HIG 44pt; use 48px if you follow Material */
    --thread-line:2px;                                         /* Primer */
  }
  .comment-action{ font-size:var(--font-meta); min-height:var(--touch-min); min-width:var(--touch-min);
    display:inline-flex; align-items:center; padding:0 var(--space-2); margin-left:calc(-1*var(--space-2)); }
  ```
  The negative margin keeps the action text visually aligned with the body text while the hit area extends to 44px. Primer's 32px action min-height is fine for desktop pointers but below the HIG and Material mobile minimums, so raise it to 44–48px on touch screens.
- **Avoid hit-area overlap.** When the 44px hit areas of adjacent actions ("Reply", "⋯") would overlap, put at least 8px between them. That matches Material's 8dp rhythm (inference).

### Gaps
- I couldn't fetch the Material Design 3 and Apple HIG pages directly because both are JS-rendered and returned only titles. So I couldn't quote:
  - M3's exact list-item heights (one-, two- and three-line)
  - M3's 4dp baseline grid wording
  - HIG's exact 44×44pt wording, its default 17pt body text size, or spacing guidance
  The 44pt and 48dp figures rest on consistent secondary sources. A spec-strict team should verify them against m3.material.io and developer.apple.com.
- I couldn't find Atlassian Comment's numeric tokens (avatar size, nested indent) on the public examples page; the source code wasn't fetched.
- I found no NN/g article specifically on comment or reply thread design.
