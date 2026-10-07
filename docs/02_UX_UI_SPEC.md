# 02. UX/UI Specification

## 1. 정보 구조
```text
App
├─ Home
│  ├─ Recent Notes
│  ├─ Month Groups
│  └─ Search
├─ Writer
│  ├─ PaperSurface
│  ├─ Text/Ink Layer
│  ├─ Composition Preview
│  ├─ Carriage/Capsule
│  ├─ Lamp
│  └─ Optional Decorations
├─ Trash
└─ Settings
   ├─ Writing
   ├─ Paper & Ink
   ├─ Sound & Touch
   ├─ Light
   ├─ Export & Backup
   └─ Accessibility
```

> 별도 `Archive` 화면은 두지 않는다. 지난 글 보관은 Home의 **Month Groups**가 담당한다. 보관(archived) 상태를 따로 만들면 Home·Trash와 의미가 겹치고 데이터 모델에 상태가 하나 더 생긴다. 필요성이 확인되면 그때 추가한다.

## 2. 핵심 UX 규칙
- 앱 시작 후 **2탭 이내**에 타이핑 가능해야 한다.
- Writer 화면에서는 관리 UI를 숨기고 종이 비중을 최대화한다.
- 자동 저장 상태는 기본적으로 조용하게 동작하고, 오류일 때만 강하게 노출한다.
- 설정은 Writer를 떠나지 않고 sheet/panel로 열 수 있다.
- destructive action은 Trash를 거치며 즉시 영구 삭제하지 않는다.

## 3. Home
### Mobile
- 상단: 앱명 + 검색 + 설정
- 본문: 월 헤더 + 최근 노트 종이 카드
- FAB 대신 작은 `New page` 버튼 또는 하단 중앙의 종이 삽입형 affordance

### Tablet/Desktop
좌측 280~340px navigation rail, 우측 preview/writer.

## 4. Writer 레이아웃
```text
┌─────────────────────────────────┐
│ Back                     • Saved│
│                                 │
│        ── carriage rail ──      │
│                 ▲               │
│            fixed strike point   │
│        ┌─────────────────┐      │
│        │                 │      │
│        │     paper       │      │
│        │                 │      │
│        │ 오늘의 문장입니다▌ │      │
│        │                 │      │
│        └─────────────────┘      │
│                                 │
│                 128 chars       │
└─────────────────────────────────┘
```

## 5. 타점 모델
**타점(strike line)** 은 화면에 고정된 가로 위치·세로 위치다. 현재 줄은 항상 타점 높이에 오고, 종이가 위로 밀려 올라간다.

Desktop/넓은 화면에서는 커서를 계속 우측으로 이동시키기보다 일정 지점까지 입력 후 **타점은 시각적으로 거의 고정**되고 종이가 반대 방향으로 이동한다.

모바일에서는 화면 폭이 좁기 때문에 다음 하이브리드 전략을 사용한다.
1. 줄 초반: 자연 입력
2. 타점 영역 진입: paper translate
3. Enter/soft-wrap: 다음 줄 전환 + 부드러운 return

강제로 실제 타자기 폭을 흉내 내서 가독성을 해치지 않는다.

### 5.1 이동 규칙 (P0 구현 기준)
- 가로: 캐럿이 화면 가운데(타점 X)를 넘어서면 넘어선 만큼 종이를 왼쪽으로 민다. 단, **종이 왼쪽 끝이 화면 밖(16px gutter 안쪽)으로 나가지 않는 범위**에서만 민다. 좁은 모바일 화면은 여백이 없으므로 가로 이동이 자연히 0이 되어 위 하이브리드 전략과 같아진다.
- 세로: 캐럿이 있는 줄이 타점 높이에 오도록 종이를 올린다. 높이 기준은 가상 키보드를 뺀 `visualViewport`다.
- 지난 글 다시 보기: 휠/세로 드래그로 임시 오프셋을 더해 위 문장을 읽을 수 있다. 다음 입력이 들어오면 타점으로 돌아온다.
- 종이 이동은 스크롤이 아니라 `transform`으로만 한다. 이유는 `docs/10` R11.


## 6. 디자인 토큰
```text
spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48
radius: 4 / 8 / 12
motion-fast: 70~100ms
motion-normal: 140~220ms
motion-slow: 280~450ms
```

색상은 코드에 직접 박지 않고 semantic token으로 둔다.
```text
surfaceDesk
surfacePaper
surfacePaperAlt
inkPrimary
inkFaded
metalRail
lampWarm
shadowPaper
focusRing
```

## 7. Paper preset
MVP:
- Classic Ivory
- Warm Cream
- Clean White

각 preset은 다음 값 묶음이다.
```text
baseColor
grainTextureId
grainOpacity
fiberOpacity
edgeShadow
curvature
```

## 8. Ink preset
- Normal: 선명한 기본 잉크
- Soft: 약간 옅음
- Worn: 선택적 결손/농담

잉크 차이는 읽기 어려울 정도로 만들지 않는다.

## 9. Night Lamp
Dark mode와 별개다.
- desk dim overlay
- radial/elliptical light pool
- warmth
- intensity
- beam size

`prefers-reduced-transparency` 또는 성능 저하 감지 시 단순 gradient로 downgrade한다.

## 10. Empty states
Home empty:
> “새 종이를 한 장 넣어보세요.”

Trash empty:
> “버린 종이가 없습니다.”

검색 결과 없음:
> “이 문장이 적힌 종이를 찾지 못했습니다.”

## 11. 오류 UX
자동 저장 실패 시:
- 상단 작은 상태 표시 `Not saved`
- 메모리는 유지
- retry 버튼
- pagehide 시 emergency snapshot을 localStorage의 제한된 recovery slot에 저장

## 12. 접근성 UI
- 최소 44x44 CSS px 터치 영역
- 키보드 focus ring 숨기지 않음
- motion off 시 carriage translation을 최소화
- sound/haptic은 독립 toggle
- text size는 visual type size와 accessibility font scale을 분리
