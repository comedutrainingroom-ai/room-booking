import { useLocation } from 'react-router-dom';

const LogoWatermark = () => {
    const location = useLocation();

    // Pages to hide logo
    const hiddenPaths = ['/calendar', '/report-issue', '/rooms', '/dashboard'];

    // Check if current path should hide logo
    const shouldHide = hiddenPaths.some(path => location.pathname === path);

    if (shouldHide) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none flex items-center justify-center"
            style={{ zIndex: 0 }}
        >
            <img
                src="/logo.png"
                alt=""
                className="w-[900px] h-[900px] object-contain opacity-[0.07]"
            />
        </div>
    );
};

export default LogoWatermark;
