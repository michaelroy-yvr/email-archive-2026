import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            const parsedUser = JSON.parse(savedUser);

            // If the saved user doesn't have isAdmin field, fetch fresh data from API
            if (parsedUser.isAdmin === undefined) {
                usersAPI.getCurrentUser()
                    .then(response => {
                        const freshUser = response.data.user;
                        localStorage.setItem('user', JSON.stringify(freshUser));
                        setUser(freshUser);
                        setLoading(false);
                    })
                    .catch(() => {
                        // If API call fails, clear invalid session
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                        setLoading(false);
                    });
            } else {
                setUser(parsedUser);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const response = await usersAPI.login({ email, password });
        const { user, token } = response.data;

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);

        return user;
    };

    const register = async (email, password, name) => {
        const response = await usersAPI.register({ email, password, name });
        const { user, token } = response.data;

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);

        return user;
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        usersAPI.logout().catch(() => {}); // Fire and forget
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
