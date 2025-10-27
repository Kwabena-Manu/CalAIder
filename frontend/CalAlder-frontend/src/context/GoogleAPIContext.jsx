import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';



const GoogleAPIContext = createContext();

const GoogleAPIContextProvider = ({ children }) => {

    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);

    const signIn = useCallback(async () => {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    reject(chrome.runtime.lastError);
                } else {
                    setToken(token);
                    resolve(token);
                }
            });
        });
    }, []);



    // Fetch user information

    const fetchUserInfo = useCallback(async (token) => {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setUser(data);
        console.log(data);
    }, []);

    // Calendar API request

    const getUpComingEvents = useCallback(async () => {
        if (!token) return [];
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const data = await res.json();
        return data.items || [];


    }, [token]);


    // Load token from storage on mount (Chrome extension or localStorage fallback)
    useEffect(() => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get(['token', 'user'], (result) => {
                    if (result && result.token) setToken(result.token);
                    if (result && result.user) setUser(result.user);
                });
            } else {
                const savedToken = localStorage.getItem('token');
                if (savedToken) setToken(savedToken);

                const savedUser = localStorage.getItem('user');
                if (savedUser) setToken(savedUser);

            }
        } catch (err) {
            // If any unexpected error occurs, fall back to localStorage
            const saved = localStorage.getItem('token');
            if (saved) setToken(saved);
        }
    }, []);

    // Save token to Chrome storage (if available) and also mirror to localStorage as a fallback
    useEffect(() => {
        if (!token) return;
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.set({ token });
                chrome.storage.sync.set({ user })
            }
        } catch (err) {
            // ignore and fall through to localStorage
        }
        try {
            localStorage.setItem('token', token);
            localStorage.setItem('user', user);
        } catch (e) {
            // ignore localStorage errors (e.g., in private mode)
        }
    }, [token]);


    // Testing User Information 






    return (
        <GoogleAPIContext.Provider value={{ signIn, token, user, fetchUserInfo, getUpComingEvents }}>
            {children}
        </GoogleAPIContext.Provider>
    )
};


const useGoogleAPIContext = () => {
    //get the Google API context
    const context = useContext(GoogleAPIContext);
    return context;
}

export { GoogleAPIContext, useGoogleAPIContext, GoogleAPIContextProvider };