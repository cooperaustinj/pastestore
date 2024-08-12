import { createTheme, DEFAULT_THEME, mergeMantineTheme } from '@mantine/core'

export const theme = mergeMantineTheme(DEFAULT_THEME, createTheme({}))
