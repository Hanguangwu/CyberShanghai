declare module 'react' {
  export type ReactNode = unknown
  export type CSSProperties = Record<string, string | number>
  export const StrictMode: (props: { children?: unknown }) => unknown
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  export function useRef<T>(value: T | null): { current: T | null }
  export function useState<T>(value: T): [T, (value: T) => void]
}
declare module 'react-dom/client' { export function createRoot(element: Element): { render(node: unknown): void } }
declare module 'react/jsx-runtime' { export const jsx: unknown; export const jsxs: unknown; export const Fragment: unknown }
declare namespace JSX { interface IntrinsicElements { [element: string]: Record<string, unknown> } }
