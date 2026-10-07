# 09. Roadmap & Backlog

## Phase 0 — Spike / Type Prototype
**목표:** 한 장의 종이에서 입력 감각 검증.

### P0 tasks
- [ ] Vite + React + TS bootstrap
- [ ] `/type` route
- [ ] native editable layer
- [ ] composition event logger (개발용, 본문 외부 전송 없음)
- [ ] 한글 input transaction
- [ ] paper surface 1종
- [ ] seeded ink prototype
- [ ] carriage/paper transform
- [ ] key/space/backspace/enter sound
- [ ] autosave IndexedDB
- [ ] prototype QA checklist

**Exit:** “타이핑이 즐겁다”는 내부 기준을 충족하고 IME 오류가 없다.

## Phase 1 — Web MVP
- [ ] Home
- [ ] note lifecycle
- [ ] 3 paper presets
- [ ] 3 ink presets
- [ ] night lamp
- [ ] search
- [ ] month grouping
- [ ] trash
- [ ] TXT/MD/JSON export
- [ ] PWA/offline
- [ ] backup ZIP
- [ ] accessibility settings

## Phase 2 — Web v1
- [ ] PNG export
- [ ] PDF pagination
- [ ] keepsake templates
- [ ] correction marks
- [ ] decorations
- [ ] photo stamp
- [ ] tablet/desktop polished layout
- [ ] backup schema freeze v1

## Phase 3 — Android Native Alpha
- [ ] Compose project
- [ ] Room + migrations
- [ ] Writer engine port
- [ ] Android IME validation
- [ ] SoundPool
- [ ] Haptic
- [ ] import/export compatibility
- [ ] photo picker

## Phase 4 — Android v1
- [ ] polish
- [ ] TalkBack
- [ ] low-end performance
- [ ] backup round-trip with Web
- [ ] release checklist

## 우선순위 규칙
P0/P1 backlog에서 어떤 기능도 다음보다 우선하지 않는다.
1. input correctness
2. data safety
3. render performance
4. accessibility
5. decorative feature

## 예상 이슈 라벨
```text
area:ime
area:writer
area:render
area:audio
area:storage
area:backup
area:export
area:a11y
platform:web
platform:android
risk:data-loss
perf
ux
```

## Definition of Done
기능은 다음 조건을 만족해야 done이다.
- 코드 구현
- unit/E2E 또는 수동 테스트 케이스 등록
- keyboard/mobile 확인
- 실패/복구 경로 확인
- 문서/schema가 바뀌면 함께 갱신
