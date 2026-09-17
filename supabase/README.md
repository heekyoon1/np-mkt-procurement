# Supabase 적용 순서

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `schema.sql` 전체를 실행합니다.
3. Authentication에서 이메일 로그인을 활성화합니다.
4. `profiles`에 회사 사용자와 역할(`requester`, `lead`, `buyer`, `admin`)을 등록합니다.
5. 로컬 또는 Vercel 환경변수에 `.env.example`의 값을 입력합니다.
6. 앱 재시작 후 사이드바에 `Supabase 연결 준비됨`이 표시되는지 확인합니다.

## 현재 프로토타입의 적용 범위

- 환경변수가 없으면 브라우저 로컬 저장 모드로 동작합니다.
- Supabase 스키마에는 구매 데이터, 업체 별칭, 계약, 지급 대상, 지급 상태 이력, 업로드 배치를 포함합니다.
- 인수증·송장·AP 전표 원본은 Ariba에서 처리하며, 시스템에는 지급 상태만 기록합니다.
- 파일 업로드 원본 보관용 Storage 버킷과 실제 Supabase CRUD 연결은 프로젝트 키 입력 후 다음 구현 단계에서 연결합니다.
