# 08. QA / Performance / Accessibility

## 1. 품질 게이트
### Gate P0 — typing prototype
P0 통과 기준의 **정본(canonical list)** 이다. README, `IMPLEMENTATION_CHECKLIST.md`, `docs/09` Phase 0은 이 목록을 따른다.
1. 한글/영문 입력이 깨지지 않는다 (조합 중 Backspace, 선택 영역 한글 교체 포함)
2. 붙여넣기/삭제/선택 교체/undo·redo가 정상이다 (조합 1개 = undo 1번)
3. 타점은 고정되고 종이가 이동한다
4. 같은 글은 다시 그려도 잉크 흔들림이 같다 (`fixtures/ink-seed-v1.json` 통과)
5. 키/스페이스/백스페이스/엔터 소리가 즉시 나고, 소리를 못 내는 환경에서도 입력은 정상이다
6. 60Hz에서 평균 55fps 이상, 입력 중 50ms 넘는 long task가 반복되지 않는다
7. 새로고침·탭 닫기 후 글이 복구된다 (IndexedDB 실패 시 recovery snapshot)
8. reduced motion과 sound off가 동작한다

### Gate W1 — Web MVP
- offline launch
- DB migration test
- backup round-trip
- trash restore
- mobile Chrome/Samsung Internet 기본 검증

### Gate A1 — Android
- Samsung Keyboard/Gboard
- 회전/백그라운드/프로세스 복원
- sharesheet/export/import
- TalkBack smoke test

## 2. 브라우저 매트릭스
필수:
- Chrome Windows
- Edge Windows
- Chrome Android
- Samsung Internet

권장:
- Firefox desktop
- Safari/iOS (웹판 접근성 확인용; Android가 네이티브 목표여도 PWA 사용자 가능)

## 3. IME 매트릭스
- Windows Korean IME
- Gboard Korean
- Samsung Keyboard Korean
- hardware keyboard Korean/English switching

## 4. 입력 테스트
자동화가 어려운 실제 IME 동작은 수동 테스트 케이스를 별도 유지한다.
Unit test:
- EditOperation
- selection transform
- undo grouping
- deterministic seed (`fixtures/ink-seed-v1.json` + FNV-1a 표준 test vector)
- schema fixture: `examples/*.json`과 앱이 만든 노트가 `schemas/*.json`을 통과

E2E:
- typing English
- paste
- delete
- reload persistence
- backup export/import

실제 한글 조합은 Playwright가 OS IME를 완전히 재현한다고 가정하지 않는다.
Chromium에서는 CDP `Input.imeSetComposition`/`Input.insertText`로 composition 이벤트 흐름을 흉내 내는 E2E를 두되, 이것은 이벤트 처리 회귀 방지용이며 §3 IME 매트릭스 수동 테스트를 대신하지 않는다.

## 5. 데이터 안전성 테스트
- autosave 중 탭 종료
- quota 부족
- IndexedDB transaction failure
- corrupt import
- old schema import
- duplicate ID
- attachment missing

## 6. 성능 측정
### 계측
- Performance API marks: input_received → render_commit
- long task 관찰
- animation frame sampling

### 기준
- 입력 메인 스레드 long task >50ms 반복 발생 금지
- 60Hz에서 목표 평균 55fps 이상
- 3000자/10000자 문서 각각 stress test

### 측정 방법 (P0)
`PERF=1 npx playwright test perf` — 3천/1만 자 문서에서 200타(Enter·Backspace 섞음)를 초당 약 12타로 입력하며 rAF 간격(fps), long task, `beforeinput` → 두 번째 rAF까지의 시간을 잰다. 마지막 값은 측정 방식상 한 프레임을 더 포함하므로 실제 "입력→화면 반영"보다 약 16ms 크다. headless Chromium 기준이라 실기기 수치를 대신하지 않는다.

처음 10타는 워밍업으로 따로 재고(일회성 비용), 그 뒤 200타를 정상 상태로 잰다.

2026-10-07 측정(Windows, headless Chromium):
- 타자기 장치 도입 전: 3천 자 58.6~59.9fps, 1만 자 57.7~59.6fps, long task 0. 첫 키 입력에서 오디오 장치를 여는 179ms long task → 오디오를 유휴 시간에 미리 준비해 제거.
- 타자기 장치(타이프바·리본·stamp) 도입 후 처음에는 3천 자 52.8~60fps로 흔들리고 첫 타건에 64~97ms long task가 생겼다. stamp를 280→160ms로 줄이고, 타이프바 그림자를 없애고, 부채꼴 기준점 측정을 resize 때로 옮기고, 타건 애니메이션을 유휴 시간에 예열한 뒤: 3천 자 58.2~59.9fps, 1만 자 59.4~60.0fps, 워밍업 long task 0, 정상 상태 long task 0~1(58ms, 반복 없음), p95 31~32ms(한 프레임 포함).

3000자를 제품 제한으로 반드시 둘 필요는 없다. PaperType은 내부 성능이 허용하는 범위에서 더 긴 글도 지원할 수 있도록 설계하되, 성능 테스트로 실제 제한을 결정한다.

## 7. 접근성
WCAG 원칙을 참고하되 ‘감성 효과’보다 사용 가능성을 우선한다.
- contrast
- keyboard navigation
- focus visible
- reduced motion
- screen reader label
- zoom/font scaling
- sound-independent feedback

## 8. 시각 효과 안전성
- 빠른 반복 깜빡임 금지
- lamp flicker는 기본 비활성 또는 매우 미세하게
- motion 강도 설정 제공

## 9. Acceptance checklist
### Writer
- [ ] 한글 입력
- [ ] selection replace
- [ ] undo/redo
- [ ] autosave state
- [ ] reload recovery
- [ ] sound off
- [ ] reduced motion
- [ ] screen reader editable label

### Backup
- [ ] export ZIP
- [ ] fresh app import
- [ ] note count match
- [ ] text hash match
- [ ] attachments match
