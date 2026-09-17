# NP MKT CD집계표 기반 데이터 구조서

문서 버전: v0.1  
작성일: 2026-09-11  
목적: 누적 CD집계표 업로드와 구매·비용·Cost Down·업체·메일·AI 검색 기능의 기준 데이터 구조 정의

## 1. 확정된 데이터 원칙

- 원본 파일 전체를 업로드한다.
- 시스템은 `CD집계표(Total)` 시트를 읽는다. 헤더는 4행 기준이다.
- 기존 PO번호와 일치하면 새 파일의 내용으로 갱신한다.
- 신규 PO번호는 누적 추가한다.
- 새 파일에 없는 기존 PO는 삭제하지 않고 보존한다.
- PO번호가 빈 행도 저장하고 `PO번호 누락` 경고를 표시한다.
- 빈 PO번호는 팀장·Buyer·관리자가 화면에서 입력할 수 있다.
- 동일 PO번호의 여러 행은 하나의 구매 건에 품목별 상세행으로 저장한다.
- 업로드 권한은 팀장·Buyer·관리자에게 허용한다.
- 필수 컬럼 누락 시 업로드를 중단하고 누락 컬럼을 표시한다.
- 원본 표기값은 보존하고, 분석용 정규화값을 별도로 저장한다.

## 2. 원본 컬럼 매핑

| 원본 | 시스템 필드 | 저장 테이블 | 비고 |
|---|---|---|---|
| 세금계산서날짜 | tax_invoice_date | purchase_orders | FY·월별 기준일 |
| 검수일 | inspection_date | purchase_orders | 원본 보존 |
| 발주일 | order_date | purchase_orders | 원본 보존 |
| 납기희망일 | requested_delivery_date | purchase_orders | 원본 보존 |
| 상태 | source_status | purchase_orders | 완료 건 중심 |
| Action Item | action_item | purchase_orders | 원본 보존 |
| 월도 | source_month_label | purchase_orders | 표시는 보존, 분석은 날짜 재계산 |
| 구매용도 | purchase_purpose | purchase_orders | 분석 차원 |
| Buyer | buyer_id | purchase_orders | Buyer별 분석 |
| 부서 및 팀명 | organization_name | purchase_orders | 조직·승인자 연결 |
| 요청자 | requester_name | purchase_orders | 조회 조건 |
| Main Category | main_category | purchase_order_items | 원본 대분류 |
| Sub Category 1 | category_large | purchase_order_items | 시스템 대분류 |
| Sub Category 3 | category_small | purchase_order_items | 시스템 소분류 |
| 제조사/공급사 | manufacturer_name | purchase_order_items | 제조사 분석 |
| 모델명 | model_name | purchase_order_items | 동일 모델 단가 기준 |
| 규격 | specification | purchase_order_items | 모델 보조 식별값 |
| 단위 | unit | purchase_order_items | 수량 단위 |
| 수량 | quantity | purchase_order_items | 원본 수량 |
| 단가(원) | unit_price | purchase_order_items | 예상 단가 기준 |
| 금액(원) | purchase_amount | purchase_order_items | 공식 구매금액 |
| 납품업체명 | supplier_name | purchase_order_items | 업체 분석 |
| 사업자번호 | supplier_business_number | suppliers | 업체 식별 보조 |
| 고객명 | customer_name | purchase_orders/items | 고객별 조회 |
| 총 C/D단가 | cost_down_unit_amount | cost_downs | 원본 AR열 |
| 총 C/D금액 | cost_down_amount | cost_downs | 원본 AS열 |
| C/D% | cost_down_rate | cost_downs | 원본 AT열 |
| 업체선정기준 | supplier_selection_criterion | purchase_order_items | 업체 분석 |
| 구매요청번호 | source_request_number | purchase_orders | 구매요청 연결 |
| PO 번호 | po_number | purchase_orders | 갱신·중복 기준 |
| 인수증 번호 | receipt_number | purchase_orders | 증빙 조회 |
| invoice no | invoice_number | purchase_orders | 증빙 조회 |
| Cost center | cost_center | purchase_orders | 비용 분석 |
| 계정 | account_code | purchase_orders | 비용 분석 |

## 3. 금액·Cost Down 기준

공식 구매금액은 세금계산서 기준 `V열 금액(원)`이다.

```text
purchase_amount = 원본 V열 금액(원)
calculated_amount = quantity × unit_price
amount_difference = purchase_amount - calculated_amount
```

원본 금액은 수정하지 않고 `amount_difference`를 검증 정보로 저장한다.

Cost Down은 엑셀 값을 그대로 사용한다.

```text
cost_down_amount = 원본 AS열 총 C/D 금액
cost_down_rate = 원본 AT열 C/D%
```

필수 분석 결과:

- 월별·FY별 Cost Down 금액과 절감률
- 대분류·소분류별 Cost Down 금액
- Buyer별·업체별 Cost Down 금액
- 절감액 순위와 절감률 순위
- 구매금액 대비 Cost Down 비율

## 4. 논리 관계

```text
import_batches 1 ── N import_errors
import_batches 1 ── N purchase_orders
purchase_orders 1 ── N purchase_order_items
purchase_order_items 1 ── N transaction_quotes
purchase_order_items 1 ── 1 cost_downs
purchase_orders 1 ── N attachments
suppliers 1 ── N supplier_aliases
suppliers 1 ── N supplier_evaluations
suppliers 1 ── N contracts
contracts 1 ── N payment_targets
purchase_orders 1 ── N mail_drafts ── N mail_logs
search_logs 1 ── N search_evidence
```

## 5. 핵심 테이블

### 5.1 users

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID | Y | 사용자 ID |
| email | text | Y | 로그인 이메일, unique |
| name | text | Y | 사용자명 |
| role | enum | Y | requester / lead / buyer / admin |
| organization_id | UUID | N | 부서·팀 |
| is_active | boolean | Y | 활성 여부 |
| created_at | timestamptz | Y | 생성일시 |
| updated_at | timestamptz | Y | 수정일시 |

### 5.2 organizations

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID | Y | 조직 ID |
| name | text | Y | 부서·팀명 |
| leader_user_id | UUID | N | 기본 팀장 |
| alternate_approver_id | UUID | N | 대체 승인자 |
| is_active | boolean | Y | 활성 여부 |

### 5.3 categories / buyer_category_mappings

`categories`는 Main Category, 대분류(Sub Category 1), 소분류(Sub Category 3), 정규화명, 활성 여부를 저장한다.

`buyer_category_mappings`는 category_id, buyer_id, priority, 적용기간, is_primary, mapping_status를 저장한다. 중복 매칭은 `buyer_decision_required`로 두고 임의 배정하지 않는다.

### 5.4 purchase_orders

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID | Y | 내부 구매 건 ID |
| po_number | text | N | 외부 PO번호, 빈값 허용 |
| po_number_status | enum | Y | valid / missing / corrected / duplicate |
| tax_invoice_date | date | N | 세금계산서날짜 |
| inspection_date | date | N | 검수일 |
| order_date | date | N | 발주일 |
| requested_delivery_date | date | N | 납기희망일 |
| source_status | text | N | 원본 상태 |
| purchase_purpose | text | N | 구매용도 |
| buyer_id | UUID | N | Buyer |
| organization_id | UUID | N | 조직 |
| requester_name | text | N | 요청자 |
| customer_name | text | N | 고객명 |
| source_request_number | text | N | 구매요청번호 |
| fiscal_year | text | N | FY |
| fiscal_month | smallint | N | FY 기준 1~12월 |
| latest_import_batch_id | UUID | Y | 최종 갱신 배치 |
| created_at / updated_at | timestamptz | Y | 생성·수정일시 |

유효한 PO번호는 중복 검증 대상이다. 빈 PO번호에는 unique 제약을 적용하지 않는다.

### 5.5 purchase_order_items

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| id | UUID | Y | 품목 ID |
| purchase_order_id | UUID | Y | 구매 건 |
| source_row_number | integer | Y | 원본 행 번호 |
| category_large | text | N | 대분류 |
| category_small | text | N | 소분류 |
| manufacturer_name | text | N | 제조사 |
| model_name | text | N | 모델명 |
| normalized_model_name | text | N | 분석용 모델명 |
| specification | text | N | 규격 |
| unit | text | N | 단위 |
| quantity | numeric | N | 수량 |
| unit_price | numeric | N | 단가 |
| purchase_amount | numeric | N | 공식 구매금액 |
| calculated_amount | numeric | N | 수량×단가 |
| amount_difference | numeric | N | 금액 차이 |
| supplier_id | UUID | N | 표준 업체 |
| source_supplier_name | text | N | 원본 납품업체명 |

### 5.6 cost_downs / transaction_quotes

`cost_downs`는 item_id, cost_down_unit_amount, cost_down_amount, cost_down_rate, max_quote_unit_price, source_value_status를 저장한다.

`transaction_quotes`는 item_id, supplier_id, 원본 업체명, quote_amount, quote_unit_price, selected, source_column, quote_rank를 저장한다. 업체별 견적 영역(AE~AO)은 여러 견적 행으로 변환한다.

## 6. 업체·추천 데이터

### 6.1 suppliers

대표 업체명, 사업자번호, 담당자명, 담당자 이메일, 담당자 연락처, 유지보수 가능 여부(`yes/no/unknown`), 신규 업체 여부, 활성 여부를 저장한다.

### 6.2 supplier_aliases

업체명 별칭을 대표 업체에 연결한다. `㈜ABC`, `ABC`, `ABC코리아`를 동일 업체로 통합할 수 있으며, 별칭은 자동·수동·업로드 출처와 확인자를 기록한다.

### 6.3 supplier_evaluations

업체·평가기간·가격·납기·품질·응대·기술지원·유지보수·종합점수·평가파일·메모를 저장한다. 평가 파일은 추후 업로드한다.

### 6.4 supplier_recommendation_scores

기본 점수 비중은 가격 경쟁력 40%, 업체 평가 30%, 유지보수 가능 여부 15%, 거래 안정성 15%다.

모델 또는 카테고리별 가격 점수, 평가 점수, 유지보수 점수, 안정성 점수, 종합점수, 추천 유형(`historical/new_supplier`), 추천 상태를 저장한다.

과거 거래가 없는 업체는 `신규 업체`, `평가 미등록`, `가격 비교 불가`, `Buyer 검토 필요` 상태를 별도 표시한다.

## 7. 업로드 이력 데이터

### 7.1 import_batches

| 필드 | 설명 |
|---|---|
| id | 배치 ID |
| file_name / file_size | 원본 파일명·크기, 최대 10MB |
| uploaded_by / uploaded_at | 업로드자·일시 |
| source_sheet | CD집계표(Total) |
| status | validating / failed / preview / applied |
| total_rows | 전체 행 수 |
| new_rows | 신규 행 수 |
| updated_rows | 갱신 행 수 |
| warning_rows | 경고 행 수 |
| error_rows | 오류 행 수 |
| applied_at | 반영 일시 |

### 7.2 import_errors

배치ID, 원본 행 번호, PO번호, 오류 유형, 컬럼명, 메시지, 해결 여부, 해결자·일시를 저장한다.

- PO번호 빈값: `warning`, 업로드 허용
- 필수 컬럼 누락: `error`, 전체 업로드 중단
- 데이터 형식 오류: `error`, 해당 배치 반영 중단
- 금액 불일치: 기본 `warning`, 원본값 유지

## 8. FY 계산

기준일은 세금계산서날짜다. FY는 4월 1일부터 다음 해 3월 31일까지다.

```text
4~12월: FY = 해당 연도, FY월차 = 월 - 3
1~3월:  FY = 전년도, FY월차 = 월 + 9
```

예: 2026-04-01~2027-03-31은 `FY2026`, 2026년 9월은 FY 6개월차다. 대시보드 기본 기간은 현재 FY다.

## 9. 계약·지불·메일·검색

### contracts / payment_targets

계약은 업체, 제품, 유형, 시작일·종료일, 청구주기, 금액, Buyer, 유지보수 가능 여부, 계약서 첨부를 저장한다.

지불대상은 계약, 대상 FY·월, 매월 20일 생성일, 예정일, 예정금액, 증빙상태, 처리상태, Buyer를 저장한다.

### mail_drafts / mail_logs

메일 초안은 구매 건, 업체, 수신자, 참조자, 제목, 본문, 작성자, 복사일시를 저장한다. 기본 수신자는 업체 담당자, 참조자는 팀장이다.

메일 이력은 초안ID, 생성·복사·실패 등 이벤트, 수신자, 참조자, 제목, 본문 스냅샷, 원가 마스킹 여부, 수행자, 일시를 저장한다.

### search_logs / search_evidence

AI 검색은 사용자, 질문, 해석된 의도, 필터, 답변, 차트 설정, 검색일시를 저장한다. 근거 데이터는 원본 테이블·레코드ID·원본 행 번호·사용 컬럼·검색 당시 값 스냅샷을 저장한다.

## 10. 공통 데이터

`attachments`는 요청·품목·계약·업로드 배치에 연결하며 파일명, 저장경로, MIME, 크기, 업로더, 일시, 논리 삭제일을 저장한다. 파일당 최대 10MB다.

`audit_logs`는 원가 열람, PO번호 보완, 업체 별칭 변경, 업로드 갱신, Buyer 변경, 메일 초안 생성, 검색 실행 등 민감·주요 변경을 기록한다.

## 11. 조회용 뷰

### v_purchase_dashboard

FY, 월, 대분류, 소분류, Buyer, 업체, 구매용도, 구매 건수, 구매금액, Cost Down 금액, 절감률을 제공한다.

### v_model_price_history

정규화 모델명, 대분류·소분류, 최저 단가, 평균 단가, 최근 단가, 최근 구매일, 최근 업체, 거래 횟수를 제공한다.

### v_supplier_analysis

대표 업체명, 별칭, 구매금액, 구매 건수, Cost Down, 평균 단가, 유지보수 가능 여부, 평가점수, 추천점수를 제공한다.

### v_upload_quality

배치별 신규·갱신·경고·오류 건수, PO번호 누락, 금액 불일치, 업체명 매칭 필요, 카테고리 매핑 필요 건수를 제공한다.

## 12. 구현 전 확인이 필요한 항목

다음 6개는 데이터 구조 초안은 작성할 수 있지만, 구현 시 동작을 확정해야 한다.

1. 같은 PO번호가 새 파일에 일부 품목만 포함된 경우, 기존 품목을 삭제할지 유지할지
2. 수량×단가와 V열 금액의 차이를 얼마까지 허용할지
3. 추후 업체 평가 파일의 실제 컬럼과 평가기간
4. 회사 계정의 사용자·팀장·Buyer 식별자
5. AI 검색 데이터의 외부 전송 허용 여부
6. 팀장 자동 참조를 위한 팀장 이메일 정보 확보 방식

