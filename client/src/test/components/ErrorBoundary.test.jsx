import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Component that intentionally throws
const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
    // Suppress console.error for expected errors
    const originalConsoleError = console.error;
    beforeEach(() => {
        console.error = (...args) => {
            // Filter out React error boundary warnings
            if (typeof args[0] === 'string' && args[0].includes('ErrorBoundary')) return;
            if (typeof args[0] === 'string' && args[0].includes('Error: Uncaught')) return;
            originalConsoleError(...args);
        };
    });
    afterEach(() => {
        console.error = originalConsoleError;
    });

    it('should render children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Hello World</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('เกิดข้อผิดพลาด')).toBeInTheDocument();
        expect(screen.getByText('กลับหน้าหลัก')).toBeInTheDocument();
    });

    it('should have a working "go home" button', () => {
        // Mock window.location
        delete window.location;
        window.location = { href: '' };

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        const button = screen.getByText('กลับหน้าหลัก');
        fireEvent.click(button);

        expect(window.location.href).toBe('/');
    });
});
