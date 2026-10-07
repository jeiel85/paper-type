# Implementation Checklist

## Before coding
- [ ] Product name remains working title
- [ ] Create repo
- [ ] Freeze P0 scope
- [ ] Prepare original paper textures/sounds or licensed assets — P0는 코드 생성으로 해결 (ADR-006)

## P0 must pass
정본은 `docs/08_QA_PERFORMANCE_ACCESSIBILITY.md` §1 Gate P0.
- [ ] Korean IME composition (Backspace during composition 포함)
- [ ] English typing
- [ ] Selection replace / paste / undo·redo
- [ ] Paper/carriage motion
- [ ] Deterministic ink (`fixtures/ink-seed-v1.json`)
- [ ] Audio unlock/fallback
- [ ] 55fps+, no repeated long task
- [ ] IndexedDB autosave + reload recovery
- [ ] Reduced motion / sound off

## Do not start yet
- [ ] Cloud sync
- [ ] AI writing
- [ ] Collaboration
- [ ] Complex rich text
- [ ] Decoration marketplace
