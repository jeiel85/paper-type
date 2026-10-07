# 09. Roadmap & Backlog

## Phase 0 — Spike / Type Prototype
**목표:** 한 장의 종이에서 입력 감각 검증.

### P0 tasks
- [x] Vite + React + TS bootstrap
- [x] `/type` route — P0는 화면이 하나뿐이라 앱 루트가 곧 타이핑 화면이다. 라우터는 Home이 생기는 Phase 1에서 도입
- [x] native editable layer
- [x] composition event logger (개발용, 본문 외부 전송 없음)
- [x] 한글 input transaction
- [x] paper surface 1종
- [x] seeded ink prototype
- [x] carriage/paper transform
- [x] key/space/backspace/enter sound
- [x] app-owned undo/redo (조합 1개 = 1 group)
- [x] autosave IndexedDB + recovery snapshot
- [x] reduced motion / sound off
- [ ] prototype QA checklist — 자동화(E2E·성능) 완료. 2026-10-07 Galaxy Tab(SM-X110, Android 16) Chrome + Samsung 키보드로 `안녕 값 닭`, 조합 중 Backspace, 새로고침 복구, 가상 키보드 열림/닫힘 시 타점 위치 확인. 남은 것: Windows 한글 IME, Gboard, Samsung Internet, iOS Safari(`docs/08` §2–3)

**Exit:** `docs/08` §1 Gate P0 8개 항목을 통과하고, “타이핑이 즐겁다”는 내부 기준을 충족한다.

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
