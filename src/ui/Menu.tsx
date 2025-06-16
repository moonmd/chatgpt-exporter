import * as Dialog from '@radix-ui/react-dialog';
import * as HoverCard from '@radix-ui/react-hover-card';
import { useCallback, useEffect, useMemo, useState, useRef } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { exportToHtml } from '../exporter/html';
import { exportToPng } from '../exporter/image';
import { exportToJson, exportToOoba, exportToTavern } from '../exporter/json';
import { exportToMarkdown } from '../exporter/markdown';
import { exportToText } from '../exporter/text';
import { getHistoryDisabled } from '../page';
import { ExportDialog } from './ExportDialog';
import { FileCode, IconArrowRightFromBracket, IconCamera, IconCopy, IconJSON, IconMarkdown, IconSetting, IconZip } from './Icons';
import { MenuItem } from './MenuItem';
import { SettingProvider, useSettingContext } from './SettingContext';
import { SettingDialog } from './SettingDialog';

import '../style.css';
import './Dialog.css';

// Scroll button SVGs
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

function MenuInner() {
    const { t } = useTranslation();
    const disabled = getHistoryDisabled();

    const [open, setOpen] = useState(false); // For HoverCard
    const [jsonOpen, setJsonOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false); // For ExportDialog inside HoverCard
    const [settingOpen, setSettingOpen] = useState(false);

    const { format, enableTimestamp, timeStamp24H, enableMeta, exportMetaList } = useSettingContext();

    // Scroll buttons state and refs
    const [showScrollToTop, setShowScrollToTop] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(true);
    const floatingContainerRef = useRef<HTMLDivElement>(null);
    const primaryScrollContainerRef = useRef<HTMLElement | Window>(window);

    useEffect(() => {
        if (enableTimestamp) {
            document.body.setAttribute('data-time-format', timeStamp24H ? '24' : '12');
        } else {
            document.body.removeAttribute('data-time-format');
        }
    }, [enableTimestamp, timeStamp24H]);

    const metaList = useMemo(() => enableMeta ? exportMetaList : [], [enableMeta, exportMetaList]);

    const onClickText = useCallback(() => exportToText(), []);
    const onClickPng = useCallback(() => exportToPng(format), [format]);
    const onClickMarkdown = useCallback(() => exportToMarkdown(format, metaList), [format, metaList]);
    const onClickHtml = useCallback(() => exportToHtml(format, metaList), [format, metaList]);
    const onClickJSON = useCallback(() => { setJsonOpen(true); return true; }, []);
    const onClickOfficialJSON = useCallback(() => exportToJson(format), [format]);
    const onClickTavern = useCallback(() => exportToTavern(format), [format]);
    const onClickOoba = useCallback(() => exportToOoba(format), [format]);

    const getScrollableContainers = (): (HTMLElement | Window)[] => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el =>
            el.scrollHeight > el.clientHeight &&
            window.getComputedStyle(el).overflowY.match(/(auto|scroll)/)
        );
        if (document.scrollingElement) { elements.push(document.scrollingElement as HTMLElement); }
        if (document.body.scrollHeight > window.innerHeight || document.documentElement.scrollHeight > window.innerHeight) {
            if (!elements.some(c => c === window || c === document.scrollingElement)) {
                elements.push(window);
            }
        }
        return elements.length > 0 ? elements : [window];
    };

    const getPrimaryContainer = (): HTMLElement | Window => {
        const containers = getScrollableContainers();
        if (containers.length === 0) return window;
        const windowScrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        if (windowScrollHeight > window.innerHeight) {
            let foundWindowOrRoot = containers.find(c => c === window || c === document.scrollingElement);
            if (foundWindowOrRoot) return foundWindowOrRoot;
        }
        return containers.reduce((maxEl, el) => {
            const elScroll = el === window ? (document.documentElement.scrollHeight || document.body.scrollHeight) : (el as HTMLElement).scrollHeight;
            const elClient = el === window ? window.innerHeight : (el as HTMLElement).clientHeight;
            const maxElScroll = maxEl === window ? (document.documentElement.scrollHeight || document.body.scrollHeight) : (maxEl as HTMLElement).scrollHeight;
            const maxElClient = maxEl === window ? window.innerHeight : (maxEl as HTMLElement).clientHeight;
            return (elScroll - elClient) > (maxElScroll - maxElClient) ? el : maxEl;
        }, containers[0] || window);
    };

    const positionContainer = () => {
        if (!floatingContainerRef.current) return;
        let leftPos = '10px';
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
        floatingContainerRef.current.style.left = leftPos;
    };

    const makeButton = (svgOrElement: string | preact.JSX.Element, onClick: (e?: MouseEvent) => void | boolean, title: string, key?: string): preact.JSX.Element => {
        const btnStyle: preact.JSX.CSSProperties = {
            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '50%', cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'box-shadow 0.2s', pointerEvents: 'auto',
        };
        return (
            <div key={key} style={btnStyle} onClick={onClick}
                 onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)')}
                 onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)')}
                 title={title}>
                {typeof svgOrElement === 'string' ? <div dangerouslySetInnerHTML={{ __html: svgOrElement }} /> : svgOrElement}
            </div>
        );
    };

    const scrollToTop = () => {
        const primary = primaryScrollContainerRef.current;
        if (primary === window || primary === document.scrollingElement) { window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else { (primary as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' }); }
    };

    const scrollToBottom = () => {
        const primary = primaryScrollContainerRef.current;
        if (primary === window || primary === document.scrollingElement) { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }
        else { (primary as HTMLElement).scrollTo({ top: (primary as HTMLElement).scrollHeight, behavior: 'smooth' }); }
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
        } else {
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
            if (floatingContainerRef.current && !document.documentElement.contains(floatingContainerRef.current)) {
                 document.documentElement.appendChild(floatingContainerRef.current);
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

    if (disabled) {
        // Optionally, render nothing or a disabled placeholder if chat history is off
        // For now, returning null means the button cluster won't appear.
        return null;
    }

    const scrollTopBtn = showScrollToTop ? makeButton(upSvg, scrollToTop, t('Scroll to Top'), 'scroll-top-btn') : null;
    const scrollBotBtn = showScrollToBottom ? makeButton(downSvg, scrollToBottom, t('Scroll to Bottom'), 'scroll-bot-btn') : null;

    return (
        <div
            ref={floatingContainerRef}
            style={{
                position: 'fixed',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px', // For ':-' layout, adjust as needed
                zIndex: '10000',
                pointerEvents: 'none',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
                {scrollTopBtn}
                {scrollBotBtn}
            </div>
            <HoverCard.Root openDelay={0} closeDelay={300} open={open} onOpenChange={setOpen}>
                <HoverCard.Trigger asChild>
                    {makeButton(<IconArrowRightFromBracket />, (e) => { e?.stopPropagation(); setOpen(o => !o); }, t('ExportHelper'), 'export-menu-trigger-btn')}
                </HoverCard.Trigger>
                <HoverCard.Portal container={document.body}>
                    <HoverCard.Content
                        className="grid grid-cols-2 bg-menu border border-menu shadow-md gap-x-1 px-1.5 py-2 pb-0 rounded-md animate-fadeIn"
                        style={{ width: 268 }}
                        sideOffset={10}
                        align="start"
                        // side='right' // This will be changed in next step
                        side='left' // Tentatively set to left, assuming trigger is now on the right
                    >
                        <div className="row-full"><MenuItem text={t('Setting')} icon={IconSetting} onClick={() => setSettingOpen(true)} /></div>
                        <MenuItem text={t('Copy Text')} successText={t('Copied!')} icon={IconCopy} className="row-full" onClick={onClickText} />
                        <MenuItem text={t('Screenshot')} icon={IconCamera} className="row-half" onClick={onClickPng} />
                        <MenuItem text={t('Markdown')} icon={IconMarkdown} className="row-half" onClick={onClickMarkdown} />
                        <MenuItem text={t('HTML')} icon={FileCode} className="row-half" onClick={onClickHtml} />
                        <Dialog.Root open={jsonOpen} onOpenChange={setJsonOpen}>
                            <Dialog.Trigger asChild>
                                <MenuItem text={t('JSON')} icon={IconJSON} className="row-half" onClick={() => { setJsonOpen(true); return true;}} />
                            </Dialog.Trigger>
                            <Dialog.Portal>
                                <Dialog.Overlay className="DialogOverlay" />
                                <Dialog.Content className="DialogContent" style={{ width: '320px' }}>
                                    <Dialog.Title className="DialogTitle">{t('JSON')}</Dialog.Title>
                                    {/* For JSON options, ensure they also close the JSON dialog */}
                                    <MenuItem text={t('OpenAI Official Format')} icon={IconCopy} className="row-full" onClick={() => { onClickOfficialJSON(); setJsonOpen(false); }} />
                                    <MenuItem text="JSONL (TavernAI, SillyTavern)" icon={IconCopy} className="row-full" onClick={() => { onClickTavern(); setJsonOpen(false); }} />
                                    <MenuItem text="Ooba (text-generation-webui)" icon={IconCopy} className="row-full" onClick={() => { onClickOoba(); setJsonOpen(false); }} />
                                </Dialog.Content>
                            </Dialog.Portal>
                        </Dialog.Root>
                        <div className="row-full"><MenuItem text={t('Export All')} icon={IconZip} onClick={() => setExportOpen(true)} /></div>
                        <HoverCard.Arrow width="16" height="8" style={{ fill: 'var(--ce-menu-primary)', stroke: 'var(--ce-border-light)', strokeWidth: '1px' }} />
                    </HoverCard.Content>
                </HoverCard.Portal>
            </HoverCard.Root>
        </div>
    );
}

export function Menu() {
    return (
        <SettingProvider>
            <MenuInner />
        </SettingProvider>
    );
}
