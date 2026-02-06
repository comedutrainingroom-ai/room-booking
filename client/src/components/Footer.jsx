const Footer = () => {
    return (
        <footer className="w-full text-gray-300 py-4 text-center mt-auto">
            <div className="container mx-auto px-6 text-xs">
                <p>&copy; {new Date().getFullYear()} ระบบจองห้องประชุมออนไลน์ <span className="hidden md:inline">| All rights reserved.</span></p>
            </div>
        </footer>
    );
};

export default Footer;
