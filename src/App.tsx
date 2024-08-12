import '@mantine/core/styles.css'
import '~/styles/app.scss'

import { Box } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { RouterProvider } from 'react-router-dom'

import { router } from '~/router'

function App() {
    return (
        <>
            <Box
                id="top-box"
                h="calc(100vh - 2px)"
                style={{ overflowX: 'hidden', overflowY: 'auto' }}
                p={0}
            >
                <RouterProvider router={router} />
                <Notifications
                    style={{
                        position: 'fixed',
                        bottom: '1rem',
                        right: '1rem',
                    }}
                />
            </Box>
        </>
    )
}

export default App
