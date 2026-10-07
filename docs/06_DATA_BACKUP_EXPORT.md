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
기본 자동 정리 30일은 설정 가능하게 하거나, 자동 영구삭제 자체를 v1에서는 끌 수 있다.

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
- checksums(optional but recommended)

## 7. Import policy
Import 전:
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
