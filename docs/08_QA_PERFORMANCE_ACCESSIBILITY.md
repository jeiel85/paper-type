# 08. QA / Performance / Accessibility

## 1. 품질 게이트
### Gate P0 — typing prototype
- 한글 조합 깨짐 없음
- paste/delete/selection 정상
- 입력 중 시각 피드백 체감 지연 없음
- 새로고침 복구

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
- deterministic seed

E2E:
- typing English
- paste
- delete
- reload persistence
- backup export/import

실제 한글 조합은 Playwright가 OS IME를 완전히 재현한다고 가정하지 않는다.

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
