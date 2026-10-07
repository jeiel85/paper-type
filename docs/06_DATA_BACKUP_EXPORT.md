# 06. Data / Backup / Export

## 1. 데이터 소유권
노트의 원본은 로컬 DB에 존재하며, 서버 계정이 없더라도 모든 기능이 동작한다.

## 2. Note model 핵심
```text
schemaVersion
id
createdAt
updatedAt
title(optional)
text
paperPresetId
inkPresetId
writerSettings
correctionMarks[]
attachments[]
deletedAt(optional)
```
정식 JSON Schema는 `schemas/papertype-note.schema.json` 참조.

## 3. ID
UUID v4 또는 crypto.randomUUID()를 사용한다. 플랫폼 간 충돌을 피한다.

## 4. 시간
저장: ISO 8601 UTC (`2026-10-07T02:00:00Z`)
표시: 사용자 로컬 timezone.

## 5. Trash
soft delete:
```text
deletedAt != null
```
**결정: v1에서는 자동 영구삭제를 하지 않는다.** 영구삭제는 사용자가 Trash에서 직접 고른 노트나 `비우기`로만 한다. 데이터 안전이 정리보다 우선이고(`docs/09` 우선순위), 자동 삭제는 되돌릴 수 없다. 오래된 휴지통 항목이 쌓이는 문제가 실제로 보이면 그때 "30일 지난 항목 정리" 같은 **수동** 동작부터 검토한다.

## 6. Backup ZIP
확장자 예:
`papertype-backup-2026-10-07.zip`

```text
manifest.json
notes/
  <uuid>.json
attachments/
  <uuid>.<ext>
```

manifest:
- backupFormatVersion
- appVersion
- createdAt
- noteCount
- attachmentCount
- notes[] / attachments[]: 항목마다 `id`, `path`, `sha256`

체크섬은 별도 `checksums` 필드가 아니라 **항목마다 `sha256`**(파일 바이트의 소문자 hex SHA-256)으로 둔다. 스키마상 optional이지만 앱이 만드는 백업에는 항상 넣고, import 때 있으면 검증한다. 정식 정의는 `schemas/papertype-backup-manifest.schema.json`.

manifest는 **모르는 최상위 필드를 허용**한다. 새 버전 앱이 필드를 추가해도 옛 버전 앱이 백업 전체를 거부하지 않게 하기 위해서다(`docs/07` §10과 같은 원칙). 반대로 형식이 바뀌어 옛 앱이 읽으면 안 되는 변경은 `backupFormatVersion`을 올린다.

## 7. Import policy
Import 전:
0. 검증은 `schemas/*.json` + Ajv(+ajv-formats)로 한다(`docs/03` §2)
1. ZIP 총 크기 제한
2. 압축 해제 예상 크기 제한
3. 파일 개수 제한
4. path traversal 차단 (`../`)
5. manifest schema validation
6. note schema validation
7. attachment MIME/size validation

충돌 정책:
- 같은 ID + 같은 updatedAt/content hash: skip
- 같은 ID + 다른 내용: import copy with new ID 또는 사용자 선택
MVP에서는 **새 ID로 복사**가 가장 안전하다.

새 ID로 복사할 때 `writerSettings.inkSeed`는 **원본 값을 그대로 둔다.** 잉크 seed가 note id에 묶여 있으면 복사본의 잉크 모양이 전부 바뀌기 때문이다. 원본에 `inkSeed`가 없으면 원본 `id`를 `inkSeed`로 채운 뒤 복사한다.

## 8. Text export
- TXT: 순수 본문
- MD: frontmatter(optional) + 본문
- JSON: portable note schema

## 9. Visual export
### PNG
- 2x 또는 3x raster scale
- 종이 여백 포함
- 최대 canvas size 안전 제한

### PDF
페이지 크기:
- A4
- A5
- US Letter

긴 문서는 pagination 엔진이 필요하다. 화면의 자유로운 paper transform을 그대로 PDF에 찍지 않고 문서 레이아웃 규칙을 따로 둔다.

## 10. Web ↔ Android 호환
공통으로 유지할 것:
- JSON field 이름
- enum 값
- schema version
- deterministic ink seed algorithm version
- attachment naming
- UTC timestamp

플랫폼 전용 설정은 `platformExtensions` 아래에 넣거나 export에서 제외한다.

## 11. 개인정보
- 노트 본문 로그 출력 금지
- crash report/analytics를 기본적으로 넣지 않음
- 디버그 로그에도 note text를 기록하지 않음
- import 오류 메시지에서 본문을 그대로 노출하지 않음
