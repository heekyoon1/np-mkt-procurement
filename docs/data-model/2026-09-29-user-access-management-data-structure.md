# NP MKT 사용자·권한 관리 데이터 구조서

## 1. 설계 원칙

- `auth.users`는 Supabase 인증 정보만 관리하고, 업무 프로필은 `public.profiles`에 둔다.
- 가입 직후 역할은 항상 `requester`이며 `is_active = true`다.
- Buyer 요청은 실제 역할과 분리하여 관리한다. 요청만으로 Buyer 권한이 자동 부여되지 않는다.
- 권한·상태·카테고리 변경은 삭제·수정 불가 감사 이력으로 보존한다.
- AD 연동을 대비해 이메일을 변경 불가한 식별 기준으로 사용하고, 부서·전화번호·AD 식별자는 별도 필드로 둔다.

## 2. 기존 테이블 확장: profiles

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---:|---|---|
| id | UUID PK | 예 | auth.users.id | 인증 사용자 식별자 |
| name | TEXT | 예 | - | 사용자 이름 |
| email | TEXT UNIQUE | 예 | - | 회사 이메일, AD 연동 기준 키 |
| role | app_role | 예 | requester | 실제 시스템 권한 |
| department | TEXT | 예 | - | 부서 |
| phone | TEXT | 예 | - | 연락처 |
| ad_object_id | TEXT | 아니오 | - | 향후 AD 객체 ID |
| ad_synced_at | TIMESTAMPTZ | 아니오 | - | AD 최종 동기화 시각 |
| is_active | BOOLEAN | 예 | true | 로그인·신규 자동 배정 허용 여부 |
| last_signed_in_at | TIMESTAMPTZ | 아니오 | - | 마지막 로그인 시각 |
| deactivated_at | TIMESTAMPTZ | 아니오 | - | 비활성화 시각 |
| deactivated_by | UUID FK | 아니오 | - | 비활성화 처리자 |
| created_at / updated_at | TIMESTAMPTZ | 예 | now() | 생성·수정 시각 |

### 2.1 제약

- `email`은 소문자 정규화 후 유일해야 한다.
- `role`은 기존 enum `requester`, `buyer`, `lead`, `admin`만 허용한다.
- 비활성 사용자는 `last_signed_in_at`을 제외한 이력 레코드를 삭제하지 않는다.

## 3. 신규 테이블

### 3.1 buyer_role_requests

Buyer 권한 요청의 승인 흐름을 관리한다.

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID PK | 예 | 요청 식별자 |
| requester_id | UUID FK profiles | 예 | 요청 사용자 |
| requested_categories | TEXT[] | 아니오 | 희망 담당 카테고리 목록 |
| request_note | TEXT | 아니오 | 요청 사유 |
| status | TEXT | 예 | pending / approved / rejected / on_hold / cancelled |
| reviewed_by | UUID FK profiles | 아니오 | 팀장 또는 관리자 처리자 |
| reviewed_at | TIMESTAMPTZ | 아니오 | 처리 시각 |
| review_note | TEXT | 아니오 | 승인·반려·보류 사유 |
| created_at / updated_at | TIMESTAMPTZ | 예 | 요청 생성·수정 시각 |

제약 및 인덱스:

- 한 사용자당 `pending`, `on_hold` 상태 요청은 하나만 허용한다.
- `requester_id`, `status`, `created_at desc` 인덱스를 둔다.
- 승인되면 사용자 역할을 `buyer`로 바꾸고 `buyer_category_assignments`를 반영한다.

### 3.2 buyer_category_assignments

Buyer의 담당 카테고리를 다중 매핑한다.

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID PK | 예 | 매핑 식별자 |
| profile_id | UUID FK profiles | 예 | Buyer 사용자 |
| category_large | TEXT | 예 | 대분류 |
| category_small | TEXT | 아니오 | 소분류, 없으면 대분류 전체 담당 |
| assigned_by | UUID FK profiles | 예 | 지정자 |
| assigned_at | TIMESTAMPTZ | 예 | 지정 시각 |
| unassigned_at | TIMESTAMPTZ | 아니오 | 해제 시각 |
| note | TEXT | 아니오 | 지정 사유·메모 |

- 활성 매핑은 `profile_id + category_large + coalesce(category_small, '')` 조합으로 중복되지 않는다.
- Buyer는 카테고리 매핑이 하나도 없어도 허용한다.

### 3.3 user_access_audit_logs

권한·상태·카테고리·Buyer 요청 처리의 감사 이력을 저장한다.

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID PK | 예 | 이력 식별자 |
| target_profile_id | UUID FK profiles | 예 | 변경 대상 사용자 |
| actor_profile_id | UUID FK profiles | 예 | 변경 실행자 |
| action_type | TEXT | 예 | role_changed / status_changed / category_assigned / category_removed / buyer_request_reviewed / profile_updated |
| before_value | JSONB | 아니오 | 변경 전 값 |
| after_value | JSONB | 아니오 | 변경 후 값 |
| reason | TEXT | 예 | 변경·처리 사유 |
| occurred_at | TIMESTAMPTZ | 예 | 변경 시각 |

- 일반 사용자는 본인 이력만 읽을 수 있다.
- 팀장·관리자는 전체 이력을 읽을 수 있다.
- INSERT만 허용하며 UPDATE·DELETE 정책은 만들지 않는다.

### 3.4 user_notifications

Buyer 요청 승인·반려와 계정 상태 변경을 시스템 안에서 알린다.

| 컬럼 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID PK | 예 | 알림 식별자 |
| recipient_profile_id | UUID FK profiles | 예 | 수신 사용자 |
| type | TEXT | 예 | buyer_request_approved / buyer_request_rejected / account_deactivated 등 |
| title | TEXT | 예 | 알림 제목 |
| message | TEXT | 예 | 알림 본문 |
| reference_type / reference_id | TEXT / UUID | 아니오 | 연결된 요청·사용자 |
| is_read | BOOLEAN | 예 | false |
| created_at / read_at | TIMESTAMPTZ | 예/아니오 | 생성·읽음 시각 |

## 4. 권한 검증 함수

| 함수 | 결과 |
|---|---|
| current_profile() | 로그인 사용자의 profiles 레코드 |
| is_active_np_mkt_user() | 활성 사용자 여부 |
| is_team_lead_or_admin() | 팀장 또는 관리자 여부 |
| can_manage_target_user(target_id) | 팀장·관리자별 대상 역할 관리 가능 여부 |
| can_review_buyer_request(request_id) | 요청 승인·반려 가능 여부 |

`can_manage_target_user` 규칙:

1. 관리자는 모든 역할·계정을 관리할 수 있다.
2. 팀장은 요청자와 Buyer의 역할·상태·카테고리만 관리할 수 있다.
3. 팀장은 팀장·관리자 역할을 변경할 수 없다.
4. 사용자는 자기 자신의 관리자 권한을 해제하거나 본인 계정을 비활성화할 수 없다.

## 5. RLS 정책 요약

| 테이블 | 요청자/Buyer | 팀장 | 관리자 |
|---|---|---|---|
| profiles | 본인 읽기·부서/연락처 수정 | 전체 읽기, 허용 범위 수정 | 전체 읽기·수정 |
| buyer_role_requests | 본인 생성·조회·취소 | 전체 조회·처리 | 전체 조회·처리 |
| buyer_category_assignments | 본인 조회 | 허용 대상 관리 | 전체 관리 |
| user_access_audit_logs | 본인 조회 | 전체 조회 | 전체 조회 |
| user_notifications | 본인 조회·읽음 처리 | 본인 조회 | 본인 조회 |

## 6. 가입과 권한 변경 트랜잭션

### 6.1 회원가입

1. Supabase Auth 사용자 생성
2. `profiles` 생성: 역할 requester, 활성 true, 부서·연락처 저장
3. Buyer 요청 시 `buyer_role_requests(status = pending)` 생성
4. 사용자에게 즉시 세션 발급
5. 감사 이력 `profile_created`, Buyer 요청 이력 생성

### 6.2 Buyer 요청 승인

1. 팀장 또는 관리자가 대기 요청을 선택
2. 권한 범위 확인
3. `profiles.role = buyer` 갱신
4. 요청 카테고리를 buyer_category_assignments에 반영(선택 항목)
5. 요청 상태 approved, 처리자·사유 기록
6. 감사 이력·시스템 알림 생성

### 6.3 계정 비활성화

1. 관리자 또는 허용된 팀장이 대상 선택
2. 본인·상위권한 보호 규칙 검증
3. `is_active = false`, 비활성화 정보 기록
4. 신규 Buyer 자동 배정 후보에서 제외
5. 과거 구매·계약·승인 이력은 변경하지 않음
6. 감사 이력·시스템 알림 생성

## 7. 마이그레이션 순서

1. profiles에 부서·연락처·AD 연동·상태 상세 컬럼 추가
2. Buyer 요청·카테고리 매핑·감사 이력·알림 테이블 생성
3. 트리거와 RLS 함수·정책 적용
4. 기존 Supabase 사용자 프로필의 부서·연락처 보완
5. 사용자 관리 API와 화면 연결
