# Implementation Checklist

## Before coding
- [x] Product name remains working title
- [x] Create repo
- [x] Freeze P0 scope
- [x] Prepare original paper textures/sounds or licensed assets — P0는 코드 생성으로 해결 (ADR-006)

## P0 must pass
정본은 `docs/08_QA_PERFORMANCE_ACCESSIBILITY.md` §1 Gate P0.
- [ ] Korean IME composition (Backspace during composition 포함) — CDP 시뮬레이션 E2E 통과, 실제 IME 수동 매트릭스 남음
- [x] English typing
- [x] Selection replace / paste / undo·redo
- [x] Paper/carriage motion
- [x] Deterministic ink (`fixtures/ink-seed-v1.json`)
- [x] Audio unlock/fallback
- [x] 55fps+, no repeated long task
- [x] IndexedDB autosave + reload recovery
- [x] Reduced motion / sound off

## Do not start yet
- [ ] Cloud sync
- [ ] AI writing
- [ ] Collaboration
- [ ] Complex rich text
- [ ] Decoration marketplace
