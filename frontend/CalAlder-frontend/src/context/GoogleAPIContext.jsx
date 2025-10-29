import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';



const GoogleAPIContext = createContext();

const GoogleAPIContextProvider = ({ children }) => {

    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [userEvents, setUserEvents] = useState(null);

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

    // Try to refresh the token silently (interactive=false). If interactive=true, it may prompt the user.
    const refreshToken = useCallback(async (interactive = false) => {
        return new Promise((resolve, reject) => {
            try {
                if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
                    return reject(new Error('chrome.identity unavailable'));
                }
                chrome.identity.getAuthToken({ interactive }, (newToken) => {
                    if (chrome.runtime.lastError || !newToken) {
                        return reject(chrome.runtime.lastError || new Error('No token'));
                    }
                    setToken(newToken);
                    resolve(newToken);
                });
            } catch (e) {
                reject(e);
            }
        });
    }, []);

    // Remove a cached token (so next getAuthToken will produce a fresh one) and clear saved state
    const removeCachedToken = useCallback(async (tkn) => {
        return new Promise((resolve) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.removeCachedAuthToken) {
                    chrome.identity.removeCachedAuthToken({ token: tkn }, () => {
                        setToken(null);
                        setUser(null);
                        try {
                            if (chrome.storage && chrome.storage.sync) chrome.storage.sync.remove(['token', 'user']);
                        } catch (e) { }
                        try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) { }
                        resolve();
                    });
                } else {
                    // fallback
                    setToken(null);
                    setUser(null);
                    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) { }
                    resolve();
                }
            } catch (e) { resolve(); }
        });
    }, []);

    // Sign out: remove cached token, revoke with Google, clear state/storage
    const signOut = useCallback(async () => {
        try {
            let tkn = token;
            // Try to get current token if we don't have it
            if (!tkn && typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getAuthToken) {
                try {
                    tkn = await new Promise((resolve, reject) => {
                        chrome.identity.getAuthToken({ interactive: false }, (tok) => {
                            if (chrome.runtime && chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                            resolve(tok);
                        });
                    });
                } catch (e) {
                    // ignore
                }
            }

            // remove cached token from chrome
            if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.removeCachedAuthToken && tkn) {
                try {
                    await new Promise((resolve) => {
                        chrome.identity.removeCachedAuthToken({ token: tkn }, () => resolve());
                    });
                } catch (e) {
                    // ignore
                }
            }

            // revoke at Google's servers (best-effort)
            if (tkn) {
                try {
                    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tkn)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    });
                } catch (e) {
                    // ignore network errors
                }
            }
        } catch (e) {
            // ignore top-level errors
        } finally {
            // clear local state and storage
            try { setToken(null); } catch (e) {}
            try { setUser(null); } catch (e) {}
            try { setUserEvents(null); } catch (e) {}
            try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && chrome.storage.sync.remove) {
                    chrome.storage.sync.remove(['token','user'], () => {});
                }
            } catch (e) {}
        }
    }, [token]);



    // Fetch user information

    const fetchUserInfo = useCallback(async (token) => {
        // attempt request, if 401 try to refresh token silently and retry once
        const doFetch = async (tkn) => {
            const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${tkn}` },
            });
            if (res.status === 401) throw new Error('unauthorized');
            const data = await res.json();
            return data;
        };

        try {
            const data = await doFetch(token);
            setUser(data);
            console.log(data);
            return data;
        } catch (err) {
            // try to refresh token silently and retry once
            try {
                const newToken = await refreshToken(false);
                const data = await doFetch(newToken);
                setUser(data);
                return data;
            } catch (err2) {
                // If refresh/ retry fails, clear cached token so next action forces interactive sign-in
                await removeCachedToken(token);
                throw err2;
            }
        }
    }, []);

    // Calendar API request

    const getUpComingEvents = useCallback(async () => {

        const now = new Date().toISOString();
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=${now}`;

        if (!token) return [];

        const doFetch = async (tkn) => {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${tkn}` },
            });
            if (res.status === 401) throw new Error('unauthorized');
            const data = await res.json();
            return data;
        };

        try {
            const data = await doFetch(token);
            console.log("Events:", data);
            setUserEvents(data.items);
            return data.items || [];
        } catch (err) {
            // Try to refresh token silently and retry once
            try {
                const newToken = await refreshToken(false);
                const data = await doFetch(newToken);
                console.log("Events (after refresh):", data);
                setUserEvents(data.items);
                return data.items || [];
            } catch (err2) {
                // Couldn't refresh: clear cached token so we force an interactive sign-in next time
                await removeCachedToken(token);
                console.error('Failed to refresh token or fetch events:', err2);
                throw err2;
            }
        }

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
                if (savedUser) {
                    try {
                        setUser(JSON.parse(savedUser));
                    } catch (e) {
                        setUser(savedUser);
                    }
                }

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
            try {
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) {
                // fallback to string coercion
                localStorage.setItem('user', String(user));
            }
        } catch (e) {
            // ignore localStorage errors (e.g., in private mode)
        }
    }, [token, user]);


    // Testing User Information 






    return (
        <GoogleAPIContext.Provider value={{ signIn, signOut, token, user, userEvents, fetchUserInfo, getUpComingEvents }}>
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