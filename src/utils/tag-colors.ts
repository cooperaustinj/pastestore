import { lighten, MantineColor } from '@mantine/core'

import { theme } from '~/theme'

export const TAG_COLORS = [
    'red',
    'pink',
    'grape',
    'violet',
    'indigo',
    'blue',
    'cyan',
    'teal',
    'green',
    'lime',
    'yellow',
    'orange',
] as const

export function fnv1a(str: string): number {
    let hash = 2166136261
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i)
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }
    return hash >>> 0
}

export function tagColor(str: string): MantineColor {
    const colors = theme.colors

    const hash = fnv1a(str)

    const colorIndex = Math.abs(hash) % TAG_COLORS.length
    const colorName = TAG_COLORS[colorIndex]
    const color = lighten(colors[colorName][4], 0.1)

    return color
}
