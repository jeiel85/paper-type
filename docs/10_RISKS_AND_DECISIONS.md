# 10. Risks & Architecture Decisions

## R1. 한글 IME + 커스텀 렌더링
**위험:** 조합 중 커서 점프, 중복 commit, 받침 손실.

**결정:** native editable control을 입력 authority로 유지한다. Canvas-only editor는 금지.

## R2. 문자 단위 DOM 폭증
**위험:** 각 글자를 span으로 만들면 긴 문서에서 DOM과 layout 비용 증가.

**결정:** MVP에서 필요 효과를 최소 span 단위로 구현하고, 장기적으로 line/span batching 또는 paint layer를 사용한다.

## R3. seeded ink가 편집 후 전부 바뀜
문자 index를 seed에 쓰면 앞부분에 글자를 삽입했을 때 이후 모든 잉크가 변한다.

**대안:**
A. logical index 기반 — 구현 단순, 편집 후 시각 변화 큼
B. persistent glyph token ID — 안정적, 모델 복잡

**결정 (개정):** P0부터 **문단 안 위치** 기반(A의 변형)을 쓴다. 앞 문단을 고쳐도 뒤 문단은 그대로이고, 렌더러도 고친 문단만 다시 그리면 되어 성능에도 유리하다. 문단을 넣고 빼면 뒤 문단 잉크가 바뀌는 것은 감수한다. v1의 시각 안정성이 더 중요해지면 segment stable ID(B)로 전환하고 `seedAlgorithmVersion`을 올린다. 정확한 알고리즘은 `docs/05` §2.1.

seed 원천은 note `id`가 아니라 `writerSettings.inkSeed`다. import 충돌로 새 ID 복사본을 만들어도 잉크 모양이 유지된다(`docs/06` §7).

## R4. autosave와 composition 경쟁
**위험:** 미확정 조합 문자가 저장되거나 마지막 입력이 유실.

**결정:** composition 중 persistent commit 금지, compositionend 직후 dirty 처리. pagehide flush 전 composition 상태는 native control 최종값으로 reconcile.

## R5. Web Audio 제한
**위험:** 모바일 브라우저 autoplay 정책으로 첫 소리 누락.

**결정:** 첫 사용자 interaction에서 명시적으로 AudioContext resume; sound unavailable이어도 typing은 정상 동작.

## R6. PWA 저장공간
**위험:** 브라우저 저장공간 eviction.

**결정:** 사용자에게 backup export를 명확히 제공하고 가능하면 persistent storage API 요청을 UX 적절한 시점에 검토. 저장 지속성을 절대 보장한다고 문구로 약속하지 않는다.

## R7. PDF parity
**위험:** 화면과 출력 결과가 다름.

**결정:** 화면 renderer를 그대로 screenshot하는 방식이 아니라 공유 style tokens + 별도 pagination renderer.

## R8. 장식 기능이 본질을 침식
**위험:** editor가 scrapbooking 앱처럼 복잡해짐.

**결정:** 장식은 v1 이후, 기본 UI에는 숨기고 writing mode를 방해하지 않는다.

## R9. 레퍼런스 앱 복제 위험
**위험:** 브랜드/UI/자산을 지나치게 모사.

**결정:** 기능 개념만 참고하고 브랜드, 아이콘, 레이아웃 비율, 고유 장식, 사운드/그래픽은 독자 제작.

## R10. Web/Android schema divergence
**결정:** JSON Schema 파일을 플랫폼 양쪽의 계약으로 취급하고 fixture round-trip 테스트를 CI에 둔다. 잉크 seed도 같은 방식으로 `fixtures/ink-seed-v1.json` test vector를 공유한다.

## R11. 종이 이동과 브라우저 자동 스크롤 충돌
**위험:** 포커스된 입력창이 스크롤 가능한 컨테이너 안에 있으면, 브라우저가 캐럿을 보이게 하려고 스스로 스크롤한다. 앱의 종이 이동과 겹쳐 화면이 튀고, 모바일 가상 키보드가 열릴 때 특히 심하다.

**결정:** 종이 이동은 `transform`으로만 한다. Writer 화면에는 스크롤 가능한 조상을 두지 않고(`overflow: hidden`, textarea 자동 높이), 세로 기준은 `visualViewport` 높이를 쓴다. 지난 글 보기는 휠/드래그로 임시 오프셋을 준다. 모바일 실기기(Chrome Android, Samsung Internet)에서 가상 키보드 열림/닫힘을 P0 수동 QA에 넣는다.

## R12. textarea와 잉크 overlay의 줄바꿈 불일치
**위험:** 투명 textarea 위 캐럿과 아래 overlay 글자가 어긋나 보인다.

**결정:** `docs/04` §11.1 정렬 규칙을 따른다(같은 타이포 속성, 커닝·합자 끄기, inline span + relative 오프셋, 회전 없음). E2E에서 여러 줄 입력 후 두 층의 높이가 같은지 검사한다.

## ADR-001 Web first
Status: Accepted
Reason: UX iteration 비용과 배포 속도가 낮고, Android native 이전에 핵심 감각을 검증 가능.

## ADR-002 No WebView Android port
Status: Accepted
Reason: IME/haptic/audio/파일 UX와 장기 품질을 위해 Compose native 구현.

## ADR-003 No mandatory backend
Status: Accepted
Reason: privacy-first와 offline ownership이 제품 정체성.

## ADR-004 앱이 undo/redo 기록을 소유
Status: Accepted (2026-10-07)
Context: native textarea가 입력 authority(R1)인데, 앱이 값을 직접 바꾸는 순간 브라우저 undo 기록이 깨진다. 조합 1개 = undo 1번(`docs/04` §7)도 브라우저 기본 동작으로는 보장되지 않는다.
Decision: 입력은 브라우저, 기록은 앱. 브라우저 undo는 `beforeinput`/단축키에서 막고, 변경은 diff로 `replace` 연산 하나로 정규화한다.
Alternatives: 브라우저 undo에 맡기기(구현 0이지만 그룹 규칙·Android 동일 동작 불가), `document.execCommand('insertText')`로 브라우저 기록 유지(비표준·Firefox 차이).

## ADR-005 Ink seed algorithm v1 고정
Status: Accepted (2026-10-07)
Decision: `docs/05` §2.1(FNV-1a 32 + mulberry32, 문단 안 code point 위치, `inkSeed`). 노트에 저장되는 값이 아니라 계산 규칙이지만, 바꾸면 기존 노트와 export 모양이 바뀌므로 데이터 형식처럼 다룬다.

## ADR-006 소리·종이 질감은 코드로 생성
Status: Accepted (2026-10-07)
Decision: P0의 타자 소리는 Web Audio 합성, 종이 질감은 SVG/CSS 절차적 노이즈로 만든다. 외부 녹음·이미지 자산이 없어 라이선스와 레퍼런스 모사 위험(R9)이 없고 첫 로드가 가볍다. 품질이 부족하면 직접 제작한 자산으로 바꾼다.

## ADR-007 Trash 자동 영구삭제 없음 (v1)
Status: Accepted (2026-10-07)
Decision: `docs/06` §5. 되돌릴 수 없는 자동 동작보다 데이터 안전을 우선한다.

## ADR-008 별도 Archive 화면 없음
Status: Accepted (2026-10-07)
Decision: `docs/02` §1. 지난 글은 Home의 Month Groups로 본다.
