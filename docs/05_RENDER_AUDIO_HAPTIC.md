# 05. Rendering / Audio / Haptic

## 1. Render pipeline
```text
Document Model
  ↓ layout
Line/Glyph Model
  ↓ seeded visual variance
Ink Style
  ↓ transforms
Paper/Carriage Position
  ↓ composite
Screen
```

## 2. 결정적 잉크 랜덤
Math.random()을 render마다 호출하지 않는다. Web과 Android가 **비트 단위로 같은 값**을 내야 하므로 아래 알고리즘을 계약으로 고정한다. 바꾸려면 `writerSettings.seedAlgorithmVersion`을 올리고 옛 버전 구현을 남긴다.

### 2.1 Seed algorithm v1
1. 본문을 `\n`으로 나눠 문단 번호 `p`(0부터)를 붙인다.
2. 문단 안을 **grapheme cluster** 단위로 자른다(Web `Intl.Segmenter`, Android ICU `BreakIterator`). 공백 grapheme(`/^\s+$/`)은 잉크를 그리지 않는다.
3. grapheme마다 `o` = 문단 시작부터 이 grapheme 시작까지의 **code point 개수**, `c` = 이 grapheme 첫 code point(10진수).
4. 키 문자열 `v1:{inkSeed}:{p}:{o}:{c}` 를 UTF-8 바이트로 바꿔 **FNV-1a 32bit**(offset basis `0x811C9DC5`, prime `0x01000193`)로 해시한다. `inkSeed`는 `writerSettings.inkSeed`, 없으면 note `id`.
5. 그 해시를 seed로 아래 `mulberry32`에서 난수 3개 `r1, r2, r3`(각각 [0,1))를 **이 순서로** 뽑는다.

검증용 test vector는 `fixtures/ink-seed-v1.json` 에 있다. 앱 코드와 독립된 Python 참조 구현(`scripts/gen-ink-fixture.py`)이 만든 파일이며, Web·Android 구현 모두 이 파일을 통과해야 한다.

> 전체 글자 index 대신 **문단 안 위치**를 쓰는 이유: 앞 문단을 고쳐도 뒤 문단 잉크가 바뀌지 않고, 렌더러가 고친 문단만 다시 그리면 된다(`docs/10` R3). 문단을 새로 넣거나 지우면 그 뒤 문단 번호가 밀려 잉크가 바뀌는 것은 v1에서 감수한다.

### 2.2 Ink preset이 난수를 값으로 바꾼다
| 값 | 계산 | Normal / Latin | Normal / 한글·CJK |
|---|---|---|---|
| opacity | `lo + r1 × (1 − lo)` | lo = 0.80 | lo = 0.86 |
| x jitter | `(r2 × 2 − 1) × ax` | ax = 0.025em | ax = 0.015em |
| y jitter | `(r3 × 2 − 1) × ay` | ay = 0.020em | ay = 0.012em |

- 한글·CJK 판정: 첫 code point가 Hangul(U+1100–11FF, U+3130–318F, U+A960–A97F, U+AC00–D7AF, U+D7B0–D7FF), CJK 통합 한자(U+3400–4DBF, U+4E00–9FFF), 가나(U+3040–30FF)에 속하면 CJK.
- 한글은 획이 복잡해 같은 흔들림도 더 거칠어 보이므로 폭을 좁게 둔다.
- em 단위라 글자 크기를 바꿔도 비율이 같다.
- **회전은 쓰지 않는다.** 글자를 inline 요소로 두어야 textarea와 줄바꿈이 같아지는데, inline 요소에는 transform(회전)이 적용되지 않는다(`docs/04` §11.1).
- 위 숫자는 P0 튜닝값이다. 프로토타입 평가로 바뀔 수 있고, 백업 스키마 확정(Phase 2) 때 함께 고정한다.

## 3. seeded PRNG pseudo
```ts
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```
seed hash(§2.1)와 preset 값(§2.2)을 고정해 export 재현성을 확보한다.

## 4. Paper rendering
레이어:
1. base color
2. low-frequency fiber/noise
3. subtle stain variation
4. edge shadow
5. curvature shadow/highlight
6. lamp composite

텍스처 자산은 너무 큰 PNG를 남용하지 않고 AVIF/WebP 또는 procedural noise를 검토한다.

## 5. 움직임
### Key press
- 2~4px 미만의 capsule/rail recoil
- 70~100ms

### Space
- 미세한 paper slide

### Enter
- bell(optional)
- 빠른 return
- vertical advance
- overshoot는 매우 약하게

### Motion safety
`prefers-reduced-motion`이면 translation 범위를 20~30% 이하로 낮추고 recoil을 fade로 대체할 수 있다.

P0 구현 기준: 시스템 `prefers-reduced-motion: reduce` 또는 앱의 `움직임 줄이기`가 켜지면
- 가로 종이 이동을 하지 않는다(캐럿이 종이 위에서 움직인다)
- 세로 이동은 애니메이션 없이 즉시 바꾼다
- 키 recoil 애니메이션을 끈다

## 6. Audio system
이벤트:
```text
key
space
backspace
enter
bell
carriageReturn
paperMove(optional)
```
각 이벤트당 3~6개 샘플을 준비한다.

### 소리 자산 — 코드로 합성한다
녹음 샘플을 쓰지 않고 앱 시작 후 첫 사용자 입력 때 **Web Audio로 직접 합성한 AudioBuffer**를 만든다(노이즈 버스트 + 필터 + 감쇠 사인). 이유:
- 남의 녹음·사운드 라이브러리를 쓰지 않으니 라이선스와 레퍼런스 앱 사운드 모사 위험이 없다(`docs/10` R9).
- 다운로드할 오디오 파일이 없어 첫 소리가 빠르고 오프라인 캐시도 필요 없다.
- 같은 합성 파라미터를 Android로 옮기거나, 합성 결과를 WAV로 구워 SoundPool에 넣을 수 있다.

녹음 샘플이 더 좋다고 판단되면 직접 녹음하거나 라이선스가 명확한 자산으로 바꾼다. 그때 이 절과 `SOURCES.md`를 고친다.

### 이벤트 판정
소리 종류는 `keydown`이 아니라 `beforeinput`의 `inputType`/`data`로 정한다. 모바일 가상 키보드는 `keydown`에서 `key`가 `Unidentified`로 오는 경우가 많다.
- `insertText` + 공백 → space, 그 외 `insertText`/`insertCompositionText` → key
- `insertLineBreak`/`insertParagraph` → carriageReturn(Enter)
- `deleteContent*` → backspace
- 캐럿이 줄 폭의 88%를 넘으면 그 줄에서 한 번 bell

### variation
- volume ±4%
- playbackRate 0.98~1.02
- 같은 샘플 3연속 방지

### latency
Web:
- AudioBuffer preload
- AudioContext unlock
- 짧은 one-shot sample

Android:
- SoundPool 우선
- 긴 ambient만 Media3/ExoPlayer 계열 검토

## 7. Audio accessibility
- master sound toggle
- key sound와 bell 별도 제어
- system reduced sound 설정을 존중할 수 있는지 플랫폼별 검토

> **Web P0 범위:** 사운드는 master on/off 하나만 둔다. key·bell 개별 조절은 Phase 1 설정 화면에서 추가한다.

## 8. Haptic (Android)
Preset:
```text
Off
Soft
Medium
Strong
```
문자마다 강한 vibration을 주지 않는다. 기본은 매우 약한 click 또는 키 입력 일부 이벤트에만 제한한다.

Enter/carriage return은 일반 문자보다 조금 더 구분된 feedback 가능.

## 9. 성능 tier
```text
High: grain + curvature + dynamic lamp + full motion
Medium: static grain + curvature + reduced lamp
Low: static paper bitmap + no dynamic grain + minimal motion
```
FPS 저하를 실시간 추측해 자동 tier 변경하기보다는 기기/사용자 설정과 명확한 `Reduce visual effects` 옵션을 우선한다.

## 10. Export parity
화면과 PNG/PDF 결과가 너무 다르면 제품 신뢰가 깨진다.
- paper preset/ink seed는 export에 동일 적용
- lamp는 문서 export에서 기본 제외, postcard/keepsake에서 선택적 포함
- UI carriage/cursor는 export에 포함하지 않음
