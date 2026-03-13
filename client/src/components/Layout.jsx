import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import LogoWatermark from './LogoWatermark';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        // Default closed on mobile, open on desktop
        return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    });
    const location = useLocation();

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    // Auto-close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    // Listen for window resize to auto-close sidebar when going mobile
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const handleChange = (e) => {
            if (!e.matches) {
                setIsSidebarOpen(false);
            }
        };
        mq.addEventListener('change', handleChange);
        return () => mq.removeEventListener('change', handleChange);
    }, []);

    // Global listener: Auto-close sidebar when ANY modal is opened
    // and reopen it when modal is closed (on desktop)
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            let shouldCloseSidebar = false;
            let shouldOpenSidebar = false;

            for (let m of mutations) {
                // Detect modals being opened
                if (m.addedNodes.length) {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && typeof node.className === 'string') {
                            const cn = node.className;
                            // Check for standard modal overlay classes
                            if (cn.includes('fixed') && cn.includes('inset-0') && 
                                (cn.includes('z-50') || cn.includes('z-[100]') || cn.includes('z-[110]') || cn.includes('z-[120]'))) {
                                shouldCloseSidebar = true;
                            }
                            
                            // Also check inside the added node
                            if (node.querySelectorAll) {
                                const modals = node.querySelectorAll('[class*="fixed"][class*="inset-0"][class*="z-"]');
                                modals.forEach(modal => {
                                    const mcn = modal.className;
                                    if (typeof mcn === 'string' && 
                                        !mcn.includes('z-20') && // Ignore sidebar backdrop
                                        !mcn.includes('-z-10') && // Ignore shapes
                                        !mcn.includes('pointer-events-none') // Ignore watermark
                                    ) {
                                        shouldCloseSidebar = true;
                                    }
                                });
                            }
                        }
                    });
                }

                // Detect modals being closed
                if (m.removedNodes.length) {
                    m.removedNodes.forEach(node => {
                        if (node.nodeType === 1 && typeof node.className === 'string') {
                            const cn = node.className;
                            if (cn.includes('fixed') && cn.includes('inset-0') && 
                                (cn.includes('z-50') || cn.includes('z-[100]') || cn.includes('z-[110]') || cn.includes('z-[120]'))) {
                                shouldOpenSidebar = true;
                            }
                            
                            // Also check inside the removed node
                            if (node.querySelectorAll) {
                                const modals = node.querySelectorAll('[class*="fixed"][class*="inset-0"][class*="z-"]');
                                modals.forEach(modal => {
                                    const mcn = modal.className;
                                    if (typeof mcn === 'string' && 
                                        !mcn.includes('z-20') && 
                                        !mcn.includes('-z-10') && 
                                        !mcn.includes('pointer-events-none')
                                    ) {
                                        shouldOpenSidebar = true;
                                    }
                                });
                            }
                        }
                    });
                }
            }

            if (shouldCloseSidebar) {
                setIsSidebarOpen(false);
            } else if (shouldOpenSidebar) {
                // Check if any other modals are still open
                const activeModals = document.querySelectorAll('div.fixed.inset-0.z-50, div.fixed.inset-0.z-\\[100\\], div.fixed.inset-0.z-\\[110\\], div.fixed.inset-0.z-\\[120\\]');
                let hasRealModal = false;
                
                activeModals.forEach(modal => {
                    const mcn = modal.className;
                    if (typeof mcn === 'string' && 
                        !mcn.includes('z-20') && 
                        !mcn.includes('-z-10') && 
                        !mcn.includes('pointer-events-none')) {
                        hasRealModal = true;
                    }
                });

                // Note: Only auto-reopen on desktop. On mobile, the sidebar covers the screen so we leave it closed.
                if (!hasRealModal && window.innerWidth >= 768) {
                    setIsSidebarOpen(true);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Navbar toggleSidebar={toggleSidebar} />

            <div className="flex flex-grow relative">
                {/* Sidebar: Fixed on mobile (overlay), Sticky on desktop */}
                <div className={`
                    fixed md:sticky top-14 z-30 
                    h-[calc(100vh-3.5rem)]
                    transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                    overflow-hidden bg-white
                    ${isSidebarOpen 
                        ? 'translate-x-0 w-64 shadow-2xl md:shadow-none bg-white/95 backdrop-blur-md border-r border-gray-100/50 md:min-w-[16rem] opacity-100' 
                        : '-translate-x-full w-64 md:translate-x-0 md:w-0 md:min-w-0 border-none opacity-0'}
                `}>
                    <div className="h-full w-64 overflow-y-auto custom-scrollbar">
                        <Sidebar isOpen={isSidebarOpen} />
                    </div>
                </div>

                {/* Overlay for mobile when sidebar is open */}
                <div
                    className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-20 md:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={toggleSidebar}
                    style={{ top: '3.5rem' }} // Below navbar
                ></div>

                <main className={`flex-grow bg-gray-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] w-full relative flex flex-col overflow-hidden`}>
                    {/* Logo Watermark - conditional based on route */}
                    <LogoWatermark />

                    {/* Animated Background Orbs */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-green-300/50 to-cyan-300/40 rounded-full blur-3xl animate-float"></div>
                        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-tl from-emerald-300/45 to-teal-300/35 rounded-full blur-3xl animate-float-delay"></div>
                        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-r from-green-200/40 to-cyan-200/35 rounded-full blur-3xl animate-pulse-glow"></div>
                    </div>

                    <div className="w-full h-full p-4 md:p-6 flex flex-col relative z-0">
                        <div className="flex-grow">
                            {children}
                        </div>
                        <Footer />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
