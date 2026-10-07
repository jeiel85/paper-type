# 04. Input / IME Engine

## 1. 가장 중요한 규칙
**keydown 기반으로 문자 자체를 생성하지 않는다.**
한글/중국어/일본어/모바일 키보드는 조합(composition) 과정을 거치므로 `beforeinput`, `input`, `composition*` 이벤트를 중심으로 처리한다.

## 2. 계층
```text
Native textarea
    ↓ Browser IME
Input Adapter
    ↓ normalized edit operation
Document Engine
    ↓ immutable-ish transaction
Render Model
    ↓
Visual Renderer
```

## 3. composition 상태
```ts
type CompositionState = {
  active: boolean;
  text: string;
  rangeStart: number;
  rangeEnd: number;
}
```

### 규칙
- `compositionstart`: 임시 조합 시작
- `compositionupdate`: 화면 preview만 갱신
- `compositionend`: 확정 문자열을 하나의 transaction으로 commit
- 조합 중 autosave에 미확정 문자열을 영구 commit하지 않는다.

## 4. 이벤트 우선순위
브라우저별 차이가 있으므로 이벤트 순서에 대한 가정을 최소화한다.
최종 데이터 변경은 `beforeinput/input`의 `inputType`과 textarea 최종값을 기준으로 reconcile한다.

관심 inputType 예:
```text
insertText
insertCompositionText
insertLineBreak
deleteContentBackward
deleteContentForward
insertFromPaste
historyUndo
historyRedo
```

## 5. Selection model
UTF-16 index만 무작정 글자 인덱스로 사용하면 emoji/surrogate pair에서 문제가 생긴다.
- 내부 편집 위치: JS string offset을 사용하되
- 시각적 glyph/문자 단위 연산은 `Intl.Segmenter` 사용을 우선 검토
- 한글 완성 음절을 자모로 인위적으로 분리하지 않는다.

## 6. Document transaction
```ts
type EditOperation =
  | { type: 'insert'; at: number; text: string }
  | { type: 'delete'; from: number; to: number }
  | { type: 'replace'; from: number; to: number; text: string }
  | { type: 'lineBreak'; at: number };
```

Transaction에는 다음을 포함한다.
```text
beforeSelection
afterSelection
operations[]
timestamp
source: keyboard | ime | paste | undo | programmatic
```

## 7. Undo/Redo
composition 하나는 **한 번의 undo**로 취소되어야 한다.
예: `한`을 입력하기 위해 발생한 자모 내부 이벤트를 세 번 undo하지 않는다.

Transaction grouping:
- IME commit: 1 group
- 일반 연속 타이핑: 500ms 이내 연속 insert를 그룹 가능
- paste: 1 group
- correction-mode mark: 1 group

## 8. Typewriter correction mode
원본 문자열을 삭제하지 않고 correction mark를 남기는 모드에서는 모델을 다음처럼 확장한다.
```text
text: canonical current text
marks: [{range, kind:'strike', originalText, createdAt}]
```
단, MVP에서는 clean deletion을 먼저 구현하고 correction mark는 후속 플래그로 개발한다.

## 9. 한글 QA 필수 케이스
1. `안녕하세요` 천천히 입력
2. 매우 빠르게 입력
3. `값`, `닭`, `읽다` 등 복합 받침
4. 입력 도중 Backspace
5. 조합 중 방향키 이동
6. 단어 일부 선택 후 한글로 교체
7. 영문↔한글 키보드 전환
8. emoji 뒤에 한글 입력
9. 붙여넣기 후 즉시 한글 입력
10. Samsung Keyboard / Gboard / Windows Korean IME

## 10. 숨은 textarea 방식 주의점
완전히 `display:none` 하면 IME가 동작하지 않는다.
권장:
```text
position: fixed
opacity: 0.01
width/height: 1px
pointer-events: none
```
다만 모바일 accessibility/keyboard 위치 이슈가 있으므로 실제 프로토타입에서 검증한다.

대안은 시각적으로 스타일링한 native textarea/contenteditable 위에 effect layer를 겹치는 방식이다. **정확성 우선이라면 이 방식이 초기 구현에 더 안전하다.**

## 11. 초기 구현 결정
P0에서는 “완전 분리 hidden editor”보다 **native editable text layer + decorative ink overlay**를 우선한다. IME 안정성을 확보한 뒤 renderer 분리를 심화한다.
