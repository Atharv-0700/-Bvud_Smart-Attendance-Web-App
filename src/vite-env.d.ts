/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEETS_API_KEY?: string;
  readonly VITE_GOOGLE_SHEETS_CLIENT_ID?: string;
  readonly VITE_SHEET_SEM1_DIVA?: string;
  readonly VITE_SHEET_SEM2_DIVA?: string;
  readonly VITE_SHEET_SEM3_DIVA?: string;
  readonly VITE_SHEET_SEM4_DIVA?: string;
  readonly VITE_SHEET_SEM5_DIVA?: string;
  readonly VITE_SHEET_SEM6_DIVA?: string;
  readonly VITE_SHEET_SEM1_DIVB?: string;
  readonly VITE_SHEET_SEM2_DIVB?: string;
  readonly VITE_SHEET_SEM3_DIVB?: string;
  readonly VITE_SHEET_SEM4_DIVB?: string;
  readonly VITE_SHEET_SEM5_DIVB?: string;
  readonly VITE_SHEET_SEM6_DIVB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// Support for figma:asset virtual modules
declare module 'figma:asset/*' {
  const value: string;
  export default value;
}
