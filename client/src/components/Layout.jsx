import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import LogoWatermark from './LogoWatermark';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Navbar toggleSidebar={toggleSidebar} />

            <div className="flex flex-grow relative">
                {/* Sidebar: Fixed/Absolute on mobile (overlay), Sticky on desktop */}
                <div className={`
                    absolute md:sticky md:top-14 z-20 
                    h-full md:h-[calc(100vh-3.5rem)]
                    transition-smooth overflow-hidden
                    ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0'}
                    md:translate-x-0
                    ${isSidebarOpen ? 'md:w-64' : 'md:w-0'}
                    border-r border-gray-100 bg-white
                `}>
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <Sidebar isOpen={true} />
                    </div>
                </div>

                {/* Overlay for mobile when sidebar is open */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-10 md:hidden transition-opacity"
                        onClick={toggleSidebar}
                        style={{ top: '3.5rem' }} // Below navbar
                    ></div>
                )}

                <main className={`flex-grow bg-gray-50 transition-smooth w-full relative flex flex-col overflow-hidden`}>
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
