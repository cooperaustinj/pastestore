import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import {
    Badge,
    Box,
    Button,
    Container,
    Group,
    Paper,
    Stack,
    TagsInput,
    Text,
    Textarea,
    useMantineTheme,
} from '@mantine/core'
import { getHotkeyHandler } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconHash, IconSparkles } from '@tabler/icons-react'
import React, { ClipboardEvent, useCallback, useEffect, useState } from 'react'
import { DropResult } from 'react-beautiful-dnd'
import { useNavigate, useParams } from 'react-router-dom'

import { useDatabase } from '~/providers/DatabaseProvider'
import { tagColor } from '~/utils/tag-colors'
import { MainViewRoute, Paste } from '~/views/MainView'

export const EditingViewRoute = {
    path: '/edit/:id',
    element: <EditingView />,
}

export function EditingView() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const [pasteInputValue, setPasteInputValue] = useState<string>('')
    const [tagsInputValue, setTagsInputValue] = useState<string[]>([])
    const [tagSearchValue, setTagSearchValue] = useState('')
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
    const tagsRef = React.useRef<HTMLInputElement>(null)
    const theme = useMantineTheme()
    const db = useDatabase()

    useEffect(() => {
        async function loadPasteAndTags() {
            if (!id) return

            const pasteRow = await db.select<Paste[]>('SELECT * FROM paste WHERE id = $1;', [id])

            if (pasteRow && pasteRow.length > 0) {
                const paste = pasteRow[0]
                setPasteInputValue(paste.value)

                const tagRows = await db.select<{ name: string }[]>(
                    'SELECT t.name FROM tag t JOIN paste_tag pt ON t.id = pt.tag_id WHERE pt.paste_id = $1 ORDER BY pt.seq_id;',
                    [id],
                )
                setTagsInputValue(tagRows.map(r => r.name))
            }

            const allTagRows = await db.select<{ name: string }[]>(
                'SELECT name FROM tag ORDER BY name ASC;',
            )
            setTagSuggestions(allTagRows.map(r => r.name))
        }
        loadPasteAndTags()
    }, [db, id])

    const updatePaste = useCallback(
        async (tags: string[]) => {
            if (!id) return

            await db.execute('UPDATE paste SET value = $1 WHERE id = $2;', [
                pasteInputValue.trim(),
                id,
            ])

            await db.execute('DELETE FROM paste_tag WHERE paste_id = $1;', [id])

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
                    [id, tag, seqId],
                )
            }

            notifications.show({
                title: 'Success',
                message: 'Paste updated successfully.',
                color: 'green',
            })
            navigate(MainViewRoute.path)
        },
        [db, navigate, pasteInputValue, id],
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

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return
        }

        const newTags = Array.from(tagsInputValue)
        const [reorderedItem] = newTags.splice(result.source.index, 1)
        newTags.splice(result.destination.index, 0, reorderedItem)

        setTagsInputValue(newTags)
    }

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
                            onClick={() => updatePaste(tagsInputValue)}
                            leftSection={<IconSparkles size={18} />}
                        >
                            Update
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
                                updatePaste([
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
                    <Text size="sm" c="dimmed">
                        Drag to reorder tags.
                    </Text>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="tags" direction="vertical">
                            {provided => (
                                <Stack
                                    gap="xs"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {tagsInputValue.map((tag, index) => (
                                        <Draggable key={tag} draggableId={tag} index={index}>
                                            {provided => (
                                                <Badge
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    size="lg"
                                                    variant="outline"
                                                    color={
                                                        index === 0
                                                            ? tagColor(tag)
                                                            : theme.colors.gray[4]
                                                    }
                                                >
                                                    {tag}
                                                </Badge>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </Stack>
                            )}
                        </Droppable>
                    </DragDropContext>
                </Stack>
            </Container>
        </>
    )
}
