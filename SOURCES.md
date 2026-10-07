# Sources

## Apple App Store — Platen — Paper & Ink
- URL: https://apps.apple.com/us/app/platen-paper-ink/id6809529696
- 확인일: 2026-10-07
- 확인한 사실: iPhone 전용, textured paper / imperfect ink / mechanical sounds / capsule, flat·curved paper, type size/margins, ink darkness, correction 방식, night lamp, search/month groups/Recently Deleted, backup/iCloud 옵션, Studio의 추가 자산 및 A4/US Letter/A5 keepsake export, note당 3,000 characters, 최근 CJK 표시 개선.

## 주의
이 설계 패키지는 Platen의 브랜드/그래픽/고유 UI 자산을 복제하기 위한 문서가 아니다. 공개된 기능 설명에서 제품 아이디어를 분석하고, PaperType의 독립적인 구조·UX·기술 구현으로 재설계한 것이다.

## 사용 자산과 라이선스
| 자산 | 출처 | 라이선스 |
|---|---|---|
| Courier Prime (영문 타자체) | Courier Prime Project, `@fontsource/courier-prime` 패키지로 번들 | SIL OFL 1.1 |
| 나눔명조 (한글 명조) | NHN Corporation, `@fontsource/nanum-myeongjo` 패키지로 번들 | SIL OFL 1.1 |
| 타자 소리 | 앱 코드가 Web Audio로 직접 합성 (`src/core/audio/synth.ts`) — 녹음 샘플 없음 | 프로젝트 라이선스(MIT) |
| 종이 질감 | SVG `feTurbulence` 절차적 노이즈 (`src/styles.css`) — 이미지 파일 없음 | 프로젝트 라이선스(MIT) |

폰트 라이선스 원문은 각 패키지의 `LICENSE` 파일에 있다. 자산을 추가하거나 바꾸면 이 표를 함께 고친다(`docs/10` ADR-006).
