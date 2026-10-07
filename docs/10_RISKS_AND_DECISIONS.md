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

**결정:** P0는 index 기반. v1의 시각 안정성이 중요해지면 paragraph/segment stable ID 기반으로 전환. seedAlgorithmVersion을 저장해 migration 가능하게 한다.

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
**결정:** JSON Schema 파일을 플랫폼 양쪽의 계약으로 취급하고 fixture round-trip 테스트를 CI에 둔다.

## ADR-001 Web first
Status: Accepted
Reason: UX iteration 비용과 배포 속도가 낮고, Android native 이전에 핵심 감각을 검증 가능.

## ADR-002 No WebView Android port
Status: Accepted
Reason: IME/haptic/audio/파일 UX와 장기 품질을 위해 Compose native 구현.

## ADR-003 No mandatory backend
Status: Accepted
Reason: privacy-first와 offline ownership이 제품 정체성.
