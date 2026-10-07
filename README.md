# PaperType Design Package v1.0

> Web/PWA에서 먼저 경험을 검증하고, 이후 Android Native로 확장하는 **로컬 우선 아날로그 타자기 글쓰기 앱** 설계 패키지.

## 목표
PaperType의 제품 가치는 메모 기능의 양이 아니라 **타이핑 순간의 질감**에 있다. 종이, 잉크, 소리, 움직임, 조명, 수정 흔적을 하나의 일관된 인터랙션 시스템으로 묶는다.

## 핵심 원칙
- **Korean-first IME**: 한글 조합 입력을 1급 요구사항으로 다룬다.
- **Local-first / Privacy-first**: 로그인·광고·분석·추적 없이 오프라인 완전 동작.
- **Web-first, Native-second**: 웹에서 UX를 검증한 뒤 Android는 Compose로 네이티브 재구현.
- **Open data**: TXT/MD/JSON/PNG/PDF와 자체 백업 ZIP으로 데이터를 잠그지 않는다.
- **Experience before features**: 검색/태그보다 입력 감각, 사운드, 모션, 종이 표현을 먼저 완성한다.

## 패키지 구성
| 파일 | 목적 |
|---|---|
| `docs/00_PRODUCT_BRIEF.md` | 제품 정의, 범위, 성공 기준 |
| `docs/01_REFERENCE_AND_DIFFERENTIATION.md` | Platen 분석, 차별화, 법적/디자인 경계 |
| `docs/02_UX_UI_SPEC.md` | 화면/상태/반응형/디자인 시스템 |
| `docs/03_WEB_ARCHITECTURE.md` | React/PWA/IndexedDB 기반 웹 구조 |
| `docs/04_INPUT_IME_ENGINE.md` | 한글 IME, 편집 모델, undo/redo |
| `docs/05_RENDER_AUDIO_HAPTIC.md` | 종이/잉크/캐리지/사운드/햅틱 |
| `docs/06_DATA_BACKUP_EXPORT.md` | 데이터 모델, 백업, 내보내기 |
| `docs/07_ANDROID_NATIVE.md` | Kotlin/Compose/Room 네이티브 설계 |
| `docs/08_QA_PERFORMANCE_ACCESSIBILITY.md` | 테스트, 성능, 접근성, 품질 게이트 |
| `docs/09_ROADMAP_BACKLOG.md` | 단계별 로드맵과 구현 백로그 |
| `docs/10_RISKS_AND_DECISIONS.md` | 핵심 리스크 및 ADR 수준 결정 |
| `schemas/papertype-note.schema.json` | 노트 교환 스키마 |
| `schemas/papertype-backup-manifest.schema.json` | 백업 manifest 스키마 |
| `examples/sample-note.json` | 예제 노트 |
| `examples/sample-backup-manifest.json` | 예제 manifest |
| `SOURCES.md` | 확인한 외부 출처 |

## 권장 첫 착수
전체 앱부터 만들지 말고 `/type` 단일 프로토타입을 먼저 만든다.

**Prototype Gate P0**
1. 한글/영문 입력이 깨지지 않는다.
2. 타점은 고정되고 종이가 이동한다.
3. 글자 잉크 흔들림은 재렌더링 시 고정된다.
4. 키/스페이스/백스페이스/엔터 사운드가 즉각 반응한다.
5. 60fps에 근접하고 타이핑 중 프레임 드롭이 체감되지 않는다.
6. 새로고침 후 글이 복구된다.

이 게이트가 통과되기 전에는 장식, 검색, 월별 보관함을 확장하지 않는다.
