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


    // Save token to Chrome storage for persistence
    useEffect(() => {
        if (token) chome.storage.sync.set({ token });
    }, [token]);






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