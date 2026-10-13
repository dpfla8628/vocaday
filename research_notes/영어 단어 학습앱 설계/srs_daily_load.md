# SRS Design for Wrong-Answer Review and Daily Study Load (vocab/grammar quiz web app)

## Q1. Leitner box system: boxes, intervals, wrong-answer rule, pros/cons vs SM-2

### Takeaway
Leitner is a box ladder. A correct answer moves a card up one box, which means a longer interval. A wrong answer sends it back to box 1. The original rule is "back to box 1", and "back one box" is a common softer variant. Leitner has no fixed canonical intervals, so a doubling-ish ladder such as 1-2-4-7-15-30 days is a design choice, not a standard. It is the simplest scheme to build on a JSON or SQLite store, and with binary grading it ends up close to SM-2 anyway (see Q2).

### Cited Findings
- Sebastian Leitner, a German science journalist, proposed the system in 1972. His original box had partitions of 1, 2, 5, 8 and 14 cm, which implies 5 compartments. A partition was reviewed when it filled up, not on fixed days. — [Wikipedia: Leitner system](https://en.wikipedia.org/wiki/Leitner_system)
- Rule: a correct answer promotes the card one box. "If they fail, they send it back to the first group." A variant moves wrong cards back only one box. Example 3-box schedule: box 1 daily, box 2 every 3 days, box 3 every 5 days. — [Wikipedia: Leitner system](https://en.wikipedia.org/wiki/Leitner_system)
- The one-box-back variant appears in study guides ([Lecturio](https://www.lecturio.com/blog/revamp-your-revision-with-the-leitner-system/)). SuperMemo's wiki calls it an "incorrect mutation" and says Duolingo used it for a while. — [supermemo.guru: Leitner](https://supermemo.guru/wiki/Leitner)
- Intervals vary by source. One example is box 1 = 3 days, box 2 = 7, box 3 = 14, box 4 = 30, box 5 = retired. — [Exam Study Expert](https://examstudyexpert.com/leitner-system/); [York subject guide](https://subjectguides.york.ac.uk/study-revision/leitner-system)
- SuperMemo argues Leitner is "often incorrectly labelled" as spaced repetition because it does not compute optimal intervals. — [supermemo.guru: Leitner](https://supermemo.guru/wiki/Leitner)
- Pimsleur's graduated interval recall (1967) used 11 intervals growing roughly 5x each step: 5 s, 25 s, 2 min, 10 min, 1 h, 5 h, 1 day, 5 days, 25 days, 4 months, 2 years. The paper notes nobody knows why he chose base 5 or 11 steps. — [UVic CALICO paper (PDF)](https://www.uvic.ca/humanities/germanicslavic/assets/docs/RetentionCalico.pdf)
- Spacing research: the best gap between study sessions depends on how long you need to remember. It is about 20-40% of a 1-week retention interval and about 5-10% of a 1-year retention interval (Cepeda, Vul, Rohrer, Wixted & Pashler 2008, n > 1,350). The gap-vs-retention curve rises then slowly falls, so a gap that is too long costs less than one that is too short. — [PubMed 19076480](https://pubmed.ncbi.nlm.nih.gov/19076480/); [PDF](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf)
- Kim & Webb (2022), a meta-analysis in *Language Learning* 72(1):269-319, supports spaced practice for L2 learning, including vocabulary. Effects vary by content type, learner group and activity, and some sub-analyses are tentative. — [Univ. Barcelona review citing it](https://diposit.ub.edu/server/api/core/bitstreams/911f8da8-9666-4917-9411-c9ae6754cd7b/content)

### Inferences
- Recommended ladder for this app: **box 0 (new or just failed) -> 1 -> 2 -> 4 -> 7 -> 15 -> 30 days**, then "mastered". Each step is roughly 2x, which sits between Pimsleur's 5x and the gentler steps in the study guides. That suits the app's target of retaining words for weeks to months (see the Cepeda ratios).
- Wrong answer: **reset to box 1 (due tomorrow) and requeue the card in the same session** (see Q3). Over successive days this is the "compounding" effect: a word missed today comes back tomorrow, again 2 days later, and so on until it climbs the ladder. A word missed repeatedly keeps coming back daily.
- For friends who want a gentler feel, "drop 2 boxes" is a reasonable middle ground between the original and one-box-back rules. Expose it as a constant, not a user setting.
- Pros of Leitner: one integer per card (`box`) plus `due_date`. It is easy to explain to users ("box 3 of 6") and easy to show as progress.
- Cons of Leitner: it does not adapt per item. An easy word and a hard word on the same box get the same interval. Leech handling (Q3) partly makes up for this.
- Suggested schema: `{word_id, box:int, due:date, reps:int, lapses:int, last_result:bool, last_seen:date, correct_count:int, wrong_count:int}`.

### Gaps
- I found no study that compares a 1-2-4-7-15-30 Leitner ladder head-to-head with SM-2 or FSRS on vocabulary. The FSRS benchmark compares against SM-2, not Leitner.
- I could not open the Kim & Webb (2022) full abstract or effect sizes. The summary above comes from a secondary review.

## Q2. SM-2 and FSRS: formulas, defaults, and whether binary right/wrong grading works

### Takeaway
SM-2 is a few lines of arithmetic: intervals of 1 day, then 6 days, then the previous interval times EF, with EF starting at 2.5 and floored at 1.3. FSRS is more accurate, but it needs 21 trained parameters and an optimizer, which is overkill for a small app. Binary grading works. FSRS on Anki and the official SM-2 pass/fail rules both handle it. With pure binary input, SM-2's ease never changes, so it reduces to a fixed exponential ladder.

### Cited Findings
- **SM-2, original SuperMemo spec:**
  - Starting values: EF = 2.5, I(1) = 1 day, I(2) = 6 days. For n > 2, I(n) = I(n-1) × EF, with fractions rounded up.
  - Grades: q runs from 0 to 5 (5 perfect, 4 correct after hesitation, 3 correct with serious difficulty, 2/1/0 incorrect).
  - EF update: `EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))`, with EF floored at 1.3.
  - If q < 3: restart repetitions from I(1) "without changing the E-Factor".
  - Same-session rule: "After each repetition session of a given day repeat again all items that scored below four... until all of these items score at least four."
  - — [SuperMemo: SM-2 algorithm](https://super-memory.com/english/ol/sm2.htm)
- **Anki (SM-2-derived) defaults** on the deck-options page: starting ease 2.50, easy bonus 1.30, interval modifier 1.00, hard interval 1.20. New interval after a lapse is 0.00, meaning a reset to the minimum interval of 1 day. Maximum interval is 100 years. Desired retention under FSRS defaults to 90%. — [Anki Manual: Deck Options](https://docs.ankiweb.net/deck-options.html)
- **FSRS model.** Three variables per card, called the DSR model:
  - Retrievability R: the probability of recall right now.
  - Stability S: the days it takes for R to fall from 100% to 90%.
  - Difficulty D.
  - Example: "S = 365 means that an entire year will pass before the probability of recalling a particular card drops to 90%." Desired retention between 70% and 97% is "considered reasonable", and "higher retention leads to more reviews per day."
  - Simulations show FSRS needs about 20-30% fewer reviews than SM-2 for the same retention.
  - — [awesome-fsrs wiki: ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)
- **FSRS-6 details:**
  - 21 parameters. Defaults: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542].
  - Forgetting curve: `R(t,S) = (1 + factor·t/S)^(-w20)`, where `factor = 0.9^(-1/w20) - 1`, so R(S,S) = 90%.
  - Grades: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
  - FSRS-6 adds a same-day review stability term: `S' = S·e^(w17·(G-3+w18))·S^(-w19)`.
  - — [awesome-fsrs wiki: The Algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)
  - In FSRS-4.5 the interval for a target retention r is `I = S/FACTOR · (r^(1/DECAY) - 1)`, so I = S when r = 0.9. — same page
  - Taken together, the defaults w0..w3 are the initial stability in days for each first grade (about 0.2 for Again, 1.3 for Hard, 2.3 for Good, 8.3 for Easy). The wiki's FSRS-6 section does not state this mapping explicitly.
- **Binary grading:** an Anki forum analysis of FSRS-4.5 found FSRS was *more* accurate (lower RMSE) for users who only press Again and Good. The author later noted that "further research was inconclusive", so treat this as preliminary evidence that pass/fail is at least not harmful. — [Anki Forums: Pass/Fail Grading as Default](https://forums.ankiweb.net/t/pass-fail-grading-as-default/34147/36)
- Anki's own True Retention statistic already treats grading as binary: Again is a fail and Hard, Good and Easy are passes. — [Anki Manual: Statistics](https://docs.ankiweb.net/stats.html)
- **Duolingo's model:** half-life regression (Settles & Meeder, ACL 2016). Recall is modelled as `p = 2^(-Δ/h)`, where h is a learned half-life. It cut recall-prediction error by more than 45% against baselines. In A/B tests it raised practice-session retention by 9.5% and overall activity by 12%. — [Duolingo blog](https://blog.duolingo.com/how-we-learn-how-you-learn); [ACL P16-1174](https://preview.aclanthology.org/landing_page/P16-1174)

### Inferences
- **Binary SM-2 reduces to a fixed ladder.** Map correct to q = 4: the EF delta is 0.1 - 1×(0.08+0.02) = 0.0, so EF stays 2.5. Map wrong to q ≤ 2, which resets with EF unchanged. Intervals become 1, 6, 15, 38, 95 days, which is just a steeper Leitner ladder. For SM-2 to adapt per item under binary grading, add a rule. Two options:
  - Use answer speed: a fast correct answer counts as q = 5 (EF +0.10), a normal correct answer as q = 4 (EF +0.00).
  - Lower EF on each lapse, for example EF -= 0.2 with a floor of 1.3. This is similar to Anki's lapse penalty, but that value was not verified in this session.
- **Recommendation for a small app:** Leitner, or binary SM-2 with the speed and lapse tweaks. Store the per-card fields `ease, interval, due, reps, lapses`. FSRS is only worth adopting through an existing library (FSRS packages exist for JS and Python) if the developer wants it later. Its state fits in 3 numbers per card plus `last_review`, so the schema can migrate.
- Multiple-choice quizzes leak recognition. A typed answer is a stronger "correct" signal than picking from 4 options. Consider counting multiple-choice correct as q = 4 and typed correct as q = 5. This is a design suggestion, not a researched finding.

### Gaps
- The FSRS-6 formulas for difficulty initialization and update, and for post-success and post-lapse stability, were not on the fetched wiki section. The v4 and v5 sections cover them, but I did not extract them.
- I found no official FSRS statement on two-button mode beyond the forum analysis.

## Q3. Backlog explosion, review caps, prioritization, same-session relearning

### Takeaway
Cap reviews per day. When over the cap, show the *most overdue relative to interval* first. Pause new cards while a backlog exists. Requeue every wrong answer within the same session until it is answered correctly once. That requeue is SM-2's step 7 and Anki's learning/relearning steps.

### Cited Findings
- Anki has a "Maximum reviews/day" limit. "New cards ignore review limit" is **off** by default, so new cards are suppressed once the review limit is hit. With a backlog, Anki recommends stopping new cards until you catch up. — [Anki Manual: Deck Options](https://docs.ankiweb.net/deck-options.html)
- Anki review sort options include due date then random (the default recommendation when up to date), ascending or descending interval, ascending or descending ease, and **relative overdueness**. Under FSRS the equivalent is ascending retrievability. — [Anki Manual: Deck Options](https://docs.ankiweb.net/deck-options.html)
- Missed days do not accumulate *new* cards: "If you study fewer than the limit, or miss a day, the next day the counts will be back to their original setting." — [Anki Manual: Deck Options](https://docs.ankiweb.net/deck-options.html#daily-limits)
- SM-2 rule: repeat every item that scored below 4 at the end of the day's session until each scores at least 4. — [SuperMemo SM-2](https://super-memory.com/english/ol/sm2.htm)
- Leeches: Anki flags a card as a leech after **8 lapses** by default, warns again every 4 lapses after that, and by default tags and suspends it. — [Anki Manual: Leeches](https://docs.ankiweb.net/leeches.html)
- Lapse handling in Anki: "New interval" after a lapse defaults to 0.00, so the card returns at the minimum interval (1 day). With no relearning steps, a failed card "will be assigned a new interval of 1 day by default." — [Anki Manual: Deck Options](https://docs.ankiweb.net/deck-options.html)
- 말해보카 has a wrong-answer note (오답노트) plus automatic review. — [Unicorn Factory article](https://www.unicornfactory.co.kr/article/2021062317113820109)

### Inferences
Concrete daily queue algorithm, in pseudocode:
```
today_queue:
  1. due = cards where due <= today, sorted by overdueness DESC
     overdueness = (today - due_date) / max(interval_days, 1)
     take first REVIEW_CAP
  2. if count(due) > REVIEW_CAP: new_today = 0   # backlog mode
     else new_today = NEW_LIMIT (minus new already introduced today)
  3. interleave: e.g. 1 new card after every 4-5 reviews (keeps sessions from front-loading all new)
on answer:
  correct -> box = min(box+1, MAX_BOX); due = today + INTERVALS[box]
  wrong   -> box = 1; lapses += 1; due = tomorrow
             push card back into current session 3-5 positions later;
             it must be answered correctly once in-session before leaving
             (in-session repeats don't promote the box)
  if lapses >= LEECH (suggest 5 for a quiz app; Anki uses 8): mark 'leech',
     show it in a "difficult words" list, and stop counting it against daily cap
```
- Optional backlog smoothing: when a user returns after N missed days, spread the backlog by raising the cap 1.5x for a few days rather than forcing everything at once. This is a design suggestion, not sourced.
- "Compounding" wrong-answer review falls out naturally. Today's wrong items are due tomorrow, and tomorrow's queue combines reviews due on their schedule with yesterday's mistakes. Because wrong items reset to a 1-day interval, a struggling learner sees their mistakes every day until they stick.
- Interleave grammar sentences with words in the same queue, or keep a separate small queue with its own cap. Separate caps are simpler to reason about for presets.

### Gaps
- I found no published guidance on an ideal leech threshold for multiple-choice quizzes as opposed to self-graded flashcards. The value of 5 is my suggestion.
- I did not find research quantifying the best "requeue after N cards" distance within a session. 3-5 cards is a common practical choice, not a sourced figure.

## Q4. Daily new-word targets in apps and research; Light/Normal/Hard presets

### Takeaway
The workload anchor is Anki's own rule of thumb: about 20 new/day leads to about 200 reviews/day at steady state, roughly 10x. Practitioner consensus for sustainable vocabulary is 10-20 new words a day. I found no peer-reviewed "optimal number". Presets should be set by review load and minutes per day, not by new-card count alone.

### Cited Findings
- Anki: "If you are consistently learning 20 new cards a day, you can expect your daily reviews to be roughly about 200 cards/day." Reducing new cards per day lowers the review burden. — [Anki Manual: Deck Options](https://docs.ankiweb.net/deck-options.html)
  - The 20/200 figures are widely known as Anki's defaults. The fetched page presents them only as an example, so I did not confirm them as defaults in this session.
- 말해보카 users study about **45 vocabulary items a day on average**, per a report about the operator 이팝소프트 (Epop Soft). Total learning across grammar, listening and speaking is said to be well above that. Words are taught in frequency order from a pool of about 34,000. The article does not say whether "45" means new words or new plus review. — [Unicorn Factory](https://www.unicornfactory.co.kr/article/2021062317113820109)
- Duolingo daily XP goals, per a third-party guide: Basic 1, Casual 10, Regular 20, Serious 30, Intense 50 XP. Another guide from the same site says recent updates removed the choice and replaced it with one fixed target. — [duolingoguides.com: change daily goals](https://duolingoguides.com/how-to-change-daily-goals-on-duolingo/); conflicting: [duolingoguides.com: can't change daily goal](https://duolingoguides.com/why-cant-i-change-my-daily-goal-on-duolingo)
- 클래스카드 (ClassCard) is set-based. Teachers assign sets, students memorize and then submit a test with a target score. I found no published daily-word-count default. — [App Store: 클래스카드](https://apps.apple.com/kr/app/%ED%81%B4%EB%9E%98%EC%8A%A4%EC%B9%B4%EB%93%9C/id1176435331)
- Practitioner blogs converge on 10-20 new words a day as sustainable. One says "more than 20 creates review backlog". They describe the binding constraint as the number of reviews, not new words. These are blogs, not research. — [Notelyn](https://www.notelyn.com/blog/spaced-repetition-effectiveness-vocabulary-learning-research); [StudyCards AI](https://studycardsai.com/blog/spaced-repetition-for-vocabulary)
- Higher target retention means more reviews per day (FSRS). — [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)

### Inferences
- Steady-state load estimate for the recommended Leitner ladder [1, 2, 4, 7, 15, 30]:
  - A word answered correctly every time takes 6 reviews over about 59 days before it is mastered.
  - Each lapse adds about 2-4 extra reviews.
  - So the steady-state review load is about **6-9x new/day** at the peak, then falls as words retire. This is consistent with Anki's roughly 10x, which includes reviews beyond 30 days.
- Suggested presets (words are single vocabulary items; grammar items are full sentences, which are slower, so they are counted separately):

| Preset | New words/day | New grammar sentences/day | Review cap/day (words + grammar) | Expected peak reviews | Rough time* |
|---|---|---|---|---|---|
| Light | 5 | 2 | 60 | ~40-60 | ~5-10 min |
| Normal | 10 | 3 | 120 | ~80-110 | ~12-20 min |
| Hard | 20 | 5 | 220 | ~170-220 | ~25-35 min |

  \*The time column assumes about 6-8 s per word review and about 15-20 s per grammar sentence. These are my assumptions, not sourced.
- Normal (10/day) matches the practitioner 10-20 range at its low end. Hard (20/day) matches Anki's 20 new/200 reviews example. Light suits a "don't break the streak" friend.
- 말해보카's average of 45 a day probably includes reviews. If so, it is roughly comparable to Light or Normal total items.
- Grammar sentences should be about a third to a quarter of the word count, because each takes 2-3x longer and carries more items per card.
- Lock the preset for at least about 7 days, or apply changes to *new* cards only. Raising the new count raises reviews for weeks afterwards, as the Anki manual warns.

### Gaps
- I found no peer-reviewed study that gives an optimal number of new L2 words per day.
- 말해보카's actual daily-goal options and defaults are not documented publicly. The app's settings would need to be checked by hand.
- The current state of Duolingo's daily-goal options is unclear because the sources conflict, and no official help page was fetched.
- I found no source for per-item answer times in quiz apps.

## Q5. Mastery definition and progress stats for friends comparing

### Takeaway
Use an interval-based definition of "learned", as Anki does: "mature" means an interval of 21 days or more. For this app, define **Learning** as box 1-3, **Familiar** as box 4-5 (interval 7-15 days), and **Mastered** as passing the 30-day box. Show friends simple, comparable metrics: streak, words mastered, first-try accuracy, and reviews done. Avoid raw counts that reward picking the Hard preset.

### Cited Findings
- Anki defines a card as **mature** when its interval is **21 days or more**. Card counts are grouped as mature, young/learn, unseen and suspended. — [Anki Manual: Statistics](https://docs.ankiweb.net/stats.html)
- Anki's **True Retention** counts only the first review of each day, with Again as a fail and Hard, Good and Easy as passes. Anki also shows Today stats (reviews done and percent correct), a calendar heatmap of past activity, a future-due forecast, and, for FSRS, "estimated total knowledge". — [Anki Manual: Statistics](https://docs.ankiweb.net/stats.html)
- Anki's stats page does not list a streak statistic. Duolingo uses daily goals and streaks, per the third-party guides cited in Q4. — [duolingoguides.com](https://duolingoguides.com/how-to-change-daily-goals-on-duolingo/)
- Stability of 365 days means a 90% chance of recall after a year, which supports interval-based mastery thresholds. — [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS)

### Inferences
- **Mastered** = correctly answered at box 6, the 30-day review, so the word has survived a gap of at least 30 days. That is stricter than Anki's 21-day "mature". Optionally schedule one 60-90-day "maintenance" check. If it fails, the word drops back to box 1 and the mastered count goes down, which keeps the stat honest.
- Stats to show, all computable from a review log table `reviews(user_id, card_id, ts, correct, box_before, in_session_repeat)`:
  - **Streak**: consecutive days with the daily goal met. Define "met" as the due queue cleared, or the review cap reached, plus the new cards done.
  - **Words mastered / familiar / learning**, as a stacked bar.
  - **First-try accuracy**: correct ÷ first-reviews-of-the-day over the last 7 and 30 days. This mirrors Anki's True Retention and excludes in-session repeats, which inflate the figure.
  - **Reviews done today / this week**, plus a calendar heatmap.
  - **Wrong-answer list**: currently in box 1, plus leeches.
- For friend leaderboards, rank by *streak* and *mastered count*. Show accuracy as a secondary figure. Weekly mastered gained is fairer across presets than total reviews, because Hard users would otherwise dominate a raw-reviews ranking.
- Store per-user per-day aggregates (`daily_stats(user_id, date, new_done, reviews_done, first_try_correct, first_try_total, goal_met)`) so leaderboards don't need to scan the whole review log.

### Gaps
- I found no research on which progress metrics best motivate peer groups. The leaderboard suggestions are design judgment.
- I found no source defining "learned" for quiz-style apps such as 말해보카 or 클래스카드. Their internal mastery criteria are not public.
