import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { ExportDialog } from '../ui/ExportDialog';
// import { IconZip } from '../ui/Icons'; // No longer directly import IconZip component
import { SettingProvider, useSettingContext } from '../ui/SettingContext';

const ScrollButtonsInner = () => {
    const [showScrollToTop, setShowScrollToTop] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const primaryScrollContainerRef = useRef<HTMLElement | Window>(window);

    // Helper: find all scrollable containers on the page, always include the root scrollingElement
    const [exportOpen, setExportOpen] = useState(false);
    const { format } = useSettingContext();
    const { t } = useTranslation();

    const getScrollableContainers = (): (HTMLElement | Window)[] => {
        const containers = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el =>
            el.scrollHeight > el.clientHeight &&
            window.getComputedStyle(el).overflowY.match(/(auto|scroll)/)
        );
        if (document.scrollingElement) {
            containers.push(document.scrollingElement as HTMLElement);
        }
        // Ensure window is considered if no other scrollable elements are found or if body itself is scrollable
        if (document.body.scrollHeight > window.innerHeight || document.documentElement.scrollHeight > window.innerHeight) {
             if (!containers.some(c => c === window || c === document.scrollingElement)) {
                containers.push(window);
            }
        }
        return containers.length > 0 ? containers : [window];
    };

    // Find primary scroll container (the one with largest scroll area or window/document)
    const getPrimaryContainer = (): HTMLElement | Window => {
        const containers = getScrollableContainers();
        if (containers.length === 0) return window; // Default to window

        // Prioritize document.scrollingElement or window if they are significantly scrollable
        const windowScrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        const windowClientHeight = window.innerHeight;
        if (windowScrollHeight > windowClientHeight) {
            let foundWindowOrRoot = containers.find(c => c === window || c === document.scrollingElement);
            if (foundWindowOrRoot) return foundWindowOrRoot;
        }

        return containers.reduce((maxEl, el) => {
            const elScrollHeight = el === window ? (document.documentElement.scrollHeight || document.body.scrollHeight) : (el as HTMLElement).scrollHeight;
            const elClientHeight = el === window ? window.innerHeight : (el as HTMLElement).clientHeight;
            const maxElScrollHeight = maxEl === window ? (document.documentElement.scrollHeight || document.body.scrollHeight) : (maxEl as HTMLElement).scrollHeight;
            const maxElClientHeight = maxEl === window ? window.innerHeight : (maxEl as HTMLElement).clientHeight;

            const diffEl = elScrollHeight - elClientHeight;
            const diffMax = maxElScrollHeight - maxElClientHeight;
            return diffEl > diffMax ? el : maxEl;
        }, containers[0] || window);
    };

    const positionContainer = () => {
        if (!containerRef.current) return;

        let leftPos = '10px'; // Default left position
        const host = window.location.host;
        let sidebar: HTMLElement | null = null;

        if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
            sidebar = document.querySelector('.sidebar') || document.querySelector('[data-testid="sidebar"]') || document.querySelector('nav');
        } else if (host.includes('reddit.com')) {
            sidebar = document.querySelector('[role="complementary"]');
        }

        if (sidebar) {
            const rect = sidebar.getBoundingClientRect();
            leftPos = `${rect.right + 8}px`;
        }
        containerRef.current.style.left = leftPos;
    };

    const makeButton = (svgOrElement: string | preact.JSX.Element, onClick: () => void, title: string): preact.JSX.Element => {
        const btnStyle: preact.JSX.CSSProperties = {
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.6)',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.2s',
            pointerEvents: 'auto', // Make button clickable
        };
        return (
            <div
                style={btnStyle}
                onClick={onClick}
                onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)')}
                onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)')}
                title={title}
            >
                {typeof svgOrElement === 'string' ? <div dangerouslySetInnerHTML={{ __html: svgOrElement }} /> : svgOrElement}
            </div>
        );
    };

    const upSvg = `
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
            <circle cx="100" cy="100" r="100" fill="none" stroke="white"/>
            <line x1="100" y1="150" x2="100" y2="50" stroke="black" stroke-width="10"/>
            <line x1="100" y1="50"  x2="64.645" y2="85.355" stroke="black" stroke-width="10"/>
            <line x1="100" y1="50"  x2="135.355" y2="85.355" stroke="black" stroke-width="10"/>
        </svg>
    `;
    const downSvg = `
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
            <circle cx="100" cy="100" r="100" fill="none" stroke="white"/>
            <line x1="100" y1="50"  x2="100" y2="150" stroke="black" stroke-width="10"/>
            <line x1="100" y1="150" x2="64.645" y2="114.645" stroke="black" stroke-width="10"/>
            <line x1="100" y1="150" x2="135.355" y2="114.645" stroke="black" stroke-width="10"/>
        </svg>
    `;

    // SVG content for IconZip, modified for 30x30 size
    const exportSvg = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="30" height="30" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M6 20.735a2 2 0 0 1 -1 -1.735v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1"></path>
            <path d="M11 17a2 2 0 0 1 2 2v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-2a2 2 0 0 1 2 -2z"></path>
            <path d="M11 5l-1 0"></path><path d="M13 7l-1 0"></path><path d="M11 9l-1 0"></path><path d="M13 11l-1 0"></path><path d="M11 13l-1 0"></path><path d="M13 15l-1 0"></path>
        </svg>
    `;

    const scrollToTop = () => {
        const primary = primaryScrollContainerRef.current;
        if (primary === window || primary === document.scrollingElement) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            (primary as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToBottom = () => {
        const primary = primaryScrollContainerRef.current;
        if (primary === window || primary === document.scrollingElement) {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        } else {
            (primary as HTMLElement).scrollTo({ top: (primary as HTMLElement).scrollHeight, behavior: 'smooth' });
        }
    };

    const updateVisibility = () => {
        const primary = primaryScrollContainerRef.current;
        let scrollTop, scrollHeight, clientHeight;

        if (primary === window) {
            scrollTop = window.scrollY || document.documentElement.scrollTop;
            scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            clientHeight = window.innerHeight;
        } else if (primary === document.scrollingElement) {
            scrollTop = document.documentElement.scrollTop;
            scrollHeight = document.documentElement.scrollHeight;
            clientHeight = document.documentElement.clientHeight;
        }
         else {
            scrollTop = (primary as HTMLElement).scrollTop;
            scrollHeight = (primary as HTMLElement).scrollHeight;
            clientHeight = (primary as HTMLElement).clientHeight;
        }

        setShowScrollToTop(scrollTop > 5);
        setShowScrollToBottom(scrollTop + clientHeight < scrollHeight - 5);
    };


    useEffect(() => {
        primaryScrollContainerRef.current = getPrimaryContainer();
        positionContainer();
        updateVisibility();

        let currentPrimary = primaryScrollContainerRef.current;
        const handleScroll = () => updateVisibility();
        const handleResize = () => {
            const newPrimaryContainer = getPrimaryContainer();
            if (newPrimaryContainer !== primaryScrollContainerRef.current) {
                const oldTarget = (primaryScrollContainerRef.current !== window && primaryScrollContainerRef.current !== document.scrollingElement) ? primaryScrollContainerRef.current as HTMLElement : window;
                (oldTarget as any).removeEventListener('scroll', handleScroll);

                primaryScrollContainerRef.current = newPrimaryContainer;
                currentPrimary = newPrimaryContainer;
                const newTarget = (currentPrimary !== window && currentPrimary !== document.scrollingElement) ? currentPrimary as HTMLElement : window;
                (newTarget as any).addEventListener('scroll', handleScroll);
            }
            positionContainer();
            updateVisibility();
        };

        let targetElement = (currentPrimary !== window && currentPrimary !== document.scrollingElement) ? currentPrimary as HTMLElement : window;
        (targetElement as any).addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);

        const observer = new MutationObserver(() => {
            const newPrimaryOnMutation = getPrimaryContainer();
            if (newPrimaryOnMutation !== primaryScrollContainerRef.current) {
                (targetElement as any).removeEventListener('scroll', handleScroll);
                primaryScrollContainerRef.current = newPrimaryOnMutation;
                currentPrimary = newPrimaryOnMutation;
                targetElement = (currentPrimary !== window && currentPrimary !== document.scrollingElement) ? currentPrimary as HTMLElement : window;
                (targetElement as any).addEventListener('scroll', handleScroll);
            }
            if (containerRef.current && !document.documentElement.contains(containerRef.current)) {
                 document.documentElement.appendChild(containerRef.current);
            }
            positionContainer();
            updateVisibility();
        });

        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

        return () => {
            (targetElement as any).removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, []);

    const scrollTopBtn = showScrollToTop ? makeButton(upSvg, scrollToTop, "Scroll to Top") : null;
    const scrollBotBtn = showScrollToBottom ? makeButton(downSvg, scrollToBottom, "Scroll to Bottom") : null;

    const handleExportClick = () => setExportOpen(true);
    const exportAllBtn = makeButton(exportSvg, handleExportClick, t('Export All'));

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: '10000',
                pointerEvents: 'none', // Allow clicks through transparent areas
            }}
        >
            {scrollTopBtn}
            {scrollBotBtn}
            {exportAllBtn}
            <ExportDialog
                format={format}
                open={exportOpen}
                onOpenChange={setExportOpen}
            />
        </div>
    );
};

const ScrollButtons = () => (
    <SettingProvider>
        <ScrollButtonsInner />
    </SettingProvider>
);

export default ScrollButtons;
