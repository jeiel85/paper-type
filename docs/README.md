# PaperType 설계 문서

Web/PWA에서 먼저 경험을 검증하고, 이후 Android Native로 확장하는 **로컬 우선 아날로그 타자기 글쓰기 앱**의 설계 문서 모음이다. 설계 패키지 v1.0(2026-10-07)을 받아 구현 착수 전 검토 결과를 반영했다. 변경 내역은 git 기록에 있다.

## 핵심 원칙
- **Korean-first IME**: 한글 조합 입력을 1급 요구사항으로 다룬다.
- **Local-first / Privacy-first**: 로그인·광고·분석·추적 없이 오프라인 완전 동작.
- **Web-first, Native-second**: 웹에서 UX를 검증한 뒤 Android는 Compose로 네이티브 재구현.
- **Open data**: TXT/MD/JSON/PNG/PDF와 자체 백업 ZIP으로 데이터를 잠그지 않는다.
- **Experience before features**: 검색/태그보다 입력 감각, 사운드, 모션, 종이 표현을 먼저 완성한다.

## 문서
| 파일 | 목적 |
|---|---|
| [00_PRODUCT_BRIEF](00_PRODUCT_BRIEF.md) | 제품 정의, 범위, 성공 기준 |
| [01_REFERENCE_AND_DIFFERENTIATION](01_REFERENCE_AND_DIFFERENTIATION.md) | 레퍼런스 분석, 차별화, 법적/디자인 경계 |
| [02_UX_UI_SPEC](02_UX_UI_SPEC.md) | 화면/상태/반응형/디자인 시스템, 타점 이동 규칙 |
| [03_WEB_ARCHITECTURE](03_WEB_ARCHITECTURE.md) | React/PWA/IndexedDB 기반 웹 구조 |
| [04_INPUT_IME_ENGINE](04_INPUT_IME_ENGINE.md) | 한글 IME, 편집 모델, undo/redo 소유권, overlay 정렬 |
| [05_RENDER_AUDIO_HAPTIC](05_RENDER_AUDIO_HAPTIC.md) | 종이/잉크 seed 계약/캐리지/사운드/햅틱 |
| [06_DATA_BACKUP_EXPORT](06_DATA_BACKUP_EXPORT.md) | 데이터 모델, 백업, 내보내기 |
| [07_ANDROID_NATIVE](07_ANDROID_NATIVE.md) | Kotlin/Compose/Room 네이티브 설계 |
| [08_QA_PERFORMANCE_ACCESSIBILITY](08_QA_PERFORMANCE_ACCESSIBILITY.md) | 테스트, 성능, 접근성, **품질 게이트 정본** |
| [09_ROADMAP_BACKLOG](09_ROADMAP_BACKLOG.md) | 단계별 로드맵과 구현 백로그 |
| [10_RISKS_AND_DECISIONS](10_RISKS_AND_DECISIONS.md) | 핵심 리스크 및 ADR |

## 데이터 계약
| 파일 | 목적 |
|---|---|
| [`schemas/papertype-note.schema.json`](../schemas/papertype-note.schema.json) | 노트 교환 스키마 |
| [`schemas/papertype-backup-manifest.schema.json`](../schemas/papertype-backup-manifest.schema.json) | 백업 manifest 스키마 |
| [`fixtures/ink-seed-v1.json`](../fixtures/ink-seed-v1.json) | 잉크 seed 알고리즘 v1 test vector (Web·Android 공용) |
| [`examples/`](../examples) | 예제 노트·manifest |
| [`IMPLEMENTATION_CHECKLIST.md`](../IMPLEMENTATION_CHECKLIST.md) | 착수 체크리스트 |
| [`SOURCES.md`](../SOURCES.md) | 확인한 외부 출처와 사용 자산 라이선스 |

## 권장 첫 착수
전체 앱부터 만들지 말고 타이핑 화면 하나짜리 프로토타입을 먼저 만든다. 통과 기준은 [08 §1 Gate P0](08_QA_PERFORMANCE_ACCESSIBILITY.md)의 8개 항목이다. 이 게이트가 통과되기 전에는 장식, 검색, 월별 보관함을 확장하지 않는다.

## 2026-10-07 검토 반영 요약
| 지적 | 반영 위치 |
|---|---|
| undo 기록 소유자가 정해지지 않음 | 04 §7.1, ADR-004 |
| 잉크 seed 해시·글자 단위 미정 | 05 §2, ADR-005, `fixtures/ink-seed-v1.json` |
| 종이 이동과 브라우저 자동 스크롤 충돌 | 02 §5.1, R11 |
| textarea/overlay 줄바꿈 불일치 | 04 §11.1, R12 |
| manifest가 모르는 필드를 거부 | manifest schema, 06 §6 |
| `checksums` 필드명 불일치 | 06 §6 (항목별 `sha256`) |
| sha256·path 형식 제약 없음, format 미검사 | 두 schema, 03 §2 |
| correctionMarks 구조 미정 | note schema (Phase 2까지 잠정) |
| 복사본 import 시 잉크가 바뀜 | `writerSettings.inkSeed`, 06 §7 |
| P0 기준이 문서마다 다름 | 08 §1을 정본으로 통일 |
| Archive 미정의, 휴지통 자동정리 미정, 검증 도구 미정 | ADR-008, ADR-007, 03 §1 |
| 소리·텍스처 자산 출처 미정 | 05 §6, ADR-006 |
