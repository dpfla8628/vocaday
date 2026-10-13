# Learning UX patterns: 말해보카, 스픽 (Speak), Duolingo, 클래스카드, 산타 보카, for a 2-person web vocab and cloze quiz app

Research date: 2026-10-13. Correction to the brief: 말해보카 is made by **ePopSoft (이팝소프트)**, not 이퀄리. It launched in December 2019 ([Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4); [Unicorn Factory company page](https://www.unicornfactory.co.kr/datalab/startup/company/이팝소프트/110111-6902202)). 이팝 is its overseas edition ([Unicorn Factory 2025](https://www.unicornfactory.co.kr/article/2025052210190224265)).

## Q1. How does 말해보카's word learning flow work (level test, card, multiple choice, cloze, speaking, wrong-answer review, daily goal, league, streak)?

### Takeaway
The core vocab loop in 말해보카 is a single screen. It shows a native-written English sentence with one blank and a Korean translation, and the learner **types** the missing word (or says it in voice mode). There is no separate "word card, then multiple choice" sequence. Grading has three outcomes (정답 / 비슷 / 오답). Hints are staged. Every answer feeds a spaced-repetition scheduler that also uses response speed and hesitation. A daily goal (as low as 5 questions) drives the streak. Weekly tiered leagues award points per item studied.

### Cited Findings
**Onboarding / level test**
- On first launch the app gives a 20-word vocabulary quiz to place the learner ("20문제만 풀면 말해보카 AI가 내 레벨을 파악") — [App Store KR listing](https://apps.apple.com/KR/app/id1460766549); [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- The result screen shows a national percentile ("대한민국 상위 ~%") and a 30-level graph that splits words into known, probably known and unknown. It also recommends a target "어휘 이해도" of 93.3% or higher (99% for users already above 92%) — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- The word bank has about 34,000 words ordered by real usage frequency, from everyday words up to specialist terms. Example sentences are written by native speakers — [Unicorn Factory 2021](https://www.unicornfactory.co.kr/article/2021062317113820109)
- In settings, learners can pick a word source (드라마, 영화, 교과서, 시험, 유튜브, or an integrated course) and a new-word difficulty — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)

**Quiz screen (vocab tab)**
- Format: an English sentence with a blank plus its Korean translation. The learner types the missing word. Grading is 정답 (correct), 비슷 (close or similar), or 오답 (wrong) — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4); [Unicorn Factory 2021](https://www.unicornfactory.co.kr/article/2021062317113820109)
- Input modes: keyboard mode (typing) or 음성 모드 (speech recognition). Speaking is built into the same quiz; it is not a separate later step — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- Hints: "힌트 보기" shows the first 1 to 2 letters. "정답 보기" reveals the answer, and that word is then counted as wrong — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- A UX review says hints are deliberately not shown right away, so the learner tries recall first. A "보너스 힌트" separates synonyms that would be accepted from near-synonyms that would not. A tooltip shows the typed text while typing to reduce typos — [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d)
- After a correct answer the app sometimes adds an etymology note or a nuance note ("애매한 뉘앙스까지 설명") — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4); [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d)
- "발음 정밀 진단" scores pronunciation per phonetic segment and gives a total score — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)

**Other tabs (each a distinct question type)**
- 문법 tab (added March 2023): the learner arranges shuffled word cards to match a Korean meaning. A wrong arrangement shows an explanation and a retry — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4); [App Store KR](https://apps.apple.com/KR/app/id1460766549)
- 리스닝 tab: the learner hears a sentence and types or speaks it, with up to 3 listens. The grade depends on listens used: Perfect (1), Great (2), Good (3), Nice Try (failed). The level runs from 1 to 50; Perfect gives +2, Great 0, Good or Nice Try −3 — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- 표현 tab (January 2025) teaches phrases using the same hint, answer and wrong-answer-note system. A 표현 사전 was added in April 2025. A 실전 회화 tab (December 2025) uses episodes, sentence submission, and grades of Nice try / Good / Excellent / Perfect — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- **Removed:** YouTube-clip cloze quizzes (Friends, TED) were discontinued on 2023-03-30 — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)

**Review / 오답노트 / SRS**
- Review intervals run from minutes to 24 hours to years (the listing says "분단위, 24시간뒤 2,3년뒤"; Namu Wiki says about 10 minutes to 6–12 months). Intervals depend on accuracy and speed and are based on the forgetting curve. Due words come back automatically as quiz items — [App Store KR](https://apps.apple.com/kr/app/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4-%EC%98%81%EB%8B%A8%EC%96%B4-%EB%AC%B8%EB%B2%95-%EB%A6%AC%EC%8A%A4%EB%8B%9D-%EC%8A%A4%ED%94%BC%ED%82%B9-%EC%98%81%EC%96%B4-%EA%B3%B5%EB%B6%80/id1460766549); [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- Hesitation signal: if the learner answered correctly but typed and deleted repeatedly or hesitated, the word comes back after 1 day — [Unicorn Factory 2021](https://www.unicornfactory.co.kr/article/2021062317113820109)
- Wrong answers are logged to the 오답노트 automatically and sorted into 정답 / 비슷 / 오답. The 학습 내역 view shows newly learned, reviewed and already-known words, plus review accuracy. Recall logs list recently forgotten, most-often-forgotten and longest-held words. A "복습을 더 많이 하기" setting increases review frequency — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- A "히스토리 학습" button at the bottom of the 오답노트 starts a review of the wrong answers. As of that review, 문법 and 리스닝 had no 오답노트 — [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d)
- The company claims learners retain over 90% of the words they learn. This is self-reported and unverified — [Unicorn Factory 2021](https://www.unicornfactory.co.kr/article/2021062317113820109)

**Daily goal / streak**
- Vocab daily goal presets: 여유롭게 20, 적당하게 30, 열심히 50, 열정적으로 100, or a custom value from 10 to 500. Listening presets are 5/10/20/50. The study day resets at **4 AM**, not midnight. The study reminder defaults to 8:30 PM and can be set in 10-minute steps — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- Streak: "연속 학습 시스템이 도입됐어요. 하루에 5문제를 풀면 불꽃이 피어올라요!" (release notes, v1.2.364, around 2025-10-29) — [App Store KR](https://apps.apple.com/kr/app/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4-%EC%98%81%EB%8B%A8%EC%96%B4-%EB%AC%B8%EB%B2%95-%EB%A6%AC%EC%8A%A4%EB%8B%9D-%EC%8A%A4%ED%94%BC%ED%82%B9-%EC%98%81%EC%96%B4-%EA%B3%B5%EB%B6%80/id1460766549)
- 학습 체크 replaced the older attendance check (older feature, removed). It is a calendar with a trophy per tab completed and a 별사탕 stamp when several tabs are done, and it shows first study day, total days and current consecutive days — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- A trophy icon (daily goal met) and a blue-star icon (total words learned) sit in one info area. The reviewer mistook the star for currency, which shows these icons are ambiguous — [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d)

**League**
- Added in April 2021. There are 12 tiers: 브론즈 → 실버 → 골드 → 사파이어 → 루비 → 에메랄드 → 가넷 → 오닉스 → 아메시스트 → 아쿠아마린 → 마스터 → 그랜드마스터. The week runs from Sunday 9 PM to Sunday 9 PM KST, with promotion, stay and relegation zones — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- Points are per item, weighted by effort: vocab word 20 PT, grammar 30, listening 20 (multiple choice) or 30 (typed), conversation 40, new expression 50, expression review 30. Since May 2025 a relegation shield can be bought with 다이아. "Seasons" were replaced by 환생 (rebirth): promoting out of Grandmaster resets the learner to Ruby with rewards — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- The CEO calls the league "a powerful tool that strengthens learning will". A "global competition mode" launched in July 2025 — [Unicorn Factory search snippets](https://www.unicornfactory.co.kr/article/2025073015444665866)
- The company reports an average of about 35 minutes of study per day among paid users (unverified) — [Unicorn Factory](https://www.unicornfactory.co.kr/article/2025073015444665866)

**Rewards**
- Learners earn 다이아 from achievements (어휘 마스터, 학습 대장, 노력의 증표 …) and spend them on collectible characters ("버디즈") — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)

### Inferences
- For a web app, the most replicable 말해보카 pattern is the **sentence-with-blank, type-the-word** screen. The Korean translation acts as the cue. The first-letter hint and a "show answer" option count the item as wrong. Grading is three-way, and "close" covers typos and inflection variants (e.g. Levenshtein distance ≤1 or a lemma match).
- Response time and backspace count are cheap signals to log on the web. They can stand in for 말해보카's hesitation rule: a correct answer that was slow or edited a lot gets a short interval.
- The 4 AM day boundary is a useful detail for night-owl users.
- For 2 people, the 12-tier league is overkill. Weekly per-item points with effort weights (typed > multiple choice) can be kept as a head-to-head weekly score.

### Gaps
- The brief described a "word card → multiple choice → cloze → speaking" sequence. I found no source that shows this sequence in 말해보카; current sources describe cloze typing as the main format. Multiple choice appears only in listening (at 20 PT).
- No source describes the exact correct/incorrect animations, sounds or colours in 말해보카.
- I found no description of a friends-only leaderboard. The only social feature documented is a premium invite code, and multi-person plans were removed in September 2025.

## Q2. How does 스픽 (Speak) structure lessons (빈칸 채우기, 따라말하기, everyday expression patterns, feedback)?

### Takeaway
Speak is speaking-first. Every lesson follows **Learn → Practice → Apply**: a new expression is introduced, then drilled by speaking it many times, then used in an AI roleplay. Fill-in-the-blank appears only in the lighter "Vocab Builder" and review exercises. Feedback is fast but shallow.

### Cited Findings
- The official structure is Learn (expressions taught 1:1 style, said aloud right away), Practice ("'스피킹 연습'에서는 20분이면 100문장을 말할 수 있습니다"), and Apply (AI roleplay where the learner picks the partner and situation) — [App Store KR](https://apps.apple.com/kr/app/%EC%8A%A4%ED%94%BD-speak-%EC%98%81%EC%96%B4%ED%9A%8C%ED%99%94-%EC%8A%A4%ED%94%BC%ED%82%B9-%EB%B0%9C%EC%9D%8C/id1286609883)
- There are five lesson types. Tutor Lesson is guided, sometimes with video. Speaking Drill is sentence repetition where "words light up as you say them". Vocab Builder uses "simple matching and fill-in-the-blank games". Roleplay has 3 tasks and ends automatically. Tutor Q&A expects a specific answer. Tutor Lessons and Vocab Builders are frequent at beginner level and nearly absent at higher levels — [Languatalk 2026 review](https://languatalk.com/blog/speak-app-review/)
- Feedback: after a roleplay the learner gets "a short summary of errors" and can generate a review lesson from it. Review is "Speaking Drill-style exercises, with no variation". Speech grading is lenient: one can "reverse the word order entirely and still receive a perfect score". Saved phrases go to a Phrasebook but are never brought back into lessons — [Languatalk](https://languatalk.com/blog/speak-app-review/)
- Smart Review (스마트 리뷰) schedules review of past expressions. A user describes older intervals of 3/7/15 days and says the current intervals are inconsistent. A 2020 review mentions 따라읽기 and fill-in-the-blank (블랭크) inside smart review — [App Store KR reviews](https://apps.apple.com/kr/app/%EC%8A%A4%ED%94%BD-speak-%EC%98%81%EC%96%B4%ED%9A%8C%ED%99%94-%EC%8A%A4%ED%94%BC%ED%82%B9-%EB%B0%9C%EC%9D%8C/id1286609883)
- Recent additions: "나만의 수업" (late 2025), where the learner types a real situation and gets a custom lesson. "스픽 레벨" shows level and progress. A user complains that speech recognition sometimes misses correct answers — [App Store KR](https://apps.apple.com/kr/app/%EC%8A%A4%ED%94%BD-speak-%EC%98%81%EC%96%B4%ED%9A%8C%ED%99%94-%EC%8A%A4%ED%94%BC%ED%82%B9-%EB%B0%9C%EC%9D%8C/id1286609883); [고구마팜 user review](https://gogumafarm.kr/?p=3589)
- Pricing (KRW): monthly 29,000, annual 129,000, Premium Plus 69,000/month or 299,000/year — [App Store KR](https://apps.apple.com/kr/app/%EC%8A%A4%ED%94%BD-speak-%EC%98%81%EC%96%B4%ED%9A%8C%ED%99%94-%EC%8A%A4%ED%94%BC%ED%82%B9-%EB%B0%9C%EC%9D%8C/id1286609883)
- A Korean user says they started from the basics as a total beginner. They valued choosing their own starting level and the daily-habit structure — [고구마팜](https://gogumafarm.kr/?p=3589)

### Inferences
- From Speak, a text web app can borrow the **expression-unit lesson**: introduce one pattern (e.g. "I'm thinking of ~ing"), then show 5–10 cloze sentences that reuse it, then add a short free-production prompt. A "words light up" effect can be imitated by highlighting each token as it is typed correctly.
- Speak's weaknesses point to two fixes: give a specific explanation on a wrong answer, and make review vary the question type instead of repeating the same drill.

### Gaps
- I found no detailed screen-level walkthrough of Speak's "pattern" lessons (일상 표현 패턴) or of its exact feedback UI (colours, sounds).
- Streak and daily-goal mechanics in Speak were not documented in the sources I reached ("꾸준함을 돕는 기능" is mentioned without detail).

## Q3. Which quiz question types are used, and which work best for retention?

### Takeaway
Across these apps the common set is: meaning→word (typed or multiple choice), word→meaning (multiple choice or matching), cloze sentence (typed), word ordering / sentence building, and listen-and-type (dictation). Research favours **productive recall** (typing) over recognition (multiple choice) for long-term retention and spelling. Multiple choice with plausible distractors still helps as a warm-up, so the best design is easy-to-hard within a session.

### Cited Findings
- 말해보카: typed cloze (main format), word-card ordering (grammar), listen-and-type or listen-and-speak, and multiple-choice listening (20 PT vs 30 PT for typed) — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- Duolingo lesson of about 15 challenges, ordered easy to hard: 1–3 multiple choice ("Select the correct translation"), 4–7 word bank ("Tap the words to form a sentence"), 8–11 typing ("Type what you hear"), 12–14 mixed, and 15 often easier so the lesson "ends on success". This comes from a third-party design guide and is illustrative, not official — [Blake Crosley Duolingo guide](https://blakecrosley.com/guides/design/duolingo)
- Speak: matching and fill-in-the-blank (Vocab Builder), plus repeat-after-me drills — [Languatalk](https://languatalk.com/blog/speak-app-review/)
- 클래스카드: "과학적인 3단계 암기학습". It also offers 스펠 학습, a subjective (typed) test graded automatically, a "테스트" with a target score, word and sentence speaking, and dictation — [App Store 클래스카드](https://apps.apple.com/app/id1176435331)
- Recall formats were more effective than recognition for productive spelling knowledge (64 students, Swahili-English pairs) — [De Gruyter IRAL](https://www.degruyterbrill.com/document/doi/10.1515/iral-2015-0022/html?lang=en)
- In children, retrieval practice beat restudy on cued recall after one week, but there was no difference on a multiple-choice test — [EUR repository](https://repub.eur.nl/pub/58790)
- Multiple-choice items with plausible distractors can trigger productive retrieval and even help learners remember the wrong options — [Psychological Science](https://www.psychologicalscience.org/journals/psychological-science/0956797612443370/)
- Recognition tasks such as multiple choice and matching are less challenging, and recall exercises tend to give better retention (Quizlet-focused paper) — [NUS e-FLT](https://e-flt.nus.edu.sg/v17n22020/platzer.pdf)

### Inferences
- Suggested ladder for a word in this app: (1) first exposure as a word→meaning multiple-choice question with 3 plausible distractors from the same part of speech or level; (2) meaning→word multiple choice; (3) **typed cloze in a sentence with a Korean translation** (the strongest step and the 말해보카 core); (4) optional sentence ordering for the example sentence. In SRS reviews, use mostly the typed cloze.
- Recognition and recall can be scored differently, like 말해보카 (20 vs 30 PT): typed answers earn more.

### Gaps
- 클래스카드's exact 3 steps (commonly called 암기 / 리콜 / 스펠) and its matching game were not confirmed in the sources reached.
- **산타 보카: no reliable source found.** Searches returned only 말해보카 and 똑똑보카. I could not confirm the product name or its current status in 2026.

## Q4. Feedback design: correct/incorrect animation, sound, explanations, progress bar, end-of-session summary

### Takeaway
The standard pattern, shown most clearly in Duolingo, is a bottom sheet that slides up after "Check". On a correct answer it is green with a short praise word, a positive sound and "CONTINUE". On a wrong answer it is red with "Correct solution: …", a soft error sound and "GOT IT". A thick rounded progress bar sits at the top and advances even on mistakes. 말해보카 adds graded outcomes (비슷), nuance or etymology notes, and an automatic 오답노트.

### Cited Findings
- Duolingo correct: a green banner "✓ Great!", a positive sound and a single "CONTINUE" button. Incorrect: a red banner (#ff4b4b, white text), "✗ Correct solution:" with the right answer, a gentle wrong sound and a "GOT IT" button. The banner slides up over 200 ms ease-out — [Blake Crosley](https://blakecrosley.com/guides/design/duolingo) (author's reconstruction, not official code)
- Progress bar: height 16 px, radius 8 px, track #e5e5e5, fill #58cc02, width animates over 300 ms; "Even wrong answers advance progress slightly" — [Blake Crosley](https://blakecrosley.com/guides/design/duolingo)
- Hearts limit mistakes per session and can be refilled, which adds stakes without permanent failure — [Blake Crosley](https://blakecrosley.com/guides/design/duolingo)
- A Pratt critique says that "almost every motion" gets feedback from animation, page transition and sound. "Check" and "Continue" sit in the same right-side spot, matching the expected "next" position — [Pratt IXD critique](https://ixd.prattsi.org/2021/09/design-critique-duolingo-web-app/)
- One writer describes a subtle "oops" tone versus a cheerful correct tone that becomes a "cue for progress, recognition, reward" (anecdotal) — [The Cognitive Load](https://thecognitiveload.substack.com/p/a-40-day-duolingo-streak)
- Duolingo uses animation for the most rewarding moments, such as the owl waving with a "well done" speech bubble — [Design Week 2019](https://www.designweek.co.uk/issues/2-6-january-2019/duolingo-owl-receives-makeover-as-app-becomes-more-gamified)
- 말해보카 listening uses grades rather than binary right/wrong (Perfect / Great / Good / Nice Try), and "정답 보기" counts as wrong — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- Speak's post-session feedback is "a short summary of errors" plus a button to generate a review lesson — [Languatalk](https://languatalk.com/blog/speak-app-review/)

### Inferences
- Web recipe: answer input → Enter key = Check → bottom sheet (green or red) → Enter key = Continue. Keep the button in the same place for both states. Use the Web Audio API or short mp3 files for the two tones, with a mute toggle. On a wrong cloze answer, show the full sentence with the correct word highlighted, the Korean translation and an optional one-line note.
- End-of-session summary built from the patterns above: items done, accuracy %, time, points earned, words learned, a list of missed words (feeding the 오답노트) with a "다시 풀기" button, and streak status.

### Gaps
- No source gave exact end-of-session screen contents for Duolingo (XP, accuracy, time) or for 말해보카.
- No official Duolingo source was fetched. design.duolingo.com was referenced but not opened.

## Q5. Social and accountability features suited to 2 people

### Takeaway
For two friends, the most transferable mechanics are a **shared (friend) streak**, a **weekly joint quest** with a common target, and a **weekly head-to-head points race** (a two-person version of 말해보카's league). The daily goal should be small (5 questions, as in 말해보카) so a streak is easy to keep.

### Cited Findings
- Duolingo Friend Streak: a separate streak with each of up to 5 friends. Both must do a lesson daily, and a missed day breaks it — [Duolingo blog](https://blog.duolingo.com/friend-streak/)
- Duolingo Friends Quests: each week the learner is paired with one friend on a random challenge (XP target, number of perfect lessons, etc.) and has 5 days to finish it. At the time of the article this was not available on web — [Duolingo blog](https://blog.duolingo.com/friends-quests/)
- 말해보카's weekly league has effort-weighted points, a fixed weekly reset (Sunday 9 PM) and promotion/relegation zones. Last-minute cramming before the cutoff is common — [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- The UX review notes that showing other users "currently studying" in the league motivates learners — [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d)
- 말해보카 streak threshold: 5 questions per day lights the flame — [App Store KR](https://apps.apple.com/kr/app/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4-%EC%98%81%EB%8B%A8%EC%96%B4-%EB%AC%B8%EB%B2%95-%EB%A6%AC%EC%8A%A4%EB%8B%9D-%EC%8A%A4%ED%94%BC%ED%82%B9-%EC%98%81%EC%96%B4-%EA%B3%B5%EB%B6%80/id1460766549)
- Duolingo streak UI: a flame icon with the day count and a Mon–Sun row of dots. The flame animates faster when the streak is at risk, with "Complete a lesson to extend your streak!". Streak freezes protect a missed day — [Blake Crosley](https://blakecrosley.com/guides/design/duolingo)

### Inferences
- Two-person home screen: two avatars side by side, each with today's progress ring (X/goal), personal streak and weekly points. Between them, a shared "우리 연속 N일" streak flame and a weekly joint-quest bar (e.g. "이번 주 함께 300문제"). The week can reset on Sunday night, like 말해보카.
- A "studying now" indicator (last active timestamp) is cheap and copies the league presence cue.
- A shared 오답노트 view ("친구가 많이 틀린 단어") could be a new feature for two people. This is an idea, not something documented in these apps.

### Gaps
- I found no documentation of a friends-only comparison feature in 말해보카 or Speak.

## Q6. Visual design traits that make these apps feel clean and quiz-like

### Takeaway
The quiz look comes from a white background with one strong brand colour, large rounded cards and buttons, **3D "pressable" buttons** (a darker bottom border), a thick rounded progress bar, bold uppercase button labels, and strict green/red semantic colours used only for feedback. 말해보카 adds a character or mascot layer and gem-tier league colours.

### Cited Findings
- Duolingo tokens (reconstructed by a third party): green #58cc02 with a #58a700 4 px bottom border, radius 16 px, padding 14×24. On press the border goes to 0 and the button moves 4 px down. Red #ff4b4b. Text #4b4b4b (primary) and #afafaf (secondary). Buttons are 17 px, weight 700, uppercase, letter-spacing 0.8 px. The progress track is #e5e5e5 — [Blake Crosley](https://blakecrosley.com/guides/design/duolingo)
- Duolingo's mascot and animation are kept for "rewarding" moments, not every screen — [Design Week](https://www.designweek.co.uk/issues/2-6-january-2019/duolingo-owl-receives-makeover-as-app-becomes-more-gamified)
- 말해보카 UX critique: putting icons for currency (다이아), goal trophy and total words in one area caused confusion. The reviewer suggests putting currency at the top and the study summary on the main screen — [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d)
- 말해보카 sells itself as "영어 공부도 게임처럼 재밌게!", with collectible characters (니니 default, 츄, 쿠키, 쨈미니 …) and gem-named league tiers — [Weekly UX/UI Challenge](https://weeklyuxuichallenge.oopy.io/b160f04c-08c0-4bfb-80bc-9255bccfcb1d); [Namu Wiki](https://namu.wiki/w/%EB%A7%90%ED%95%B4%EB%B3%B4%EC%B9%B4)
- A user found 말해보카's shop items "너무 올드" — [App Store KR review via search](https://apps.apple.com/KR/app/id1460766549)

### Inferences
- Web CSS starting point: one primary colour plus semantic success and error colours; 16 px radius cards; a 3D button using `border-bottom: 4px solid darker` with `:active { transform: translateY(4px); border-bottom-width: 0 }`; a 16 px progress bar; 18–20 px body text with the cloze sentence at 22–26 px. Draw the blank as an underlined inline input whose width fits the answer length (a first-letter hint can fill the input). Keep icons for goal, streak and points clearly separate to avoid the 말해보카 confusion.
- Use Pretendard or Noto Sans KR for Korean and English (a common choice; not sourced from these apps).

### Gaps
- I found no sourced colour palette or typography for 말해보카 or Speak. The UX critique's screenshots were images only, so their visual traits could not be extracted as text.
