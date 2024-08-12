import { ActionIcon } from '@mantine/core'
import { useTimeout } from '@mantine/hooks'
import { IconTrash } from '@tabler/icons-react'
import { useCallback, useState } from 'react'

import { useDatabase } from '~/providers/DatabaseProvider'
import { PasteWithTags } from '~/views/MainView'

export function DeletePasteButton({
    paste,
    afterDelete,
}: {
    paste: PasteWithTags
    afterDelete?: () => void
}) {
    const db = useDatabase()
    const [isConfirming, setIsConfirming] = useState(false)

    const resetConfirmation = useCallback(() => {
        setIsConfirming(false)
    }, [])

    const { start, clear } = useTimeout(resetConfirmation, 3000)

    const handleClick = () => {
        if (!isConfirming) {
            setIsConfirming(true)
            start()
        } else {
            clear()
            db.execute(
                `
                delete from paste where id = $1;
                delete from paste_tag where paste_id = $1;
                delete from tag where id not in (select tag_id from paste_tag);
            `,
                [paste.id],
            )
            setIsConfirming(false)
            if (afterDelete) afterDelete()
        }
    }

    return (
        <ActionIcon
            color={isConfirming ? 'red' : 'gray'}
            variant={isConfirming ? 'light' : 'subtle'}
            size="lg"
            onClick={handleClick}
        >
            <IconTrash size={18} />
        </ActionIcon>
    )
}
