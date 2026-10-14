# Comment and reply (댓글·대댓글) UI patterns on Korean mobile platforms

Method note: the clearest numbers below come from inspecting live production code on 2026-10-14. That means computed styles in Chrome, plus the shipped CSS/JS bundles fetched directly. The sources were:
- **Naver Cafe mobile web:** `ca-fe.pstatic.net/web-mobile` CSS and JS.
- **Brunch (브런치스토리):** web comment stylesheet, build `20260928`. This is the **PC web** layout because the inspecting browser was desktop.
- **당근 동네생활:** public web pages, `www.daangn.com/kr/community/...`, a responsive single column.

These are web builds. Native apps may differ slightly.

Not covered:
- **Naver Blog:** the browser tool refused the domain, and the comment-module CSS URL could not be found.
- **Daum Cafe:** the comment page redirected to Kakao login.
- **에브리타임:** login required.

Those three are listed under Gaps rather than guessed.

Color shorthand: Naver Cafe tokens resolve to two values each, one for light and one for dark. The light values are given where they could be told apart.

---

## 1. Single-comment layout: avatar, name, timestamp, text size/line-height, spacing, dividers, backgrounds

### Takeaway
The current Korean platforms share one anatomy:
- **Row:** a round avatar of 32–36px, then a gap of about 8px.
- **Name:** 13–16px, semibold.
- **Meta:** gray, 12–14px.
- **Body:** 15–16px with a 22–24px line-height (about 1.4–1.6), starting under the name.

The text column is indented by avatar + gap, so 40–44px. The split is in separation. Naver Cafe and Brunch use hairline dividers (#eee / #f5f6f7). 당근 uses whitespace only (16px gap, no borders).

### Cited Findings

**당근 동네생활 (web, computed styles, inspected 2026-10-14)**
- **Avatar:** 36×36px, `border-radius: 9999px`. The post-author avatar at the top of the post is larger, 56px. — [당근 동네생활 post](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Nickname:** 16px / line-height 24px, weight 600, color `rgb(26,28,32)` = #1A1C20. — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Meta line:** `동네명 · 6일 전`, in a `<time>` element. 14px / 20px, weight 400, color `rgb(134,139,148)` = #868B94. The middle-dot separator uses the same style. — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Comment body:** a `<p>` at 16px / 24px (1.5), color #1A1C20, **`word-break: keep-all`**. — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Geometry:**
  - The avatar sits at x=380 and the name/body at x=424, so the avatar is 36px with an 8px gap.
  - Inside a comment, a flex column with `gap: 8px` holds the header, body and action row.
  - The action row holds a like-count icon and a reply-count icon (`답글 수`). It is gray #868B94, 18px tall, `gap: 8px`.

  — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **List spacing:**
  - The top-level comment `<ul>` is `display:flex` (column) with **`gap: 16px`**.
  - Every `<li>` has `border: 0`, `padding: 0`, `margin: 0`, and a transparent background.
  - So separation is pure whitespace: no dividers, no cards.

  — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Section header:** `<h2>댓글</h2>` at 16px/24px. Below it is a sort toggle, `등록순 / 최신순`. — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Empty state:**
  - Text: `아직 댓글이 없어요`, then `가장 먼저 댓글을 남겨보세요.`
  - A `댓글 쓰기` button follows.

  — [당근 동네생활 post with 0 comments](https://www.daangn.com/kr/community/%EC%83%88%EB%B2%BD%EB%A7%8C-%EB%90%98%EB%A9%B4-%EC%9A%B0%EB%8A%94-%EA%B3%A0%EC%96%91%EC%9D%B4-%EA%B3%A0%EB%AF%BC-97dfybar5kkz/)
- **Font stack:** `-apple-system, BlinkMacSystemFont, "Pretendard Variable", …`. — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **SEED design system (당근):**
  - Type tokens pair size with line-height: t3 13/18, t4 14/19, **t5 16/22**, t6 18/24.
  - Weights are 400, 500 and 700.
  - The system font is used on iOS and Android, with Pretendard on Windows.
  - t1–t5 are meant for body text.
  - Live 동네생활 comments use 16/24 rather than t5's 16/22.

  — [SEED Typography](https://seed-design.io/docs/foundation/typography)

**Naver Cafe (mobile web `ca-fe` app CSS, article-comment variant `.CommonComment.ArticleComment`)**
- **Comment item:** `display:flex; padding:14px 0`, inset `margin: 0 16px` from the screen edge. The base variant uses `padding:18px 0 17px`.
- **Divider:** `border-bottom: 1px solid var(--cafe-color-dividerPrimary)`, which is #f5f6f7 in light mode.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Header:**
  - Avatar: **34×34px** circle with a subtle alpha overlay.
  - Nickname: **14px, weight 600**, `margin-left: 8px`.
  - The header row is 19px tall. The base list variant uses a 22px avatar and a 13px nickname.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Body:**
  - The comment content has `margin-top: 4px; padding-left: 42px` (34 + 8), so it aligns with the nickname.
  - Text: **16px / 22px**, weight 400, `letter-spacing: -0.3px`, color #111112, **`word-break: break-all`**.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Footer:**
  - It sits under the text with `padding-left: 42px`.
  - The **date comes after the text, not in the header**: 14px, gray `--cafe-color-onBackgroundAssist` (#8f9194 / #949699), `margin-right: 12px`.
  - Next to the date is a `답글쓰기` text button at 14px/19px in the same gray.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Right column (`.more_area`, 27px wide, `margin-left: 12px`):**
  - A ⋮ more button, 20×20, in the tertiary icon color.
  - A heart like button (30×30 hit icon) with its count stacked under it in 14px gray.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Backgrounds:**
  - Normal comments use `--themeColorBG1` (#fff).
  - **The viewer's own comment (`li.mine`) gets `--cafe-color-backgroundContainerPrimary` (#f5f6f7).**
  - BEST comments get their own `bestBackground`.
  - After the comment section comes a thick `border-bottom: 10px solid` divider (`dividerSecondary`).

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Sort chips:** pills 35px tall, `padding: 0 12px`, 14px text, `border-radius: 26px`, 1px border. The active chip has white text on a dark fill. — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Relative time (Naver Cafe JS):**
  - Under a minute: `방금 전`. Then `N분 전`, `N시간 전` and `N일 전`, the last for under 7 days.
  - After that: `MM.DD.` in the same year, otherwise `YYYY.MM.DD.`, with the trailing period included.
  - Another code path switches to `YYYY.MM.DD.` after 1 day.
  - The threshold constants are minified, so "minute/hour/day" is inferred from the output strings.

  — [Naver Cafe mobile JS bundle](https://ca-fe.pstatic.net/web-mobile/js/app.2dd3b3f070bc.js)

**Brunch (브런치스토리; web comment stylesheet, build 2026-09-28; PC layout)**
- **Avatar:** 32×32px circle (`border-radius: 42px`). The text column has `padding-left: 8px; width: calc(100% - 32px)`. — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Name and time:**
  - Name: 13px / 22px, color #111.
  - Time: 12px / 20px, color #959595, shown in English-style format such as `Jan 8. 2024` (seen on [brunch.co.kr/@brunch/1](https://brunch.co.kr/@brunch/1)).
  - The author badge is an outlined teal pill: 10px text, `border: 1px solid #00c6be`, `border-radius: 20px`, 17px tall.

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Body:** **15px / 24px (1.6)**, color #111, `word-wrap: break-word`, `margin-top: 12px` below the name row. — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Spacing:**
  - Each comment has **`margin: 36px 0`**.
  - List items are separated by `border-top: 1px solid #eee`. The first item has no border.
  - The overall look is airy and editorial.

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Font:** "Noto Sans DemiLight", "Malgun Gothic", sans-serif. — [Brunch, computed style on brunch.co.kr/@brunch/1](https://brunch.co.kr/@brunch/1)

**Older/secondary**
- **Initial comment count and order (요즘IT, May 2021):**
  - Naver Cafe showed 10 comments on the post body, oldest first, with replies counted.
  - 오늘의집 showed 5, newest first, with replies not counted.

  — [요즘IT, 실전 UI/UX 커뮤니티 설계](https://yozm.wishket.com/magazine/detail/670/) (2021, older)
- **Brunch** also loads older comments on demand with a `이전 댓글 더보기` bar at the top of the list: `border-top: 1px solid #ddd; padding-top: 16px`. — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)

### Inferences
- **Converged spec:**
  - Avatar 32–36px, gap 8px.
  - Text column indent 40–44px.
  - Name 14–16px, weight 600.
  - Meta 12–14px gray (#868B94–#959595 range).
  - Body 15–16px, line-height 22–24px.
  - Gaps between comments of 16px (no divider) up to 28–36px (with a divider).
- **For a two-person diary thread with few comments,** 당근's whitespace style fits best: 16px gap, no dividers. Naver Cafe's 1px #f5f6f7 hairline suits long, dense lists.
- **Body sizing:** Pairing a 16px body with a 24px line-height (1.5) matches both 당근 and KRDS's 150% minimum. Brunch's 1.6 suits a more literary tone, which is relevant for a diary.
- **Own-comment tint:** Naver Cafe's tint for "my comment" (#f5f6f7) is a cheap way to tell the two friends apart without names. In a two-person thread, a side or tint distinction may be more useful than repeating avatars.

### Gaps
- **Naver Blog:** no measured values. The Chrome tool blocked m.blog.naver.com, and the comment-box (`static.cbox`) CSS URL could not be found by fetching.
- **Daum Cafe:** the mobile comments page (`/comments`) redirected to Kakao login. Only a stray `.list_cmt .tit_info{padding-top:4px}` rule was found in its public mobile CSS.
- **에브리타임:** requires login. No public teardown with numbers was found.
- **KakaoStory:** not investigated, and no current source was found.
- **Brunch mobile:** numbers above are from the PC layout. The mobile-web CSS (`B.M.min.css`) did not contain the comment rules.

---

## 2. Replies (대댓글): indentation, connecting lines/ㄴ markers, "답글 N개" collapsing, @mentions

### Takeaway
None of the inspected platforms uses connecting lines or ㄴ glyphs today. All three indent replies by **one level only**, by about the parent's avatar width + gap:
- 당근 44px
- Brunch 40px
- Naver Cafe 42px plus a smaller 28px reply avatar

Reply targets are shown with an inline name mention. On Naver Cafe it is blue and bold; on Brunch it is a gray chip.

### Cited Findings
- **당근:**
  - The reply container has **`padding: 12px 0 0 44px`**, so the reply avatar lines up under the parent's text column.
  - Replies sit in their own flex `<ul>` with **`gap: 12px`**, tighter than the 16px between top-level comments.
  - The reply avatar stays 36px.
  - There are no borders or left lines (`border-left: 0`).

  — [당근 동네생활 post](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **당근:** each top-level comment shows a reply-count icon in its action row (`답글 수`). — [same page](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
- **Naver Cafe (article comments):**
  - A reply item (`li.reply`) has `padding: 14px 0 14px 42px` and **no border**, so replies visually attach to the parent.
  - The reply avatar shrinks to **28px**, with the nickname `margin-left: 8px`.
  - The reply's content and footer have `padding-left: 36px`.
  - The first top-level comment after a reply group gets a `border-top: 1px` divider to close the group.
  - Reply-write box: `padding-left: 42px`.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Naver Cafe reply-to mention:** `.reply_to { font-weight: 600; padding-right: 4px; color: var(--cafe-color-textBluelink) }`, which is #0076ff, prefixed inline to the reply text. — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Naver Cafe reply count:**
  - The count shows as `reply_num`: 13px, color #323232, with the number in bold (`em { font-weight: 700 }`).
  - It also appears on deleted (`blind_post`) comments, so their replies stay reachable.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Brunch:**
  - Replies sit in `.wrap_reply { padding-left: 40px }`, which is the 32px avatar + 8px gap.
  - The reply trigger is a text button, `.btn_reply`: 12px/20px, #959595, `margin-top: 14px`.
  - A `.btn_reply_more` ("more replies") button is 12px, #333, with `padding-top: 36px`.

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Brunch mentions:**
  - Inline chip `a.link_mention`: `background-color: #eee; color: #111; padding: 0 2px; margin: 0 2px; text-decoration: none`.
  - A variant `link_mention2` uses teal #00c6be.
  - The editor shows mentions with the same chip style (`._mention`).

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Collapsing (2021, older):**
  - Naver Cafe showed all replies with no collapsing.
  - 오늘의집 collapsed replies once there was more than one, behind `더보기`.
  - 당근 collapsed replies at 2 or more, behind `더보기`.

  — [요즘IT (2021)](https://yozm.wishket.com/magazine/detail/670/)
- **Mobile deep nesting:** Wikimedia's Korean wishlist page notes that indented threads break down on mobile, with text squeezed to one character per line. — [Wikimedia Community Wishlist W239 (ko)](https://meta.wikimedia.org/wiki/Community_Wishlist/W239/ko)
- **Two common Korean Android patterns:**
  - Tapping a comment opens a separate reply page.
  - Replies are expanded in place with "대댓글 보기", fetched lazily, Instagram-style.

  — [velog: 대댓글](https://velog.io/@silmxmail/대댓글) (developer blog, low authority)
- **KakaoTalk open chat** turned "답장" (reply-quote) into **댓글 threads** attached under a message:
  - Rolled out to open-chat communities in September 2025, then to general open chats in v26.1.0 on 2026-01-28.
  - Thread comments can carry photos, video, files and voice.
  - A setting can also show comments in the main chat.
  - 1:1 and regular group chats keep the old reply-quote.

  — [Design Compass, 2026-01-29](https://designcompass.org/2026/01/29/%EC%8A%AC%EB%9E%99%EC%9D%84-%EB%8B%AE%EC%9D%80-%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1-%EC%98%A4%ED%94%88%EC%B1%84%ED%8C%85-%EB%8C%93%EA%B8%80/)
- **KakaoTalk v26.4.0 (2026-05-15)** added comments on comments in open chat. — [Kakao corp press release](https://www.kakaocorp.com/page/detail/12037)

### Inferences
- **Depth:** cap at 1 level. Indent replies by exactly the avatar + gap (about 40–44px) so the reply avatar sits under the parent's text start.
- **Replying to a reply:** keep it at depth 1 and prefix `@이름`, as Naver Cafe does with a blue-bold name. Do not nest further.
- **No lines or glyphs:** the indent and the missing divider inside a reply group carry the hierarchy.
- **Collapsing:** with only two participants, it adds little. If needed, the 2021 당근 rule fits: collapse at 2 or more replies, with "답글 N개 더보기".
- **Smaller reply avatar:** Naver Cafe's 28px (vs 34px) is a subtle way to show hierarchy without wasting width on a 360px screen.

### Gaps
- No current (2025–26) live observation of a "답글 N개" collapse toggle on 당근: the inspected post had only one reply. The 2021 behavior may have changed.
- Naver Blog, Daum Cafe and 에브리타임 reply styling was not verified. 에브리타임's well-known reply-arrow icon could not be sourced.

---

## 3. Edit/delete placement, delete confirmation, "삭제된 댓글" and "수정됨" display

### Takeaway
Edit and delete live behind a **⋮/⋯ overflow button at the comment's top-right**, never as inline text links:
- Naver Cafe: 20×20 ⋮
- Brunch: a "설정" ⋯ that opens a small bordered dropdown

Deleting asks a plain `삭제하시겠습니까?` confirm. Deleted parents are **kept as a gray placeholder** so replies keep their context. No visible "수정됨" (edited) label was found.

### Cited Findings
- **Naver Cafe ⋮ button:**
  - `.btn_more`, 20×20px, `--cafe-color-iconTertiary`.
  - It sits in a 27px-wide right column above the like button.
  - It is absolutely positioned at `top: 13.5px; right: 0` in the base variant.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Naver Cafe delete flow:**
  - It calls a confirm dialog with `삭제하시겠습니까?`.
  - A BEST comment first warns `BEST 댓글로 선정된 댓글을 삭제하면 BEST 댓글 목록에서 제외됩니다.`

  — [Naver Cafe mobile JS bundle](https://ca-fe.pstatic.net/web-mobile/js/app.2dd3b3f070bc.js)
- **Naver Cafe deleted comment:**
  - Rendered as `<div class="blind_post"><p class="txt">삭제된 댓글입니다.</p></div>`.
  - Text: 16px/22px, gray `--cafe-color-onBackgroundAssist`.
  - It keeps its row (`padding: 14px 0`, same divider) and shows the reply count.
  - Blocked or filtered comments use similar `blind_txt` styling in `--cafe-color-onBackgroundTertiary` (#67696b).

  — [Naver Cafe mobile JS bundle](https://ca-fe.pstatic.net/web-mobile/js/app.2dd3b3f070bc.js); [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Naver Cafe edit:** editing opens a separate full screen (`.CommonCommentModify`), not inline:
  - Textarea min-height 256px.
  - Input 16px/22px.
  - Attachment thumbnails 50px.
  - Byte counter at right, 13px.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Naver Cafe "수정됨":** the string `수정됨` occurs 0 times in the Naver Cafe mobile JS bundles searched (app + vendors, about 6.4MB). By contrast, `삭제된 댓글` occurs 2 times and `답글쓰기` 2 times. — [Naver Cafe mobile JS bundle](https://ca-fe.pstatic.net/web-mobile/js/app.2dd3b3f070bc.js)
- **Brunch ⋯ menu:**
  - The settings button (`.comment_setting`) is absolutely positioned at `top: -1px; right: 0`, 12px, #959595.
  - It opens `.wrap_comment_menu`: `border: 1px solid #ddd`, positioned `right: 29px`.
  - Menu items: 13px/22px, `padding: 9px 29px`, #959595, separated by `1px solid #eee`, hover `#f8f8f8`.
  - For other people's comments the menu shows only `신고`.

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css); [brunch.co.kr/@brunch/1](https://brunch.co.kr/@brunch/1)
- **Brunch muted state:** the `type_alert` state turns both the name and the text #959595. Comments from withdrawn users show as `탈퇴한 회원` with the date kept. — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css); [brunch.co.kr/@brunch/1](https://brunch.co.kr/@brunch/1)
- **Brunch editing state:** the comment becomes `.comment.editing`, which suggests inline edit in place. The comment write box is reused (`.comment_editing .comment_write { width: 100% }`). — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **당근 deleted parent:**
  - Name: `알 수 없는 사용자`, 16px, 600, gray #868B94.
  - Text: `삭제되었거나 존재하지 않는 댓글이에요.`, 16px, gray.
  - A generic icon replaces the avatar, the timestamp is kept, and **replies under it still render**.
  - Moderation-hidden comments read `동네생활 운영정책에 따라 숨김 처리 되었어요.`
  - The copy uses the friendly `~요` style.

  — [당근 동네생활 post](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)

### Inferences
- **Overflow menu:** use a ⋯ button at the top-right of each of *your own* comments, with a hit area of at least 44×44 even if the glyph is 20px. The menu offers 수정 / 삭제.
- **Edit in place:** for 3-line diary comments, inline edit (Brunch-style) is lighter than Naver Cafe's full-screen edit.
- **Delete confirm:** a confirm sheet with `삭제할까요?` and buttons 취소 / 삭제 (red).
- **Deleted with replies:** show a gray `삭제된 댓글이에요` placeholder and keep the replies.
- **Deleted without replies:** remove the row entirely. This is an inference, not observed.
- **Edited marker:** since the major Korean platforms don't show one, it is optional. If shown, a gray `(수정됨)` after the timestamp, in the meta style, is the low-noise choice (an inference).

### Gaps
- Naver Cafe's ⋮ menu items (labels and order) for one's own comment were not observed, because observing them needs a logged-in session.
- 당근 and Brunch delete-confirm copy was not observed.
- No Korean platform was found showing a "수정됨" label. Naver Blog and 에브리타임 were not checked.

---

## 4. Comment input: fixed bar vs inline, placeholder, send button, counter, keyboard

### Takeaway
- **Naver Cafe mobile:** a collapsed **pill** input (`border-radius: 99px`) on a light-gray fill. Tapping expands it into a 6px-radius card with avatar + nickname, a byte counter (`N/max`) and a toolbar footer.
  - Placeholder: `댓글을 남겨보세요`, or `첫 댓글을 남겨보세요` when there are 0 comments.
- **Brunch:** a bordered box with a small pill submit button that switches from outline-gray to solid-black when there is text.
- **당근 (web):** shows a `댓글 쓰기` button.

### Cited Findings
- **Naver Cafe input wrapper:**
  - Wrapper: `padding: 16px 0 12px`.
  - Field: `margin: 0 16px; padding: 12px; border-radius: 99px; background: var(--cafe-color-backgroundContainerPrimary)` (#f5f6f7).
  - Textarea: 15px, transparent background, no border, `resize: none`, collapsed height 19px.
  - Placeholder color: #676767.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Naver Cafe expanded state (`type__open` / `type__write`):**
  - The field switches to `padding: 16px 16px 0; border-radius: 6px`, and the textarea grows to `height: 114px` (open) or `auto` (write).
  - Header row, 18px tall: an 18×18 round avatar and a 13px bold nickname on the left, and a counter (`.text_num`) on the right at 13px.
  - The counter renders `textBytes / maxBytes`, so it is **byte-based**.
  - Footer: 49px tall with a 0.5px top border, sticker and file icons (24px, 14px apart), and the action buttons on the right with `margin-left: 10px`.

  — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css); [Naver Cafe mobile JS bundle](https://ca-fe.pstatic.net/web-mobile/js/app.2dd3b3f070bc.js)
- **Naver Cafe placeholder logic:**
  - `첫 댓글을 남겨보세요` when the comment count is 0, otherwise `댓글을 남겨보세요`.
  - `댓글쓰기가 허용되지 않은 글입니다.` when commenting is disabled.

  — [Naver Cafe mobile JS bundle](https://ca-fe.pstatic.net/web-mobile/js/app.2dd3b3f070bc.js)
- **Naver Cafe non-member state:** inside the field sits a `btn_join` button at the top-right, 56×29px, `border-radius: 26px`, 13px weight 600. — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
- **Brunch write box:**
  - `.box_area`: `border: 1px solid #ddd`, white.
  - Textarea `.tf_area`: `min-height: 78px; padding: 12px 21px 0; line-height: 22px; white-space: pre-wrap`.
  - Placeholder: #959595 at the same offset.
  - Footer: 62px tall with `border-top: 1px solid #eee`.
  - Writer avatar: 28px.

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Brunch submit button:**
  - Default: 52×32px, `border-radius: 32px`, `border: 1px solid #bbb`, #666, 12px.
  - Active (`.on`): `background: #000; border-color: #000; color: #fff; font-weight: 600`.
  - Pattern: disabled-looking until there is input.

  — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **Brunch "응원(cheer)" comment layer:** textarea at 16px/24px, `min-height: 94px`, `padding: 15px 20px`, `border: 1px solid #ddd`, placeholder #bbb. — [Brunch, live stylesheet rule on brunch.co.kr/@brunch/1](https://brunch.co.kr/@brunch/1)
- **Brunch private-comment hint:** a lock icon with gray 12px text (`desc_comment_write .txt_g`, #959595). — [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **당근 (web):** the empty state has a `댓글 쓰기` button. Writing needs the app or login, so the input itself was not inspected. — [당근 동네생활 post with 0 comments](https://www.daangn.com/kr/community/%EC%83%88%EB%B2%BD%EB%A7%8C-%EB%90%98%EB%A9%B4-%EC%9A%B0%EB%8A%94-%EA%B3%A0%EC%96%91%EC%9D%B4-%EA%B3%A0%EB%AF%BC-97dfybar5kkz/)

### Inferences
- **For a diary app:**
  - A bottom-anchored pill input (Naver Cafe style): 16px side margin, light-gray fill, radius 999px when collapsed.
  - It grows into a rounded card while typing.
  - The send button stays muted until there is text, then turns to the brand color (Brunch's outline → solid pattern).
  - Placeholder: `첫 댓글을 남겨보세요` / `댓글을 남겨보세요`. In an English-learning context, an English placeholder such as "Write a comment in English…" may fit better.
- **Input font size:** use at least 16px. iOS Safari zooms the page when focusing inputs under 16px; this is common front-end knowledge, not verified in this research. Naver Cafe's 15px input works around it in other ways (not verified).
- **Counter:** show it only when approaching the limit. Naver Cafe always shows bytes, which is odd for English-only text. A character count suits English diary comments better.

### Gaps
- Keyboard behavior was not observable without a real device and login. That covers whether the input bar is `position: fixed` above the keyboard, `visualViewport` handling, and whether the list scrolls to the new comment.
- Naver Cafe's `maxBytes` value and the send button's exact styling were not extracted.
- Naver Blog, 에브리타임 and Daum Cafe inputs were not inspected.

---

## 5. Published guidance numbers (px/rem, contrast, touch targets) and Korean typography

### Takeaway
Primary numbers:
- **Body text:** KRDS sets at least 16px (17px default with Pretendard GOV) and **line-height of at least 150%**.
- **Contrast:** WCAG AA 4.5:1.
- **Touch targets:** 44×44px.
- **SEED (당근):** 16/22 for t5.

Live apps differ on Korean line breaking:
- 당근 sets `word-break: keep-all` on comment text.
- Naver Cafe uses `word-break: break-all`.
- Brunch ships a keep-all polyfill.

### Cited Findings
- **KRDS body text and line-height:**
  - Body text at least 16px: `본문 폰트 크기는 … 최소 16px 이상`.
  - Pretendard GOV base 17px, because it renders small.
  - Line-height at least 150%, written in % or em rather than px.
  - Letter-spacing 0 for body.

  — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **KRDS body token sizes:** 19, 17, 15 and 13px, all at 150%, in 400 or 700. They are the same on mobile and PC. Labels use the same scale. — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **KRDS weights:** 400, 500 and 700; use no more than about 4 weights. — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **KRDS contrast:**
  - AA: normal text 4.5:1, large text 3:1. AAA: 7:1 / 4.5:1.
  - Large text means 24px or more, or 18.66px or more when bold.
  - High-contrast mode: body 15:1.

  — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **KRDS rem base:** the page states both 16px and a 62.5% (10px) rem base, so it is internally inconsistent. — [KRDS 타이포그래피](https://www.krds.go.kr/html/site/style/style_03.html)
- **KRDS touch target:** the link component asks for at least **44×44px** for touch and 17×17px for mouse. This comes from a search-engine excerpt of the page; it was not fetched directly. — [KRDS 링크 컴포넌트](https://www.krds.go.kr/html/site/component/component_05_01.html)
- **KRDS standards basis:** KRDS follows KWCAG 2.2 and WCAG 2.1. — [KRDS 소개](https://www.krds.go.kr/html/site/utility/utility_01.html)
- **SEED type scale:**
  - t2 12/16, t3 13/18, t4 14/19, **t5 16/22**, t6 18/24, t7 20/27.
  - rem-based tokens respond to OS font scaling; "static" px variants do not.
  - Medium (500) renders inconsistently across Android and iOS system fonts.

  — [SEED Typography](https://seed-design.io/docs/foundation/typography)
- **Line breaking in live apps:**
  - **당근:** comment body computed `word-break: keep-all`. — [당근 동네생활 post](https://www.daangn.com/kr/community/%EC%83%A4%EC%9B%8C%EA%B8%B0%EA%B1%B0%EC%B9%98%EB%8C%80-%ED%9C%B4%EC%A7%80%EA%B1%B8%EC%9D%B4-%EC%88%98%EA%B1%B4%EA%B1%B8%EC%9D%B4-h9v1co6o28y6/)
  - **Naver Cafe:** comment `.txt` uses `word-break: break-all` and `letter-spacing: -0.3px`. Links inside use `word-break: break-word`. — [Naver Cafe mobile CSS](https://ca-fe.pstatic.net/web-mobile/css/app.da9ebbc5d389.css)
  - **Brunch:** the mobile HTML loads `jquery.word-break-keep-all.min-1.3.0.js`, a polyfill for Korean keep-all. Comment text uses `word-wrap: break-word`. — [brunch.co.kr/@brunch/1 page source](https://brunch.co.kr/@brunch/1); [Brunch comment CSS](https://t1.kakaocdn.net/brunch/home_front/prod/20260928145833/_astro/comment.CouC7HU1.css)
- **What keep-all does:** `word-break: keep-all` stops breaks between CJK characters, so Korean wraps at spaces (어절) instead of mid-word. — [MDN word-break](https://developer.mozilla.org/docs/Web/CSS/Reference/Properties/word-break)
- **Without keep-all, and text-wrap:** by default Korean breaks at any syllable. A Korean front-end guide recommends keep-all, and `text-wrap: balance / pretty` for nicer line distribution. — [달레 코딩: 어색하게 끊기는 한국어 줄바꿈 다듬는 법](https://daleseo.com/css-text-wrap/)
- **Comment font size as a reader preference:** the Korean community 다모앙 added a comment-only font-size setting (`commentFontSize`, 6 steps, default "same as body"). — [damoang.net bug/9365](https://damoang.net/bug/9365)

### Inferences
- **CSS starting point:**
  - Comment body: `font-size: 1rem` (16px), `line-height: 1.5`, `letter-spacing: 0` (or -0.2px to -0.3px for a Naver-like density), `word-break: keep-all`, `overflow-wrap: anywhere`.
  - Meta: 13–14px, line-height 1.4.
  - Name: 14–15px, weight 600.
- **Why `overflow-wrap: anywhere`:** it is the safety valve for long URLs or unspaced strings, which `keep-all` would otherwise let overflow.
- **English diary comments:** the content is mainly English, so `keep-all` only matters for Korean UI strings or mixed-language comments. It is harmless to apply globally.
- **Gray text contrast (estimates against #fff, not measured):**
  - #868B94 (당근 meta) is about 3.5:1, below 4.5:1 for small text.
  - #959595 (Brunch) is about 3:1.
  - #676767 is about 5.7:1.
  - For WCAG AA meta text, use about #6B7280 or darker. These ratios should be verified with a contrast tool.
- **Touch targets:** keep icon buttons (⋯, like, reply) at 44×44px hit area or larger, even when the glyph is 16–20px. Pad text buttons like `답글쓰기` vertically to reach about 44px; Naver Cafe's 14px/19px text button falls short.

### Gaps
- The KRDS 44×44px touch figure is from a search excerpt and was not opened directly.
- No KRDS guidance on `word-break: keep-all` was found; the typography page does not cover line breaking.
- No published Naver or Kakao design-system documentation on comment components was found. All Naver and Kakao numbers here come from shipped production CSS (observation, not guidelines).
- No authoritative source was found for a "Hangul needs more line-height than Latin" rule. Only KRDS's general minimum of 150% applies.
