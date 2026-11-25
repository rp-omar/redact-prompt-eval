type Budget = { bytes: number; files: string[] }
export declare const BUILDS: { redact: string; 'react-dom': string }
export declare const LIMITS: { coldEntryJs: number; routeJs: number; firstViewCss: number }
export declare const ROUTES: Record<'/' | '/items/$id', string[]>
export declare function analyze(distDir: string): {
  distDir: string
  routes: Record<'/' | '/items/$id', { coldEntryJs: Budget; routeJs: Budget; firstViewCss: Budget }>
  files: Record<string, { raw: number; brotli: number }>
}
