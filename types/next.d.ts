declare module 'next/headers' {
  export function cookies(): {
    get: (name: string) => { value: string } | undefined
    getAll: () => Array<{ name: string; value: string }>
    set: (name: string, value: string, options?: any) => void
    delete: (name: string) => void
  }
}

declare module 'next/server' {
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse
    static next(): NextResponse
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse
  }

  export class NextRequest extends Request {
    nextUrl: URL
    ip?: string
    geo?: {
      city?: string
      country?: string
      region?: string
    }
  }
} 