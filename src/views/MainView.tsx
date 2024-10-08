import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Code,
    Container,
    CopyButton,
    Flex,
    Group,
    Paper,
    ScrollArea,
    Stack,
    TextInput,
    useMantineTheme,
} from '@mantine/core'
import { getHotkeyHandler, useDebouncedState, useHotkeys } from '@mantine/hooks'
import {
    IconCheck,
    IconCirclePlus,
    IconCopy,
    IconPencil,
    IconSearch,
    IconX,
} from '@tabler/icons-react'
import { message } from '@tauri-apps/api/dialog'
import { listen } from '@tauri-apps/api/event'
import { checkUpdate } from '@tauri-apps/api/updater'
import camelcaseKeys from 'camelcase-keys'
import React, { useCallback, useEffect, useState } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'

import { DeletePasteButton } from '~/components/delete-paste-button'
import { useDatabase } from '~/providers/DatabaseProvider'
import { tagColor } from '~/utils/tag-colors'
import { CreatingViewRoute } from '~/views/CreatingView'
import { EditingViewRoute } from '~/views/EditingView'

export const MainViewRoute = {
    path: '/',
    element: <MainView />,
}

export type Paste = {
    id: number
    value: string
    createdAt: string
    lastUsedAt: string
}

export type PasteWithTags = Paste & {
    tags: string[]
}

export function MainView() {
    const navigate = useNavigate()
    const db = useDatabase()
    const [pastes, setPastes] = useState<PasteWithTags[]>([])
    const searchRef = React.useRef<HTMLInputElement>(null)
    const [searchValue, setSearchValue] = useDebouncedState('', 200, { leading: true })
    const theme = useMantineTheme()

    useHotkeys([['mod+f', () => searchRef.current?.select()]])

    useEffect(() => {
        const checkForUpdatesListener = listen('check_for_updates', async () => {
            async function check() {
                return await checkUpdate()
            }

            const update = await check()
            if (!update.shouldUpdate) {
                await message("You're already up to date!", 'Up to Date')
            }
        })

        const unlistenOpened = listen('window-opened', () => {
            searchRef.current?.select()
        })

        const unlistenClosed = listen('window-closed', () => {})

        searchRef.current?.select()

        return () => {
            unlistenOpened.then(f => f())
            unlistenClosed.then(f => f())
            checkForUpdatesListener.then(f => f())
        }
    }, [])

    const loadPastes = useCallback(async () => {
        const trimmedSearchValue = searchValue.trim()
        const rows = camelcaseKeys(
            await db.select<(Paste & { tags: string })[]>(
                `
                with matching_pastes as (
                    select distinct paste.id as id
                    from paste
                    left join paste_tag on paste.id = paste_tag.paste_id
                    left join tag on paste_tag.tag_id = tag.id
                    where paste.value like '%' || $1 || '%'
                        or tag.name like '%' || $1 || '%'
                        or paste.value like '%' || $1 || '%'
                )
                select paste.id, paste.value, paste.created_at, paste.last_used_at, coalesce(group_concat(t.name ORDER BY paste_tag.seq_id asc), '') as tags
                from matching_pastes mp
                join paste on mp.id = paste.id
                left join paste_tag on paste.id = paste_tag.paste_id
                left join tag t on paste_tag.tag_id = t.id
                group by paste.id
                order by paste.last_used_at desc;
            `,
                [trimmedSearchValue],
            ),
            { deep: true },
        )
        const pastes = rows.map<PasteWithTags>(row => ({
            id: row.id,
            value: row.value,
            createdAt: row.createdAt,
            lastUsedAt: row.lastUsedAt,
            tags: row.tags.split(',').filter(t => t),
        }))
        setPastes(pastes)
    }, [searchValue, db])

    useEffect(() => {
        loadPastes()
    }, [loadPastes])

    return (
        <>
            <Box
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                }}
                onKeyDown={getHotkeyHandler([
                    [
                        'mod+n',
                        () => {
                            navigate(CreatingViewRoute.path)
                        },
                    ],
                ])}
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
                    <Group>
                        <TextInput
                            ref={searchRef}
                            placeholder="CMD + F"
                            variant="filled"
                            flex="1 0 0"
                            onChange={e => setSearchValue(e.target.value)}
                            leftSection={<IconSearch size={18} />}
                            leftSectionPointerEvents="none"
                            rightSection={
                                searchValue ? (
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        onClick={() => {
                                            if (searchRef.current) {
                                                searchRef.current.value = ''
                                                setSearchValue('')
                                            }
                                        }}
                                    >
                                        <IconX size={16} />
                                    </ActionIcon>
                                ) : null
                            }
                            onKeyDown={getHotkeyHandler([
                                [
                                    'escape',
                                    () => {
                                        searchRef.current?.select()
                                    },
                                ],
                            ])}
                        />
                        <Button
                            color="violet"
                            onClick={() => navigate(CreatingViewRoute.path)}
                            px="xs"
                            variant="filled"
                        >
                            <IconCirclePlus size={20} />
                        </Button>
                    </Group>
                </Paper>
            </Box>
            <Container fluid p="md">
                <Stack>
                    {pastes.map(paste => (
                        <Paper
                            key={paste.id}
                            shadow="false"
                            withBorder
                            p="xs"
                            bg={theme.colors.dark[7]}
                            style={{
                                borderColor:
                                    paste.tags.length > 0
                                        ? tagColor(paste.tags[0])
                                        : theme.colors.dark[4],
                            }}
                        >
                            <Flex gap="xs" align="center" wrap="nowrap">
                                <CopyButton value={paste.value} timeout={2000}>
                                    {({ copied, copy }) => (
                                        <ActionIcon
                                            color={copied ? 'teal' : 'gray'}
                                            variant="subtle"
                                            size="lg"
                                            onClick={() => {
                                                copy()
                                                db.execute(
                                                    `update paste set last_used_at = CURRENT_TIMESTAMP where id = ?`,
                                                    [paste.id],
                                                )
                                            }}
                                        >
                                            {copied ? (
                                                <IconCheck size={18} />
                                            ) : (
                                                <IconCopy size={18} />
                                            )}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                                <ScrollArea type="never" flex="1">
                                    <Flex
                                        gap="xs"
                                        style={{
                                            flexWrap: 'nowrap',
                                        }}
                                        pr={1}
                                    >
                                        {paste.tags.map((t, i) => (
                                            <Badge
                                                className="selectable"
                                                key={`${paste.id}-${t}`}
                                                variant="outline"
                                                color={i === 0 ? tagColor(t) : theme.colors.gray[4]}
                                                size="md"
                                                flex="0 0 auto"
                                            >
                                                {t}
                                            </Badge>
                                        ))}
                                    </Flex>
                                </ScrollArea>
                                {/* <HoverCard
                                    width={310}
                                    shadow="md"
                                    position="bottom"
                                    openDelay={500}
                                >
                                    <HoverCard.Target>
                                        <IconInfoCircle size={18} />
                                    </HoverCard.Target>
                                    <HoverCard.Dropdown>
                                        <Grid gutter={8}>
                                            <Grid.Col span={4}>
                                                <Text fw="bold" ta="right">
                                                    Created:
                                                </Text>
                                            </Grid.Col>
                                            <Grid.Col span={8}>
                                                <Text>
                                                    {format(paste.createdAt, 'yyyy-MM-dd H:mmaaa')}
                                                </Text>
                                            </Grid.Col>
                                            <Grid.Col span={4}>
                                                <Text fw="bold" ta="right">
                                                    Last Used:
                                                </Text>
                                            </Grid.Col>
                                            <Grid.Col span={8}>
                                                <Text>
                                                    {format(paste.lastUsedAt, 'yyyy-MM-dd H:mmaaa')}
                                                </Text>
                                            </Grid.Col>
                                        </Grid>
                                    </HoverCard.Dropdown>
                                </HoverCard> */}
                                <Group gap={0}>
                                    <ActionIcon
                                        color="gray"
                                        variant="subtle"
                                        size="lg"
                                        onClick={() => {
                                            navigate(
                                                generatePath(EditingViewRoute.path, {
                                                    id: paste.id,
                                                }),
                                            )
                                        }}
                                        style={{ marinRight: 0 }}
                                    >
                                        <IconPencil size={18} />
                                    </ActionIcon>
                                    <DeletePasteButton paste={paste} afterDelete={loadPastes} />
                                </Group>
                            </Flex>
                            <Code
                                block
                                mt={8}
                                mah={200}
                                className="scrollable-element"
                                tabIndex={0}
                            >
                                {paste.value}
                            </Code>
                        </Paper>
                    ))}
                </Stack>
            </Container>
        </>
    )
}
