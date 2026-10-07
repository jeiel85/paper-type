# 07. Android Native Architecture

## 1. Stack
```text
Kotlin
Jetpack Compose
Room
DataStore
Coroutines / Flow
SoundPool
Android Photo Picker
Storage Access Framework / Sharesheet
```

## 2. 모듈 권장
작은 앱에 과도한 멀티모듈을 적용하지 않는다.
```text
app
core:model
core:data
core:design
feature:home
feature:writer
feature:settings
```
초기에는 `core`와 `feature`를 패키지 경계로만 두고, 규모가 커질 때 Gradle module로 분리해도 된다.

## 3. Architecture
```text
Compose UI
   ↓ UiEvent
ViewModel
   ↓
Repository / WriterEngine
   ↓
Room / DataStore / Files
```
Writer 입력 엔진은 UI Composable에 직접 묶지 말고 독립 테스트 가능하게 만든다.

## 4. IME
Compose `BasicTextField` / `TextField`의 native IME 연결을 우선 사용한다.
커스텀 Canvas가 입력 원본이 되어서는 안 된다.

Visual overlay:
```text
Box
├─ Paper
├─ Editable text layer
├─ Ink/texture overlay
├─ Carriage
└─ Lamp
```

Android에서는 `TextFieldValue`의 selection/composition을 보존해야 한다. 매 recomposition마다 String만 새로 주입하여 composition을 깨뜨리지 않는다.

## 5. Room
Entities:
- NoteEntity
- AttachmentEntity
- optional CorrectionMarkEntity

본문은 SQLite TEXT로 저장. autosave는 transaction + IO dispatcher.

## 6. DataStore
- selected paper
- selected ink
- sound/haptic levels
- lamp settings
- accessibility effect reduction

## 7. Audio
짧은 타건음은 `SoundPool`.
- preload 완료 상태 관리
- 최대 동시 stream 제한
- lifecycle에 따라 release

## 8. Haptic
Compose `LocalHapticFeedback`로 가능한 기본 feedback을 우선 사용하고, 세밀한 waveform이 반드시 필요할 때만 Vibrator API를 확장한다.
사용자 시스템 설정을 존중한다.

## 9. 파일
### Export
Storage Access Framework `ACTION_CREATE_DOCUMENT` 또는 Sharesheet.

### Import
`ACTION_OPEN_DOCUMENT`/Photo Picker 등 시스템 picker 사용.
광범위 저장소 권한을 요구하지 않는다.

## 10. Backup compatibility
Web과 동일한 manifest/note JSON schema를 사용한다.
Android serializer는 unknown field를 무시할 수 있도록 forward compatibility를 고려한다.

## 11. 성능
- 애니메이션에서 불필요한 전체 recomposition 방지
- carriage/paper offset은 Animatable 또는 graphicsLayer
- 긴 문서에서 문자마다 별도 Composable을 생성하지 않음
- ink variation은 span/paint 또는 batched drawing 방식 검토

## 12. Android 접근성
- TalkBack에서 본문 편집 가능
- 터치 타겟 확보
- 시스템 font scale 대응
- reduce motion에 상응하는 앱 설정 제공
- sound/haptic 독립 비활성화

## 13. 최소 OS
정확한 minSdk는 실제 배포 목표 시 결정한다. 최신 Compose/Photo Picker 호환성과 사용자 범위를 비교해 ADR로 확정한다. 설계 문서에서는 임의 버전을 사실처럼 고정하지 않는다.
