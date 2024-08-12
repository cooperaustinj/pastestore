import { MantineProvider } from '@mantine/core'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from '~/App'
import { DatabaseProvider } from '~/providers/DatabaseProvider'
import { theme } from '~/theme'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <DatabaseProvider>
                <App />
            </DatabaseProvider>
        </MantineProvider>
    </React.StrictMode>,
)
