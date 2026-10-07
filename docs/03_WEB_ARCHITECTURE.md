# 03. Web Architecture

## 1. Stack
```text
React + TypeScript + Vite
Dexie (IndexedDB)
Zustand (ephemeral UI state — 여러 화면이 공유하는 상태가 생길 때 도입, P0는 컴포넌트 상태로 충분)
Ajv + ajv-formats (schemas/*.json 을 그대로 검증 계약으로 사용)
Web Audio API
PWA (service worker)
CSS transforms + Canvas selectively
Vitest + Playwright
```

## 2. 원칙
- 문서 원본(source of truth)은 React DOM이 아니라 **Document Model**이다.
- IME 입력은 native textarea/contenteditable 계층을 통해 브라우저에 맡긴다.
- 시각 효과는 Document Model을 읽는 renderer가 담당한다.
- DB write와 렌더링을 분리한다.
- **undo/redo 기록은 앱(Document Engine)이 소유한다.** 브라우저 기본 undo는 막는다. 자세한 규칙은 `docs/04` §7.
- 검증은 Zod 같은 별도 타입 정의를 두지 않고 `schemas/` 의 JSON Schema 파일을 Ajv로 그대로 쓴다. Web과 Android가 같은 파일을 계약으로 공유하기 위해서다(`docs/10` R10). JSON Schema 2020-12의 `format`은 기본이 주석(annotation)이므로 **ajv-formats로 format 검사를 반드시 켠다.**

## 3. 모듈 구조
```text
src/
├─ app/
│  ├─ routes/
│  └─ providers/
├─ features/
│  ├─ home/
│  ├─ writer/
│  ├─ trash/
│  └─ settings/
├─ core/
│  ├─ document/
│  ├─ ime/
│  ├─ rendering/
│  ├─ audio/
│  ├─ storage/
│  ├─ backup/
│  ├─ export/
│  └─ perf/
└─ shared/
   ├─ ui/
   ├─ hooks/
   └─ utils/
```

## 4. 상태 구분
### Persistent
IndexedDB:
- notes
- noteRevisions(optional)
- attachments
- settings
- trash metadata

### Ephemeral
Zustand:
- activeNoteId
- composing state
- carriage position
- lamp preview
- open panel
- sound unlock state

입력 중 전체 노트 내용을 전역 상태 관리 라이브러리에 과도하게 복제하지 않는다.

## 5. IndexedDB schema
```text
notes
  id PK
  updatedAt index
  createdAt index
  deletedAt index

attachments
  id PK
  noteId index

settings
  key PK
```

## 6. Autosave
- input 이후 400~600ms debounce
- 최대 지연 2초(maxWait)
- `visibilitychange(hidden)` 즉시 flush
- `pagehide` 즉시 flush 시도
- 실패 시 recovery snapshot

### 저장 상태 머신
```text
clean -> dirty -> saving -> clean
                    └-> error -> saving(retry)
```

## 7. Service Worker
캐시 대상:
- app shell
- fonts
- paper textures
- local sound samples

사용자 노트 데이터는 SW Cache에 저장하지 않는다.

## 8. Web Audio
첫 사용자 gesture 전에 AudioContext 자동 재생을 기대하지 않는다.
- 첫 tap/key interaction에서 resume
- sound pool preload
- 짧은 sample은 decodeAudioData 후 buffer 재사용

## 9. Rendering strategy
초기에는 DOM 텍스트 + CSS effect가 기본이다.
Canvas는 다음에만 사용한다.
- 복잡한 grain overlay
- export rasterization
- 특정 ink mask 효과

IME 및 접근성을 위해 **모든 본문을 Canvas-only로 만들지 않는다.**

## 10. Error boundaries
- route level ErrorBoundary
- writer renderer failure 시 plain text fallback
- DB migration failure 시 read-only recovery 화면

## 11. 데이터 migration
DB/schema에 version을 둔다.
```text
DB v1 -> base notes
DB v2 -> attachments
DB v3 -> correction marks
```
Migration은 idempotent하고 백업 export가 가능해야 한다.

## 12. 보안
- 외부 HTML 삽입 금지
- Markdown preview 도입 시 sanitization
- import JSON은 schema validation 후 반영
- ZIP import는 파일 수/압축 해제 크기 상한 설정 (zip bomb 방지)
- ZIP 내부 경로는 manifest schema의 `path` 패턴(`notes/<id>.json`, `attachments/<id>.<ext>`)으로 고정하고, manifest에 없는 파일은 읽지 않는다 (path traversal 방지)
- 첨부 이미지 MIME과 크기 검증
