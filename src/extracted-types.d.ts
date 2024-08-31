/* This file is a utility to easily include types in AI prompting */

/* ~providers/DatabaseProvider */
type DatabaseProviderProps = {
    children: ReactNode
}

/* ~views/MainView */
export type Paste = {
    id: number
    value: string
    createdAt: string
    lastUsedAt: string
}

/* ~views/MainView */
export type PasteWithTags = Paste & {
    tags: string[]
}