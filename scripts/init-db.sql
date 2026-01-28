-- 데이터베이스 초기화 스크립트
-- PostgreSQL용 데이터베이스 설정

-- 기본 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 테이블스페이스 생성 (선택사항)
-- CREATE TABLESPACE production_data LOCATION '/var/lib/postgresql/production_data';

-- 인덱스 최적화를 위한 설정
SET maintenance_work_mem = '256MB';
SET shared_buffers = '256MB';
SET effective_cache_size = '1GB';

-- 로깅 설정
SET log_statement = 'all';
SET log_duration = on;

-- 시간대 설정
SET timezone = 'Asia/Seoul';

-- 초기 데이터베이스 설정 완료 로그
SELECT 'Database initialization completed' as status;