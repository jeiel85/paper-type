# 01. Reference & Differentiation

## 1. 확인한 Platen 특성
2026-10-07 Apple App Store 페이지 기준 Platen — Paper & Ink는 iPhone 전용이며 다음 특성을 명시한다.
- textured paper, imperfect ink, mechanical sounds
- 입력을 따라가는 capsule
- flat/curved paper, type size, margins, ink darkness
- crossed-out correction 또는 clean erase
- night lamp의 warmth/intensity/beam 조절
- search, monthly groups, Recently Deleted
- backup export, optional iCloud sync
- Studio에서 추가 종이/캡슐/가든/사운드 및 A4/US Letter/A5 keepsake export
- 노트당 3,000자 제한
- 최근 업데이트에서 중국어/일본어 서체와 CJK UI 표시를 개선

출처는 `SOURCES.md` 참조.

## 2. 가져올 것은 ‘아이디어 계층’이다
복제하지 말아야 할 것:
- 고유 로고/앱명/브랜딩
- 고유 일러스트/가든 구성
- 고유 캡슐/레일 외형을 픽셀 단위로 따라하기
- 고유 사운드 샘플
- 스크린샷을 그대로 UI 설계 자료로 사용하는 방식

가져올 수 있는 추상적 제품 아이디어:
- 물성 있는 종이
- 타자기식 입력 피드백
- 수정 흔적을 선택적으로 남기는 UX
- 조명으로 집중 환경을 만드는 UX
- 결과물을 실제 종이처럼 export하는 개념

## 3. PaperType 차별화
### 3.1 Korean-first
한글 조합 입력과 CJK 레이아웃을 사후 보완이 아니라 초기 핵심 스펙으로 취급한다.

### 3.2 Local-first
기본 기능은 서버가 없어도 완전 동작한다. 웹에서도 계정 없이 설치 가능한 PWA를 제공한다.

### 3.3 Cross-platform open backup
Web과 Android가 같은 백업 포맷을 사용한다. 클라우드 계정 없이 파일로 기기 이동이 가능하다.

### 3.4 Correction History as a Feature
실제 삭제와 ‘타자기 수정 흔적’을 분리한다. 사용자는 Clean / Typewriter correction 모드를 선택한다.

### 3.5 Korean output aesthetics
한글도 영문 타자기 흉내로 강제하지 않고, 한글 serif/명조 계열의 자체 질감 시스템을 설계한다. 영문과 한글의 baseline/advance 폭 차이를 고려한다.

## 4. 디자인 정체성 제안
Platen의 garden을 그대로 가져오는 대신 PaperType은 **desk ephemera**를 테마로 한다.
- pressed flower
- paper clip
- masking tape
- coffee ring
- postage stamp
- dry leaf
- bookmark thread
- wax seal

장식은 콘텐츠가 아니라 ‘책상 위 흔적’이어야 한다.

## 5. 브랜드 방향
키워드:
- quiet
- warm
- mechanical
- imperfect
- personal
- timeless
- tactile

피할 것:
- SaaS dashboard
- glassmorphism
- 과도한 gradient
- gamification 중심 UI
- 복잡한 폴더/태그 관리가 전면에 나오는 정보 구조
