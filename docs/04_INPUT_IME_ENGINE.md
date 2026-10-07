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
### 7.1 소유권 — 앱이 기록을 갖는다
브라우저 textarea도 자체 undo 기록을 가지지만, 앱 코드가 `textarea.value`를 한 번이라도 직접 바꾸면 그 기록은 어긋난다. 그래서 다음처럼 나눈다.

| 역할 | 담당 |
|---|---|
| 글자 입력·조합·선택·붙여넣기 | 브라우저(native textarea) |
| 문서 원본(text, selection) | Document Engine — textarea 값과 diff로 맞춘다 |
| undo/redo 기록과 실행 | Document Engine |

- `beforeinput`의 `historyUndo`/`historyRedo`와 단축키(Ctrl/⌘+Z, Ctrl/⌘+Shift+Z, Ctrl+Y)는 `preventDefault()` 하고 앱 기록으로 처리한다.
- 앱이 `textarea.value`를 직접 쓰는 경우는 **undo/redo 적용과 최초 로드뿐**이다. 그 외에는 브라우저가 쓴 값을 읽기만 한다.
- 조합(composition) 중에는 undo 단축키를 무시한다.
- 각 변경은 이전 값과 새 값의 공통 앞/뒤를 잘라낸 `replace {from, to, text}` 하나로 정규화한다. inputType별로 연산을 따로 만들지 않아도 되고, 브라우저마다 다른 이벤트 순서에 덜 의존한다.

### 7.2 그룹 규칙
composition 하나는 **한 번의 undo**로 취소되어야 한다.
예: `한`을 입력하기 위해 발생한 자모 내부 이벤트를 세 번 undo하지 않는다.

Transaction grouping:
- IME commit: 1 group
- 일반 연속 타이핑: 500ms 이내 연속 insert를 그룹 가능
- paste: 1 group
- correction-mode mark: 1 group
- 줄바꿈, 삭제↔입력 전환, 캐럿을 다른 곳으로 옮긴 뒤의 입력은 새 그룹을 시작한다
- 기록은 최대 200 그룹, 넘치면 오래된 것부터 버린다

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

### 11.1 overlay 정렬 규칙
textarea는 글자색을 투명(`color: transparent`)으로 두고 캐럿·선택 영역만 보이게 한다. 같은 상자 안 아래층에 같은 텍스트를 잉크로 그린 overlay(`aria-hidden`)를 둔다. 두 층의 줄바꿈이 1px이라도 다르면 캐럿이 글자와 어긋나므로 다음을 지킨다.
- 같은 font, size, line-height, padding, `white-space: pre-wrap`, `overflow-wrap`, `word-break`, `tab-size`
- `font-kerning: none`, `font-variant-ligatures: none` — 글자마다 span을 나누면 span 경계에서 커닝/합자가 달라질 수 있다
- 글자 span은 **inline** 그대로 두고 `position: relative`의 `left/top`으로만 흔든다. `transform`은 inline 요소에 적용되지 않고, `inline-block`으로 바꾸면 줄바꿈 위치가 달라진다. 그래서 **회전은 쓰지 않는다**(`docs/05` §2).
- 문단(`\n` 단위)마다 블록 하나로 렌더링한다. 빈 문단은 폭 0 문자로 한 줄 높이를 유지한다.
- textarea 높이는 overlay 높이를 따른다(내부 스크롤 없음).
- 조합 중인 글자도 overlay에 그리되 밑줄로 구분한다. 저장·undo 기록에는 넣지 않는다(§3).

