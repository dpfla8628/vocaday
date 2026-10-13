# Korean National English Curriculum Vocabulary & Leveling (for a leveled vocab-bank app)

> Scope note: the primary source for everything about the official list is the KICE/교과서검정연구기획단 document "2022 개정 교육과정에 따른 영어과 교과용도서 검정을 위한 영어 어휘 검색 프로그램(KICE Word Lister)", published by 경기도교육청 (GOE). It reproduces 교육과정 [별표 3] 어휘 verbatim from 교육부 고시 제2022-33호 [별책 14] 영어과 교육과정 pp. 254-290 and includes a section explaining what changed vs. 2015 (citing KICE research report CRC 2022-11, pp. 58-68). The full 3,000-word list with * / ** markings was extracted from this PDF in this session and used to check every sample word below.
> GOE PDF URL (cited below as **[GOE/KICE]**): https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf

## Q1. What is the 교육부 기본 어휘 list (2015 and 2022 개정), how big is it, how is it split, and how is it marked?

### Takeaway
The 2022 개정 영어과 기본 어휘 목록 has 3,000 headwords (word-family representative forms). There are three tiers: `*` = 800 words recommended for 초등학교; `**` = 1,200 words for 중학교 + 고등학교 공통과목 (공통영어/기본영어); unmarked = 1,000 words for the other high-school 선택 subjects. The 2015 list was also 3,000 words, but its tiers were 800 / 1,800 / 400. The 2022 revision rebalanced the tiers, raised the per-grade vocabulary caps, dropped the 2015 loanword (근원어) exemption, and limited word families to 36 derivational affixes.

### Cited Findings
**2022 개정 list: definition and marking**
- Verbatim guideline 1: "영어과 기본 어휘 목록은 영어과 교육과정의 성취기준 달성에 필요한 가장 기본적인 3,000개의 단어로 되어 있다. *표를 한 단어는 800개로 초등학교에서 사용하기를 권장하고, **표를 한 단어는 1,200개로 중학교와 고등학교 공통과목에서 사용하기를 권장한다. 나머지 1,000개의 단어는 그 외의 과목에서 사용하기를 권장한다." — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- Official source of the list: 교육부(2022), 영어과 교육과정, 교육부 고시 제2022-33호 [별책 14], pp. 254-290 (the list is [별표 3] 어휘). — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- Format of entries, as they appear in the list: `a* (an)`, `able** (disabled)`, `act* (actual, interact)`, `agree* (disagree)`, `advantage** (disadvantage)`, `airplane* / aeroplane*`, `advertize** / advertise**`, `analyze / analyse`, `abort (abortion)`, `environ (environment)`, `hunger** (hungry)`, `substance (substantial)`. So: the headword is the family's representative form, the star suffix gives the tier, frequent derived forms appear in parentheses, and US/UK spelling variants are joined by a slash. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- My extraction of the PDF found 814 distinct `*` tokens, 1,215 `**` tokens, and about 1,000 unmarked headwords. The small excess over 800/1,200 is consistent with spelling variants counted as separate tokens (e.g., airplane*/aeroplane*). — derived from [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)

**2022 개정: vocabulary caps by grade band and subject (학습 어휘 수)**
- 초3–4: 300단어 이내; 초5–6: 300단어 이내; 초등 누계 600단어 이내. 중1–3: 1,500단어 이내 (total). 고등 공통과목: 기본영어 1·2 1,600, 공통영어 1·2 1,800 (combined 1+2). 일반 선택: 영어Ⅰ 2,000; 영어 독해와 작문 2,200; 영어Ⅱ 2,500. 진로 선택: 직무 영어 2,000; 영어 발표와 토론 2,500; 심화 영어 2,800; 영미 문학 읽기 3,000; 심화 영어 독해와 작문 3,500. 융합 선택: 실생활 영어 회화 1,500; 미디어 영어 2,000; 세계 문화와 영어 2,200. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- Usage rule: in learning and assessment, at least 90% of words must come from the 기본 어휘 목록 for 초·중·고 공통 and 일반 선택, and at least 80% for 진로/융합 선택. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- KICE says 수능 영어 papers where about 90% of the vocabulary was 기본 어휘 caused little controversy, while papers that went beyond that caused considerable controversy. The new rule extends the 기본 어휘 requirement to assessment explicitly ("각종 평가"). — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)

**2022 개정: word-family rule (important for app data modeling)**
- A headword represents itself, all inflected forms (write/writes/wrote/written/writing; foot/feet; tall/taller/tallest; they/their/them/theirs/themselves), and derivatives formed with 36 allowed affixes. Derivatives built on bound roots are excluded (e.g., precious = "price root + -ous" is not covered). — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- The 36 affixes listed: un-, in-(il-/im-/ir-), en-(em-), inter-, mis-, re-, dis-, -able, -er, -ish, -less, -ly, -ness, -or, -th, -y, -al(-i(c)al, -ual), -ation(-ication), -ful, -ist, -ity, -ism, -ize(-ise), -ment, -ous, -ance, -ant(-icant), -ary, -ence, -ent, -ship, -ic, -ify, -ion, -ive, -ure. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- Why the affixes were limited: KICE notes the 2015 list put no limit on derivation, so its "3,000 words" potentially covered over 50,000 word types. The 2009 curriculum allowed 12 suffixes, Bauer & Nation (1993) list 84, and 2022 settled on 36, chosen from textbook-corpus usage coefficients. The last affix admitted was -ary (378 per million). The next one, -ly (adj., e.g., leisurely), was cut at 345. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- Guideline 5 excludes the following from both the 기본 어휘 and the counted new vocabulary: proper nouns (person and place names, language names, **month and weekday names**, holidays), titles (Mr., Ms., sir, ma'am), interjections (Oh, Wow, Ouch), romanized Korean or other foreign words (bulgogi, samullori), letters and symbols, unit names, abbreviations, chemical formulas, and **cardinal and ordinal numbers**. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)

**2015 개정 (older version, superseded by 2022 개정)**
- The 2015 list also had 3,000 words, but in three tiers of **800 – 1,800 – 400**. 2022 changed this to the "more balanced" **800 – 1,200 – 1,000**. In 2015 the tier explanation appeared at the end of the guidelines; 2022 moved it to the front. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- 2015 caps compared with 2022: new words for 초3–4 rose from 240 to 300, for 초5–6 from 260 to 300, and the 중1–3 total rose from 1,250 to 1,500. 2015 also specified new-word counts of 750 for 중학교 and 550 for 고등 영어(공통), which KICE called ambiguous. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- 2015 고1 공통 '영어': about 1,800 words (중학교급 1,250 plus about 550). The whole high-school course was about 3,500 cumulative. — [내일신문 기고](https://www.localnaeil.com/News/View/646293)
- 2015 had a **근원어 (loanword source-word) rule**: about 200 everyday English loanwords (alarm, album, banana, bus, camera, computer, internet, pizza-type words…) could be used, 50 per grade, without counting as new vocabulary. 2022 **deleted** this rule. KICE argued that students wrongly assume they know these words (e.g., "set" has 93 senses vs. Korean "세트"), and noted that 19 of them never appear in any 2015 중·고 textbook. The higher-value ones were folded into the 기본 어휘 instead. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- 2015 also kept an exception that "frequent, learning-relevant variant forms" could be listed as headwords (e.g., disadvantage). KICE criticized this as arbitrary, and 2022 moved such forms into parentheses. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- An academic paper documents the 2015 list's development ("2015 영어과 교육과정 기본 어휘 목록 개발"). A related English abstract calls it the revised Korean Basic English Word List (KBEWL), selected by frequency, range and familiarity from a corpus. — [교보 스콜라](https://scholar.kyobobook.co.kr/article/detail/4010024729500) (the corpus-size detail, about 8M words, came from a search snippet and was not verified on the page)

### Inferences
- For an app, the three official tiers map directly to **초등 (`*`) → 중등 + 고1 공통 (`**`) → 고2–3 선택/수능 (unmarked)**. 중등 and 고1 share one official tier, so any "중등 기본 vs. 고1/심화" split has to come from the app's own heuristic, such as word frequency, CEFR level, or the publishers' series.
- 초등 caps total 600 learned words, while 800 are recommended. An "초등 필수" set therefore realistically means the 800 `*` words, of which textbooks actively teach about 600.
- Because numbers, months, weekdays and interjections are **excluded** from the list, an app's 초등 level should add them back as a supplementary "basic functional words" pack (one, first, Monday, January, hello…).
- Word families matter: store `headword`, `tier`, `derived_forms[]` and `spelling_variants[]`. Do not treat "disabled", "interact" and "unhappy" as separate words at the same tier unless the app wants a separate "파생어" drill.
- 수능 by design draws about 90% of its words from these 3,000. So a "수능" level is mostly the unmarked 1,000 plus the derived forms, plus a smaller "beyond-list" stretch set.

### Gaps
- I could not read the NCIC (ncic.re.kr) original 고시 PDF directly; the GOE/KICE reproduction was used instead. It explicitly cites the 고시 pages.
- I did not retrieve the full 2015 starred list, so I could not confirm which 2015 `*` / `**` words changed tier in 2022. I also found no word-by-word count of how many headwords were added or dropped.
- Rollout schedule of 2022 개정 by grade (which grades use new textbooks in 2024 / 2025 / 2026 / 2027) was not verified in this session.

## Q2. How do popular Korean vocab books and apps level their words?

### Takeaway
Commercial series follow the school-stage split (초등 → 중등 → 고등 → 수능), usually with 2–3 difficulty steps inside each stage (기본/필수/고난도). Each volume holds roughly 1,200–2,000 words studied over 40–60 "Days". I found no publisher that publicly maps its volumes onto the curriculum's `*` / `**` tiers word by word.

### Cited Findings
- **능률VOCA (NE능률)** current series lineup: 초등 기본, 초등 필수, 중등 기본, 중등 필수, 중등 고난도, 중등 숙어, 어원편 중등, 고등 기본, 고등 어원편, 수능 필수, 수능 고난도. — [웬디북 시리즈 페이지](https://www.wendybook.com/category/series/detail/3199)
- 능률VOCA 어원편 고등: 1,474 core words for the high-school curriculum and 수능, chosen by frequency and importance, in a 60-day course built on prefixes, roots and suffixes. — [인사이트](https://www.insight.co.kr/news/540674)
- 능률VOCA was revised for the 2022 개정 교육과정 (내신 + 수능), with main book, workbook, mini-book and digital memorization service ("어휘 각인 시스템"), plus QR native audio per Day. — [스마트투데이](https://www.smarttoday.co.kr/ko-kr/articles/102388)
- Older title "능률 VOCA 고교필수 2000" ("내신부터 수능까지 꼭 알아야 할 필수 어휘 총정리"). — [쿠팡](https://www.coupang.com/vp/products/6840848147). A foreign retailer says the 2026 edition renamed it "수능 필수", with 2,000 words over 60 days. — [Librairie Coréenne](https://librairie.coreenne.fr/en/products/153697) (secondary retailer source, not verified with NE능률)
- A 중학 mid-level 능률VOCA volume is described as 1,200 harder 중학 words in 40 days. — [Librairie Coréenne](https://librairie.coreenne.fr/en/products/135893) (secondary retailer; exact title not confirmed)
- **워드마스터 (이투스)**: the integrated app "워드마스터 통합 학습앱" bundles the series. Its in-app packages include 초등 COMPLETE, 고등 입문 패키지 2종 (23개정), 고등 필수 패키지 3종 (25개정), 고등 풀 패키지 5종 (25개정) and 수능 대비 패키지 3종 (25개정). — [App Store](https://apps.apple.com/app/id6747540936)
- **경선식 영단어**: built around the "해마학습법" image-mnemonic method (경선식에듀, founded 2004). — [한경 매거진](https://magazine.hankyung.com/business/article/201808285054b). The 수능 series is "수능 영단어 초스피드 암기비법" (editions 2004–2013 on Aladin). — [알라딘 시리즈](https://www.aladin.co.kr/shop/common/wseriesitem.aspx?SRID=66293). A 초등 "경선식 영단어" volume also exists. — [쿠팡](https://www.coupang.com/vp/products/7188155855). The company's memory-gain claims (5.9× / 13.3×) are its own and not independently verified. — [JKN](https://news.jkn.co.kr/post/305021)
- Other apps use the same stage labels: "해커스 중고등 보카 – 중학영단어, 고등·수능 영어어휘" — [App Store](https://apps.apple.com/ec/app/id6445882036); "조정식 VOCA [수능 필수 2000]" — [App Store](https://apps.apple.com/kr/app/id6744397985); "초등 필수 영단어 800 (교육부 지정)", which markets the curriculum `*` list directly. — [App Store](https://apps.apple.com/us/app/id1587640111)

### Inferences
- A de facto market taxonomy that users will recognize: **초등 기본 → 초등 필수(800) → 중등 기본 → 중등 필수 → 중등 고난도 → 고등 기본/입문 → 수능 필수(~2,000) → 수능 고난도**, plus orthogonal tracks for **숙어 (idioms)** and **어원 (etymology)**.
- "N 2000" titles (수능 필수 2000, 고교필수 2000) are a common product unit. A 수능 core level of about 2,000 words matches the size of the curriculum's `**` (1,200) plus part of the unmarked tier, but this alignment is my inference, not a publisher statement.
- The publishers' word lists are copyrighted compilations (see Q5). Use them only as a benchmark for level names and sizes, not as data.

### Gaps
- I found no official per-volume word counts for most 능률VOCA, 워드마스터 or 경선식 titles; NE능률's and 이투스's own pages were not retrieved.
- I could not confirm the current (2025–26) full 워드마스터 book lineup (e.g., 초등/중등/고등 Basic/수능 2000/하이퍼 2000) from a primary source.
- I found no publisher statement on how their 중등/고등 split relates to the curriculum's `*` / `**` markings.

## Q3. How do CEFR levels (A1–C1), Oxford 3000/5000, and NGSL map onto Korean school levels?

### Takeaway
The Oxford 3000 covers CEFR A1–B2, and the Oxford 5000 adds about 2,000 more words at B2–C1. NGSL 1.2 has 2,809 words and covers 92% or more of general text. All three are about the same size as Korea's 3,000-word 기본 어휘. I found no official or peer-reviewed mapping of Korean grade bands to CEFR, so any mapping is an approximation.

### Cited Findings
- The Oxford 3000 is "the most important words to know in English" for learners at A1–B2. The Oxford 5000 is the Oxford 3000 plus 2,000 more words at B2 and C1. — [Oxford Learner's Dictionaries – word lists](https://www.oxfordlearnersdictionaries.com/about/wordlists/) (taken from the search snippet; the page itself returned HTTP 403 to my fetch)
- NGSL 1.2: 2,809 words, averaging 92%+ coverage of general English texts (93% Harry Potter, 94% TOEIC, 95% many TV shows). Companion lists: NAWL 1.2 (academic), TSL 1.2 (TOEIC), BSL 1.2 (business), FEL 1.2 (fitness). The NGSL page gives no CEFR mapping. — [NGSL](https://www.newgeneralservicelist.com/new-general-service-list)
- CEFR bands: A1–A2 basic, B1–B2 independent, C1–C2 proficient. For reference, ETS maps TOEFL iBT totals of 42 / 72 / 95 to B1 / B2 / C1. — [ETS](https://www.ets.org/content/ets-org/language-master/ko/home/toefl/score-users/ibt/compare-scores.html)
- KICE caps total vocabulary at 중학교 1,500 words, 고1 공통영어 1,800, and up to 3,000–3,500 for advanced 선택 subjects. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- A Korean study on 초등 textbook versus graded-reader vocabulary exists (이연경·정동빈 2010), but it does not map to CEFR. — [earticle](https://www.earticle.net/Article/A121987)

### Inferences (approximate mapping; no authoritative source)
| App level | Curriculum tier | Rough CEFR | Overlap list |
|---|---|---|---|
| 초등 | `*` 800 (600 taught) | Pre-A1 – A1 | Oxford 3000 A1 core; top ~800 of NGSL |
| 중등 | `**` portion taught by 중3 (≤1,500 total) | A2 – low B1 | Oxford 3000 A2–B1 |
| 고1 공통 | `**` complete (≤1,800 total) | B1 | Oxford 3000 B1 |
| 고2–3 / 수능 | unmarked 1,000 + derived forms (≤2,500–3,500) | B1+ – B2 | Oxford 3000 B2, start of Oxford 5000 B2; NGSL tail + NAWL |
| 수능 고난도 / 실용 | words beyond the 3,000 (≤10% of 수능 text) | B2+ – C1 | Oxford 5000 C1; NAWL; TSL/BSL for 실용/TOEIC |
- Reasoning: the 3,000-word curriculum is about the same size as the Oxford 3000 (A1–B2) and NGSL (2,809). The 수능 is built on about 90% curriculum words, which puts its lexical core around B1–B2, with a C1 tail. This is inference only; do not present it to users as an official mapping.
- Practical app approach: use the curriculum tier as the primary level, then use CEFR (from an openly licensed CEFR list, if one is found) or NGSL rank as a secondary sort *within* a tier. This produces 중등 기본 vs. 중등 심화 splits.

### Gaps
- I found no KICE or peer-reviewed study mapping 수능 or the 기본 어휘 to CEFR levels. Searches in English and Korean returned only general CEFR conversion pages.
- I could not retrieve per-level word counts for the Oxford 3000/5000 (Oxford pages returned 403).
- English Vocabulary Profile (Cambridge) mapping was not investigated.

## Q4. ~30 representative example words per level (with Korean meanings)

### Takeaway
Every word in levels 1–3 below was checked in this session against the extracted 2022 개정 [별표 3] list, so its tier membership is sourced. Level 4 words were checked as **absent** from the 3,000-word list, including the parenthesized derived forms. Korean glosses are standard dictionary meanings that I supplied; verify them against a dictionary before shipping.

### Cited Findings
Tier membership for all words in levels 1–3, and absence from the list for level 4, comes from [GOE/KICE – 2022 개정 [별표 3] 어휘](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf).

**Level 1 – 초등 (marked `*`, the 800 초등 words)**
apple 사과 · baby 아기 · bird 새 · book 책 · brown 갈색(의) · cook 요리하다; 요리사 · dance 춤추다; 춤 · doctor 의사 · dream 꿈; 꿈꾸다 · family 가족 · friend 친구 · happy 행복한 · kitchen 부엌 · lesson 수업, 교훈 · library 도서관 · hospital 병원 · weather 날씨 · window 창문 · borrow 빌리다 · arrive 도착하다 · believe 믿다 · future 미래 · visit 방문하다 · sick 아픈 · lazy 게으른 · fresh 신선한 · push 밀다 · tiger 호랑이 · mother 어머니 · school 학교 · water 물 · eat 먹다 · small 작은 · color 색깔 · pencil 연필 · chair 의자 · season 계절 · culture 문화 · between ~사이에 · ago ~전에
(Note: "teacher" is not a headword; it falls under teach + -er. "hungry" is listed as hunger** (hungry), so it sits in the 중등 tier.)

**Level 2 – 중등 / 고1 공통 (marked `**`, 1,200 words)**
advice 충고 · adventure 모험 · although 비록 ~이지만 · among ~사이에(셋 이상) · anxious 불안한, 열망하는 · apply 지원하다, 적용하다 · appear 나타나다, ~인 것 같다 · attitude 태도 · balance 균형 · benefit 이익, 혜택 · create 창조하다 · escape 탈출하다 · economy 경제 · educate 교육하다 · experience 경험(하다) · hesitate 망설이다 · imagine 상상하다 · improve 향상시키다 · modern 현대의 · opinion 의견 · perhaps 아마도 · purchase 구매(하다) · raise 올리다, 기르다 · rude 무례한 · request 요청(하다) · treat 대하다, 치료하다 · vote 투표(하다) · disappoint 실망시키다 · privacy 사생활 · interrupt 방해하다 · desperate 절박한 · fortunate 운 좋은 · release 풀어주다, 발표하다 · district 지역, 구역 · mystery 신비, 미스터리

**Level 3 – 고등 선택 / 수능 핵심 (unmarked, 1,000 words)**
abandon 버리다 · acquire 얻다, 습득하다 · advocate 옹호하다; 옹호자 · anticipate 예상하다 · assert 주장하다 · attribute ~의 탓으로 돌리다; 속성 · authentic 진짜의 · betray 배신하다 · chaos 혼돈 · coincide 동시에 일어나다, 일치하다 · commit 저지르다, 전념하다 · compel 강요하다 · conceal 숨기다 · conscience 양심 · exceed 초과하다 · flourish 번성하다 · foster 촉진하다, 육성하다 · heritage 유산 · instinct 본능 · negotiate 협상하다 · norm 규범 · persist 지속되다, 고집하다 · restrict 제한하다 · subtle 미묘한 · undergo 겪다 · vivid 생생한 · withdraw 철회하다, 인출하다 · statistic 통계 · perceive 인지하다 · inherent 내재된 · compromise 타협(하다) · profound 심오한 · inevitable 불가피한

**Level 4 – 수능 고난도 / 실용 (verified NOT in the 3,000-word 기본 어휘 list)**
Academic/수능 고난도: ambiguous 모호한 · arbitrary 임의적인 · resilient 회복력 있는 · scrutiny 정밀 조사 · paradox 역설 · mitigate 완화하다 · empirical 경험적인, 실증적인 · prevalent 널리 퍼진 · ubiquitous 어디에나 있는 · meticulous 꼼꼼한 · deteriorate 악화되다 · alleviate 완화하다 · plausible 그럴듯한 · discrepancy 불일치 · reciprocal 상호적인 · contemplate 숙고하다 · intrinsic 본질적인 · feasible 실현 가능한 · tangible 실체적인, 유형의 · coherent 일관성 있는 · redundant 불필요한, 중복된 · imperative 필수적인 · autonomy 자율성 · obsolete 구식의 · pragmatic 실용적인 · ambivalent 양면적인 · consensus 합의 · negligible 무시해도 될 만한
실용/비즈니스: invoice 송장, 청구서 · itinerary 여행 일정표 · reimburse 상환하다 · quota 할당량 · prerequisite 전제 조건 · comply 준수하다
(Excluded because they ARE in the list, unmarked: incline, deficiency, sophisticate, disrupt, hypothesis, warrant, constrain, incentive, unprecedented. "refund" is covered by re- + fund.)

### Inferences
- Level 4 is a stretch tier. Its words fall outside the curriculum's 90% core and suit 수능 1등급 readers or TOEIC/실용 learners. My rough CEFR guess is B2–C1 (unverified).
- For the 중등 vs. 고1 split inside `**`, a simple rule would put the most frequent or concrete `**` words (e.g., advice, escape, imagine, rude, vote) in 중등 and the abstract ones (e.g., attitude, economy, hesitate, desperate, district) in 고1. This is my heuristic, not an official split.

### Gaps
- Korean glosses are not from a cited dictionary in this session; check them against an openly licensed dictionary source (see Q5) before use.
- No source was found for which specific words 수능 typically glosses (어휘 주석) as beyond-curriculum.

## Q5. Openly licensed or public-domain word lists usable in an app (licensing)

### Takeaway
The curriculum's 3,000-word list is part of a 교육부 고시, and Korean Copyright Act Art. 7 excludes government 고시 from copyright protection, so it is very likely free to reuse. NGSL and its companion lists are CC BY-SA 4.0, which requires attribution and share-alike. The Oxford 3000/5000 is proprietary and licensed commercially by OUP. Commercial 교재 lists (능률, 워드마스터, 경선식) should be treated as copyrighted.

### Cited Findings
- 저작권법 제7조 (보호받지 못하는 저작물): "1. 헌법·법률·조약·명령·조례 및 규칙 2. 국가 또는 지방자치단체의 고시·공고·훈령 그 밖에 이와 유사한 것…" are not protected. — [위키문헌 저작권법](https://ko.wikisource.org/wiki/%EC%A0%80%EC%9E%91%EA%B6%8C%EB%B2%95_(%EB%8C%80%ED%95%9C%EB%AF%BC%EA%B5%AD,_%EC%A0%9C9529%ED%98%B8)); interpretation notes at [nepla 법률위키](https://www.nepla.ai/wiki/지식재산/저작권/-유권해석-저작권법-제7조-보호받지-못하는-저작물-j21nmvdg4n73) (secondary sources; confirm current wording on law.go.kr)
- The 기본 어휘 list is published as part of 교육부 고시 제2022-33호 [별책 14]. — [GOE/KICE](https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf)
- A 법제처 interpretation held that a public corporation (도로교통공단) making a textbook is not "국가" under Art. 7 No. 4, so the exemption does not automatically cover every public-body publication. — [nepla 법률위키](https://www.nepla.ai/wiki/지식재산/저작권/-유권해석-저작권법-제7조-보호받지-못하는-저작물-j21nmvdg4n73)
- NGSL: "New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License." The site footer says the word lists are released under Creative Commons. — [NGSL](https://www.newgeneralservicelist.com/new-general-service-list)
- NGSL-Spoken and the NGSL Graded Reader list are also CC BY-SA 4.0. — [NGSL-S](https://www.newgeneralservicelist.com/ngsl-spoken); [NGSL-GR](https://www.newgeneralservicelist.com/ngsl-graded-reader)
- OUP signed a licensing agreement with the South Korean app developer Cookie Langs to use the **Oxford 2000** word list in a game app, which shows that OUP licenses these lists commercially. — [OUP news (mynewsdesk)](https://mynewsdesk.com/uk/oxford-university-press/news/oxford-university-press-signs-licensing-agreement-with-south-korean-app-developer-445209); [License Global](https://www.licenseglobal.com/new-media-social/cookie-langs-collaborates-oxford-university-press-english-language-learning-app)

### Inferences
- The **safest primary dataset is the 2022 개정 기본 어휘 3,000 list itself**: it is an official 고시 annex (copyright-exempt under Art. 7 No. 2) and it carries the 초/중·고공통/선택 tiers. Note, however, that the KICE Word Lister guide PDF is a KICE/교육청 explanatory document, and its non-annex commentary may not share the exemption. Copy the headwords and tier marks, not KICE's prose.
- NGSL, NAWL, TSL and BSL are good open add-ons for frequency ranking and for 실용/TOEIC/academic levels. Under CC BY-SA, a derived word-list file that the app distributes must carry attribution and stay CC BY-SA. App code generally does not have to (standard SA reading; get a legal check).
- Avoid shipping the Oxford 3000/5000 CEFR tags or the publisher (능률/워드마스터/경선식) word lists without a license. Many App Store apps use the Oxford lists, but that does not show they are licensed.
- Korean meanings need their own licensed source. Candidates include 국립국어원 dictionaries and Wiktionary (CC BY-SA), but I did not verify their terms here.

### Gaps
- I did not verify the license or terms of: CEFR-J Wordlist, Cambridge English Vocabulary Profile, Wiktionary-derived EN–KO glosses, 국립국어원 한국어기초사전 / 우리말샘 open API terms, or NCIC's own reuse terms.
- I did not check NCIC (ncic.re.kr) for an official machine-readable (e.g., Excel/HWP) download of the 2022 기본 어휘. The KICE Word Lister program bundled with the GOE guide may include one, but it was not inspected.
- OUP's actual license terms for the Oxford 3000/5000 were not retrieved (oxfordlearnersdictionaries.com returned 403).
