/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // 필요시 다른 환경 변수들 추가
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}