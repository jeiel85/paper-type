# 03. Web Architecture

## 1. Stack
```text
React + TypeScript + Vite
Dexie (IndexedDB)
Zustand (ephemeral UI state)
Zod or JSON Schema validation
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

## 3. 모듈 구조
```text
src/
├─ app/
│  ├─ routes/
│  └─ providers/
├─ features/
│  ├─ home/
│  ├─ writer/
│  ├─ archive/
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
- 첨부 이미지 MIME과 크기 검증
