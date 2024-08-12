import { listen } from '@tauri-apps/api/event'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { CreatingViewRoute } from '~/views/CreatingView'

export const usePasteController = () => {
    const navigate = useNavigate()
    const inputRef = React.useRef<HTMLInputElement>(null)

    useEffect(() => {
        const unlistenOpened = listen('window-opened', event => {
            if (inputRef.current) {
                inputRef.current.select()
            }
        })

        const unlistenClosed = listen('window-closed', event => {
            // setValue('')
        })

        return () => {
            unlistenOpened.then(f => f())
            unlistenClosed.then(f => f())
        }
    }, [])

    useEffect(() => {
        const handlePaste = async (event: ClipboardEvent) => {
            event.preventDefault()
            function getNewValue() {
                return new Promise<string>(resolve => {
                    if (!event.clipboardData) return resolve('')

                    const items = event.clipboardData.items
                    for (const item of items) {
                        if (item.type.indexOf('image') !== -1) {
                            event.preventDefault()
                            const blob = item.getAsFile()
                            if (blob) {
                                const reader = new FileReader()
                                reader.onload = e => {
                                    const result = e.target?.result as string
                                    return resolve(result)
                                }
                                reader.readAsDataURL(blob)
                            }
                        } else if (item.type.startsWith('text/')) {
                            return resolve(event.clipboardData.getData('text/plain'))
                        }
                    }
                    return resolve('')
                })
            }
            const pastedValue = await getNewValue()
            navigate(CreatingViewRoute.path, { state: { pastedValue: pastedValue.trim() } })
        }

        // Add event listener to the body element
        document.body.addEventListener('paste', handlePaste)

        // Cleanup event listener when component unmounts
        return () => {
            document.body.removeEventListener('paste', handlePaste)
        }
    }, [navigate])
}
