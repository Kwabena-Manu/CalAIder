import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { parseAndFormatTime } from '../utils/timeFormatUtils';



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
            try { setToken(null); } catch (e) { }
            try { setUser(null); } catch (e) { }
            try { setUserEvents(null); } catch (e) { }
            try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) { }
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && chrome.storage.sync.remove) {
                    chrome.storage.sync.remove(['token', 'user'], () => { });
                }
            } catch (e) { }
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

    // Add an event to the user's primary calendar
    const addEventToCalendar = useCallback(async (eventObj) => {
        if (!token) throw new Error('Not authenticated');

        // Helper: format date string (YYYY-MM-DD) or return null
        const formatDateOnly = (d) => {
            if (!d) return null;
            // If already YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
            // Try to parse
            const dt = new Date(d);
            if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
            return null;
        };

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        // Build event body with careful date/time handling
        const body = {
            summary: eventObj.title || eventObj.summary || 'Event',
            description: eventObj.notes || eventObj.description || undefined,
            location: eventObj.address || eventObj.location || eventObj.venue || undefined,
        };

        const startDateOnly = formatDateOnly(eventObj.startDate || eventObj.start);
        const endDateOnly = formatDateOnly(eventObj.endDate || eventObj.end);

        // If we have a start time, attempt to parse and use dateTime
        const parsedStartTime = parseAndFormatTime(eventObj.startTime || eventObj.start_time || eventObj.startTimeRaw || '');
        const parsedEndTime = parseAndFormatTime(eventObj.endTime || eventObj.end_time || eventObj.endTimeRaw || '');

        if (parsedStartTime) {
            // Use dateTime with timezone
            const sd = startDateOnly || formatDateOnly(new Date().toISOString());
            const ed = endDateOnly || sd;
            const startDateTime = `${sd}T${parsedStartTime}`;
            let endDateTime = `${ed}T${parsedEndTime || parsedStartTime}`;
            // If end equals start, add one hour by default
            if (!parsedEndTime) {
                const dt = new Date(`${startDateTime}`);
                dt.setHours(dt.getHours() + 1);
                endDateTime = dt.toISOString().slice(0, 19);
            }

            body.start = { dateTime: startDateTime, timeZone: tz };
            body.end = { dateTime: endDateTime, timeZone: tz };
        } else if (startDateOnly) {
            // All-day event: Google Calendar requires end.date to be the day AFTER the last day (exclusive)
            const start = startDateOnly;
            let end = endDateOnly || start;
            try {
                const endDt = new Date(end);
                // If end equals start, set end to next day to represent a single-day all-day event
                if (end === start) {
                    endDt.setDate(endDt.getDate() + 1);
                    end = endDt.toISOString().slice(0, 10);
                } else {
                    // If user provided a same-day end, still make it exclusive by adding 1 day
                    const startDt = new Date(start);
                    const endDt2 = new Date(end);
                    if (endDt2.getTime() <= startDt.getTime()) {
                        endDt2.setDate(startDt.getDate() + 1);
                        end = endDt2.toISOString().slice(0, 10);
                    } else {
                        // Keep provided end but add one day to make it exclusive
                        endDt2.setDate(endDt2.getDate() + 1);
                        end = endDt2.toISOString().slice(0, 10);
                    }
                }
            } catch (e) {
                // fallback: set end to next day
                const dt = new Date(start);
                dt.setDate(dt.getDate() + 1);
                end = dt.toISOString().slice(0, 10);
            }
            body.start = { date: start };
            body.end = { date: end };
        } else {
            // As a last resort, if eventObj has an RFC3339 start like 'start' or 'start.dateTime'
            if (eventObj.start && typeof eventObj.start === 'string' && !isNaN(new Date(eventObj.start))) {
                body.start = { dateTime: new Date(eventObj.start).toISOString() };
                // set end to +1 hour
                const dt = new Date(eventObj.start);
                dt.setHours(dt.getHours() + 1);
                body.end = { dateTime: dt.toISOString() };
            } else if (eventObj.start && eventObj.start.dateTime) {
                body.start = eventObj.start;
                body.end = eventObj.end || { dateTime: new Date().toISOString() };
            } else {
                throw new Error('Event missing recognizable start date/time');
            }
        }

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

        const doFetch = async (tkn) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${tkn}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.status === 401) throw new Error('unauthorized');
            const text = await res.text();
            let data = null;
            try { data = JSON.parse(text); } catch (e) { data = text; }
            if (!res.ok) {
                const msg = `Calendar API error ${res.status}: ${JSON.stringify(data)}`;
                console.error(msg, body);
                const err = new Error(msg);
                err.response = data;
                throw err;
            }
            return data;
        };

        try {
            const data = await doFetch(token);
            // Optionally refresh local list of events
            await getUpComingEvents();
            return data;
        } catch (err) {
            try {
                const newToken = await refreshToken(false);
                const data = await doFetch(newToken);
                await getUpComingEvents();
                return data;
            } catch (err2) {
                await removeCachedToken(token);
                throw err2;
            }
        }
    }, [token, getUpComingEvents, refreshToken, removeCachedToken]);

    // Update an existing event in the user's primary calendar (PATCH)
    const updateCalendarEvent = useCallback(async (eventId, editedEvent) => {
        if (!token) throw new Error('Not authenticated');

        // Helper: format date string (YYYY-MM-DD) or return null
        const formatDateOnly = (d) => {
            if (!d) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
            const dt = new Date(d);
            if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
            return null;
        };

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const body = {
            summary: editedEvent.title || editedEvent.summary,
            description: editedEvent.notes || editedEvent.description,
            location: editedEvent.address || editedEvent.location || editedEvent.venue,
        };

        // Build start/end from edited fields; fall back to existing if not provided
        const startDateOnly = formatDateOnly(editedEvent.startDate);
        const endDateOnly = formatDateOnly(editedEvent.endDate);
        const parsedStartTime = parseAndFormatTime(editedEvent.startTime || editedEvent.start_time || editedEvent.startTimeRaw || '');
        const parsedEndTime = parseAndFormatTime(editedEvent.endTime || editedEvent.end_time || editedEvent.endTimeRaw || '');

        if (startDateOnly) {
            if (parsedStartTime) {
                const sd = startDateOnly;
                const ed = endDateOnly || sd;
                const startDateTime = `${sd}T${parsedStartTime}`;
                let endDateTime = `${ed}T${parsedEndTime || parsedStartTime}`;
                if (!parsedEndTime) {
                    const dt = new Date(`${startDateTime}`);
                    dt.setHours(dt.getHours() + 1);
                    endDateTime = dt.toISOString().slice(0, 19);
                }
                body.start = { dateTime: startDateTime, timeZone: tz };
                body.end = { dateTime: endDateTime, timeZone: tz };
            } else {
                // All-day event handling (Google expects end.date as exclusive)
                const start = startDateOnly;
                let end = endDateOnly || start;
                try {
                    const endDt = new Date(end);
                    // Make end exclusive (next day)
                    endDt.setDate(endDt.getDate() + 1);
                    end = endDt.toISOString().slice(0, 10);
                } catch (e) {
                    const dt = new Date(start);
                    dt.setDate(dt.getDate() + 1);
                    end = dt.toISOString().slice(0, 10);
                }
                body.start = { date: start };
                body.end = { date: end };
            }
        }

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;

        const doFetch = async (tkn) => {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${tkn}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.status === 401) throw new Error('unauthorized');
            const text = await res.text();
            let data = null;
            try { data = JSON.parse(text); } catch (e) { data = text; }
            if (!res.ok) {
                const msg = `Calendar API error ${res.status}: ${JSON.stringify(data)}`;
                console.error(msg, body);
                const err = new Error(msg);
                err.response = data;
                throw err;
            }
            return data;
        };

        try {
            const data = await doFetch(token);
            await getUpComingEvents();
            return data;
        } catch (err) {
            try {
                const newToken = await refreshToken(false);
                const data = await doFetch(newToken);
                await getUpComingEvents();
                return data;
            } catch (err2) {
                await removeCachedToken(token);
                throw err2;
            }
        }
    }, [token, getUpComingEvents, refreshToken, removeCachedToken]);

    // Delete an event from the user's primary calendar
    const deleteCalendarEvent = useCallback(async (eventId) => {
        if (!token) throw new Error('Not authenticated');
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;

        const doFetch = async (tkn) => {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${tkn}` }
            });
            if (res.status === 401) throw new Error('unauthorized');
            if (!res.ok && res.status !== 204) {
                const text = await res.text();
                const msg = `Calendar API delete error ${res.status}: ${text}`;
                console.error(msg);
                const err = new Error(msg);
                throw err;
            }
            return true;
        };

        try {
            await doFetch(token);
            await getUpComingEvents();
            return true;
        } catch (err) {
            try {
                const newToken = await refreshToken(false);
                await doFetch(newToken);
                await getUpComingEvents();
                return true;
            } catch (err2) {
                await removeCachedToken(token);
                throw err2;
            }
        }
    }, [token, getUpComingEvents, refreshToken, removeCachedToken]);


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
        <GoogleAPIContext.Provider value={{ signIn, signOut, token, user, userEvents, fetchUserInfo, getUpComingEvents, addEventToCalendar, updateCalendarEvent, deleteCalendarEvent }}>
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