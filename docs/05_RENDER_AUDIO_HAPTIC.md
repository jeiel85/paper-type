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
Math.random()을 render마다 호출하지 않는다.

Seed 예:
```text
hash(noteId + ':' + charLogicalIndex + ':' + codePoint + ':' + styleVersion)
```

파생 값:
- opacity: 0.88~1.00
- x jitter: ±0.20px
- y jitter: ±0.18px
- rotation: ±0.12deg

한글은 영문보다 획이 복잡하므로 opacity/jitter 폭을 더 보수적으로 둔다.

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
실제 구현에서는 seed hash와 버전을 고정해 export 재현성을 확보한다.

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
