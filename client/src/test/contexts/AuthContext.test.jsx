import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock Firebase
vi.mock('../../services/firebase', () => ({
    auth: {
        currentUser: null,
    },
    googleProvider: {}
}));

vi.mock('firebase/auth', () => ({
    signInWithPopup: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    onAuthStateChanged: vi.fn((auth, callback) => {
        // Simulate no user logged in
        callback(null);
        return vi.fn(); // unsubscribe
    }),
}));

vi.mock('../../services/api', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        }
    }
}));

// Helper component to expose auth state
// Note: AuthContext uses {!loading && children} so children only render after loading=false
const AuthDisplay = () => {
    const { currentUser, dbUser, isAdmin } = useAuth();
    return (
        <div>
            <span data-testid="rendered">true</span>
            <span data-testid="user">{currentUser ? currentUser.email : 'null'}</span>
            <span data-testid="dbUser">{dbUser ? dbUser.email : 'null'}</span>
            <span data-testid="isAdmin">{isAdmin ? 'true' : 'false'}</span>
        </div>
    );
};

describe('AuthContext', () => {
    it('should render children after loading completes (no user)', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <AuthProvider>
                        <AuthDisplay />
                    </AuthProvider>
                </BrowserRouter>
            );
        });

        // Children render after loading=false (onAuthStateChanged fires with null)
        expect(screen.getByTestId('rendered').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('should have isAdmin false when not logged in', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <AuthProvider>
                        <AuthDisplay />
                    </AuthProvider>
                </BrowserRouter>
            );
        });

        expect(screen.getByTestId('isAdmin').textContent).toBe('false');
    });

    it('should throw error when useAuth is used outside AuthProvider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => {
            render(<AuthDisplay />);
        }).toThrow();

        spy.mockRestore();
    });
});
