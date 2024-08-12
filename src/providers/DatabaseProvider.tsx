import { Alert, Center, Loader } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import Database from 'tauri-plugin-sql-api'

const DatabaseContext = createContext<Database | undefined>(undefined)

export function useDatabase(): Database {
    const context = useContext(DatabaseContext)

    if (context === undefined) {
        throw new Error('useDatabase must be used within a DatabaseProvider')
    }

    return context
}

interface DatabaseProviderProps {
    children: ReactNode
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
    const [db, setDb] = useState<Database | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function initDb() {
            try {
                const loadedDb = await Database.load('sqlite:pastestore.db')
                setDb(loadedDb)
            } catch (error) {
                console.error('Failed to load database:', error)
            } finally {
                setIsLoading(false)
            }
        }

        initDb()
    }, [])

    if (isLoading) {
        return (
            <Center h="100vh">
                <Loader type="dots" />
            </Center>
        )
    }

    if (!db) {
        return (
            <Alert variant="light" color="red" title="Error" icon={<IconAlertTriangle />} m="sm">
                Failed to load database
            </Alert>
        )
    }

    return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
}
