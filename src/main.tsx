import { render } from 'preact'
import sentinel from 'sentinel-js'
import { fetchConversation, processConversation } from './api'
import { getChatIdFromUrl, isSharePage } from './page'
import { Menu } from './ui/Menu'
import ScrollButtons from './ui/ScrollButtons'
import { onloadSafe } from './utils/utils'

import './i18n'
import './styles/missing-tailwind.css'

main()

function getScrollButtonsContainer() {
    const container = document.createElement('div')
    // Style the container if needed, though ScrollButtons itself is fixed positioned
    render(<ScrollButtons />, container)
    return container
}

function main() {
    onloadSafe(() => {
        const styleEl = document.createElement('style')
        styleEl.id = 'sentinel-css'
        document.head.append(styleEl)

        const injectionMap = new Map<HTMLElement, HTMLElement>()

        // Render ScrollButtons
        document.body.appendChild(getScrollButtonsContainer())

        const injectNavMenu = (nav: HTMLElement) => {
            if (injectionMap.has(nav)) return

            const container = getMenuContainer()
            injectionMap.set(nav, container)

            const chatList = nav.querySelector(':scope > div.sticky.bottom-0')
            if (chatList) {
                chatList.prepend(container)
            }
            else {
                // fallback to the bottom of the nav
                container.style.backgroundColor = '#171717'
                container.style.position = 'sticky'
                container.style.bottom = '72px'
                nav.append(container)
            }
        }

        sentinel.on('nav', injectNavMenu)

        setInterval(() => {
            injectionMap.forEach((container, nav) => {
                if (!nav.isConnected) {
                    container.remove()
                    injectionMap.delete(nav)
                }
            })

            const navList = Array.from(document.querySelectorAll('nav')).filter(nav => !injectionMap.has(nav))
            navList.forEach(injectNavMenu)
        }, 300)

        // Support for share page
        if (isSharePage()) {
            sentinel.on(`div[role="presentation"] > .w-full > div >.flex.w-full`, (target) => {
                target.prepend(getMenuContainer())
            })
        }

        /** Insert timestamp to the bottom right of each message */
        let chatId = ''
        sentinel.on('[role="presentation"]', async () => {
            const currentChatId = getChatIdFromUrl()
            if (!currentChatId || currentChatId === chatId) return
            chatId = currentChatId

            const rawConversation = await fetchConversation(chatId, false)
            const { conversationNodes } = processConversation(rawConversation)

            const threadContents = Array.from(document.querySelectorAll('main [data-testid^="conversation-turn-"] [data-message-id]'))
            if (threadContents.length === 0) return

            threadContents.forEach((thread, index) => {
                const createTime = conversationNodes[index]?.message?.create_time
                if (!createTime) return

                const date = new Date(createTime * 1000)

                const timestamp = document.createElement('time')
                timestamp.className = 'w-full text-gray-500 dark:text-gray-400 text-sm text-right'
                timestamp.dateTime = date.toISOString()
                timestamp.title = date.toLocaleString()

                const hour12 = document.createElement('span')
                hour12.setAttribute('data-time-format', '12')
                hour12.textContent = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                const hour24 = document.createElement('span')
                hour24.setAttribute('data-time-format', '24')
                hour24.textContent = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                timestamp.append(hour12, hour24)
                thread.append(timestamp)
            })
        })
    })
}

function getMenuContainer() {
    const container = document.createElement('div')
    // to overlap on the list section
    container.style.zIndex = '99'
    render(<Menu container={container} />, container)
    return container
}
