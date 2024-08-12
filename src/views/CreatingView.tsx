import {
    Box,
    Button,
    Container,
    Group,
    Paper,
    Stack,
    TagsInput,
    Textarea,
    useMantineTheme,
} from '@mantine/core'
import { getHotkeyHandler } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconHash, IconSparkles } from '@tabler/icons-react'
import { listen } from '@tauri-apps/api/event'
import React, { ClipboardEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDatabase } from '~/providers/DatabaseProvider'
import { MainViewRoute } from '~/views/MainView'

export const CreatingViewRoute = {
    path: '/create',
    element: <CreatingView />,
}

export function CreatingView() {
    const navigate = useNavigate()
    const [pasteInputValue, setPasteInputValue] = useState<string>('')
    const [tagsInputValue, setTagsInputValue] = useState<string[]>([])
    const [tagSearchValue, setTagSearchValue] = useState('')
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
    const tagsRef = React.useRef<HTMLInputElement>(null)
    const theme = useMantineTheme()
    const db = useDatabase()

    useEffect(() => {
        const unlistenClosed = listen('window-closed', () => {
            navigate(MainViewRoute.path)
        })

        return () => {
            unlistenClosed.then(f => f())
        }
    }, [navigate])

    useEffect(() => {
        async function loadTags() {
            const rows = await db.select<{ name: string }[]>(
                'select name from tag order by name asc;',
            )
            setTagSuggestions(rows.map(r => r.name))
        }
        loadTags()
    }, [db])

    const savePaste = useCallback(
        async (tags: string[]) => {
            const rows = await db.select<{ id: number }[]>(
                'INSERT INTO paste (value) VALUES ($1) returning id;',
                [pasteInputValue.trim()],
            )

            if (!rows || rows.length === 0) {
                notifications.show({
                    title: 'Error',
                    message: 'Failed to save paste.',
                    color: 'red',
                })
                navigate(MainViewRoute.path)
                return
            }

            const pasteId = rows[0].id
            const tagSequence = tags.map((t, index) => ({
                tag: t.trim().toLowerCase(),
                seqId: index,
            }))
            for await (const { tag, seqId } of tagSequence) {
                await db.execute(
                    'INSERT INTO tag (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;',
                    [tag],
                )
                await db.execute(
                    'INSERT INTO paste_tag (paste_id, tag_id, seq_id) VALUES ($1, (SELECT id FROM tag WHERE name = $2), $3);',
                    [pasteId, tag, seqId],
                )
            }

            navigate(MainViewRoute.path)
        },
        [db, navigate, pasteInputValue],
    )

    const handlePaste = useCallback(async (event: ClipboardEvent<HTMLTextAreaElement>) => {
        event.preventDefault()
        if (!event.clipboardData) return

        const items = event.clipboardData.items
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile()
                if (blob) {
                    const reader = new FileReader()
                    reader.onload = e => {
                        const result = e.target?.result as string
                        setPasteInputValue(result)
                    }
                    reader.readAsDataURL(blob)
                }
            } else if (item.type.startsWith('text/')) {
                setPasteInputValue(event.clipboardData.getData('text/plain'))
            }
        }
        tagsRef.current?.focus()
    }, [])

    return (
        <>
            <Box
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                }}
            >
                <Paper
                    p="lg"
                    flex="1"
                    style={{
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        borderBottom: `1px solid ${theme.colors.gray[8]}`,
                    }}
                >
                    <Group justify="space-between">
                        <Button
                            color="violet"
                            disabled={!pasteInputValue}
                            onClick={() => savePaste(tagsInputValue)}
                            leftSection={<IconSparkles size={18} />}
                        >
                            Create
                        </Button>
                        <Button
                            color="gray"
                            onClick={() => navigate(MainViewRoute.path)}
                            variant="subtle"
                        >
                            Cancel
                        </Button>
                    </Group>
                </Paper>
            </Box>
            <Container fluid p="md">
                <Stack
                    gap="sm"
                    onKeyDown={getHotkeyHandler([
                        [
                            'mod+Enter',
                            () => {
                                savePaste([
                                    ...tagsInputValue,
                                    ...(tagSearchValue ? [tagSearchValue.trim()] : []),
                                ])
                            },
                        ],
                    ])}
                >
                    <Textarea
                        label="Paste"
                        className="paste-input"
                        autosize
                        value={pasteInputValue}
                        onChange={event => setPasteInputValue(event.currentTarget.value)}
                        autoFocus
                        maxRows={20}
                        onPaste={handlePaste}
                        variant="filled"
                    />
                    <TagsInput
                        ref={tagsRef}
                        label="Tags"
                        placeholder="Pick tag from list"
                        clearable
                        maxTags={8}
                        value={tagsInputValue}
                        searchValue={tagSearchValue}
                        onSearchChange={setTagSearchValue}
                        onChange={v => {
                            setTagsInputValue(v)
                        }}
                        limit={20}
                        data={tagSuggestions}
                        leftSection={<IconHash size={18} />}
                        leftSectionPointerEvents="none"
                    />
                </Stack>
            </Container>
        </>
    )
}
