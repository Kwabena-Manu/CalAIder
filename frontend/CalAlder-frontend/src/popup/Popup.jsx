import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import reactLogo from '../assets/react.svg';
import viteLogo from '/vite.svg';
import { mockEvents } from './mockData';
import EditPaper from '../components/EditPaper';
import { formatDate } from '../utils/dateFormatUtils';


// testing materialUI
import Button from '@mui/material/Button';

// MaterialUI imports

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { useGoogleAPIContext } from '../context/GoogleAPIContext';
import { useEventExtraction } from '../context/EventExtractionContext';
import Card from '@mui/material/Card';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import EventListDisplay from './components/EventListDisplay';
import LinearProgress from '@mui/material/LinearProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import DebugPanel from './components/DebugPanel';






const TabPanel = (props) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 1 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

const a11yProps = (index) => {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`,
    };
}





const SlideTransition = (props) => {
    return <Slide {...props} direction="up" />;
}






const Popup = (props) => {
    const [count, setCount] = useState(0);
    const [snackBarOpen, setSnackBarOpen] = useState(false);
    const [snackBarMessage, setSnackBarMessage] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const [profileAnchorEl, setProfileAnchorEl] = useState(null);
    const profileMenuOpen = Boolean(profileAnchorEl);


    const [editButtonClicked, setEditButtonClicked] = useState(false);
    const [eventToEdit, setEventToEdit] = useState({});
    const [editingEventType, setEditingEventType] = useState(null); // 'detected' or 'user'
    // Event extraction state from context
    const {
        detectedEvents,
        isExtracting,
        lastError,
        modelProgress,
        modelReady,
        status,
        currentItem,
        totalItems,
        extractEventsFromPage,
        cancelExtraction,
        removeDetectedEvent,
        markEventAsAdded,
        updateDetectedEvent,
        clearDetectedEvents
    } = useEventExtraction();
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [eventList, setEventList] = useState([...mockEvents.events]);

    // Instantiating the Google API Context
    const googleApiContext = useGoogleAPIContext();

    const handleProfileClick = (event) => {
        setProfileAnchorEl(event.currentTarget);
    }

    const handleProfileMenuClose = () => {
        setProfileAnchorEl(null);
    }

    const handleUserLogout = () => {
        googleApiContext.signOut();
    };
    // Function to handle User Login 
    const handleUserLogin = async () => {

        const token = await googleApiContext.signIn();
        await googleApiContext.fetchUserInfo(token);
        await googleApiContext.getUpComingEvents();
        console.log("Upcoming Events: ", googleApiContext.userEvents);
    }
    console.log("User info is: ", googleApiContext.user)


    // Function to  handle SnackBar close event
    const handleSnackBarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setSnackBarOpen(false);
    };

    // Function to handle add event button click event
    const handleEditEventButtonClick = (event, index) => {
        console.log(event);
        setEditButtonClicked(true);
        setEventToEdit(event);
        setSelectedIndex(index);
    };

    // Function to handle add event button click event
    const handleAddEventButtonClick = (someMessage) => {
        setSnackBarOpen(true);
        setSnackBarMessage(someMessage);
    };

    // Function to handle delete event button click event
    const handleDeleteEventButtonClick = (someMessage) => {
        setSnackBarOpen(true);
        setSnackBarMessage(someMessage);
    };


    // Function to handle changing a tab
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setEditButtonClicked(false);


    }

    const handleEditEventSave = async (editedEvent) => {
        try {
            if (editingEventType === 'detected') {
                // Update detected event via context (and persist cache)
                updateDetectedEvent(selectedIndex, editedEvent);
                setSnackBarMessage('Event updated');
                setSnackBarOpen(true);
            } else if (editingEventType === 'user') {
                // Update user calendar event via Google API
                const original = googleApiContext?.userEvents?.[selectedIndex];
                const eventId = original?.id;
                if (!eventId || !googleApiContext?.updateCalendarEvent) {
                    throw new Error('Missing event id or updateCalendarEvent');
                }
                await googleApiContext.updateCalendarEvent(eventId, editedEvent);
                setSnackBarMessage('Calendar event updated');
                setSnackBarOpen(true);
            }
        } catch (e) {
            console.error('Failed to save edits:', e);
            setSnackBarMessage('Failed to save edits');
            setSnackBarOpen(true);
        } finally {
            setEditButtonClicked(false);
            setSelectedIndex(null);
            setEditingEventType(null);
        }
    };

    const testData = eventList.map(e => ({
        title: e.title,
        secondary: `${e.startDate} ${e.startTime ? `• ${e.startTime}` : ''}`
    }));


    const handleDeleteFromPopup = (indexOrId) => {
        setEventList(prev => {
            if (!Array.isArray(prev)) return prev;
            // if index passed (number), remove by index
            if (typeof indexOrId === 'number') {
                return prev.filter((_, i) => i !== indexOrId);
            }
            // otherwise treat as id
            return prev.filter(ev => ev.id !== indexOrId);
        });
        setSnackBarMessage('Event deleted');
        setSnackBarOpen(true);
    };



    const closeSnackBarActionButton = (
        <>
            <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleSnackBarClose}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </>
    )



    // Trigger user events fetch event when the extension is opened
    useEffect(() => {
        const fetchEventsIfSignedIn = async () => {
            if (googleApiContext?.token) {
                try {
                    await googleApiContext.getUpComingEvents();
                } catch (err) {
                    console.error('Failed to load upcoming events:', err);
                }
            }
        };

        fetchEventsIfSignedIn();
    }, [googleApiContext?.token]);



    return (
        <>
            <div className='popup tw:h-full tw:overflow-hidden'>
                <Box className="tw:w-full tw:overflow-hidden">
                    <nav>
                        <List className='tw:!py-0'>
                            <ListItem>

                                <ListItemText primary={
                                    <div className='tw:text-[30px]'>
                                        <span className='tw:font-bold tw:text-[#1a73e8]  tw:tracking-wider'>
                                            CalAlder
                                        </span>

                                    </div>} className='tw:m-auto ' />



                                {googleApiContext?.user ? (<><Chip avatar={<Avatar>{googleApiContext.user?.name ? googleApiContext.user.name.charAt(0).toUpperCase() : 'O'}</Avatar>} label={googleApiContext.user?.name ?? 'No User'}
                                    onClick={handleProfileClick}
                                    id='profile-button'
                                    aria-controls={profileMenuOpen ? 'profile-menu' : undefined}
                                    aria-haspopup="true"
                                    aria-expanded={profileMenuOpen ? 'true' : undefined}
                                />

                                    <Menu
                                        id='profile-menu'
                                        anchorEl={profileAnchorEl}
                                        open={profileMenuOpen}
                                        onClose={handleProfileMenuClose}
                                        slotProps={{
                                            list: {
                                                'aria-labelledby': 'profile-button',
                                                pt: 0,
                                                pb: 0,
                                            }
                                        }}
                                    >
                                        <MenuItem onClick={handleUserLogout}>Logout</MenuItem>
                                    </Menu>
                                </>) :
                                    (<Button variant='outlined' onClick={handleUserLogin}>Sign in</Button>)}

                            </ListItem>

                            <Divider />

                            <ListItem className='' >
                                <Tabs className='tw:mx-auto' variant='scrollable' scrollButtons="auto" value={tabValue} onChange={handleTabChange} centered>
                                    <Tab label="Detected Events" {...a11yProps(0)} />
                                    <Tab label="Upcoming Events" {...a11yProps(1)} />
                                    <Tab label="Debug" {...a11yProps(2)} />
                                </Tabs>



                            </ListItem>
                        </List>
                    </nav>
                </Box>

                <Box className=" tw:overflow-hidden tw:!px-2">
                    <div className='tw:my-2 tw:px-4'>
                        <div className='tw:flex tw:justify-between tw:items-center'>
                            <span className='tw:text-zinc-600 tw:font-bold tw:text-xs'>
                                {tabValue === 1 ? (
                                    (googleApiContext?.userEvents?.length > 0) ? (
                                        `Showing (${googleApiContext.userEvents.length}) upcoming events`
                                    ) : (
                                        "No upcoming events"
                                    )
                                ) : (
                                    isExtracting ?
                                        "Analyzing page..." :
                                        (detectedEvents?.length > 0) ?
                                            `Detected (${detectedEvents.length}) events` :
                                            "No events detected"
                                )}
                            </span>
                            {tabValue === 0 && (
                                <Stack direction="row" spacing={0.5}>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            if (isExtracting) {
                                                cancelExtraction();
                                            } else {
                                                extractEventsFromPage(true); // Force refresh, skip cache
                                            }
                                        }}
                                    >
                                        <Tooltip title={isExtracting ? "Cancel" : "Refresh"}>
                                            <RefreshIcon
                                                fontSize="small"
                                                className={isExtracting ? "tw:animate-spin" : ""}
                                            />
                                        </Tooltip>
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={async () => {
                                            if (window.confirm('Clear all detected events and cache for this page?')) {
                                                await clearDetectedEvents();
                                                setSnackBarMessage('Detected events cleared');
                                                setSnackBarOpen(true);
                                            }
                                        }}
                                        disabled={isExtracting || detectedEvents?.length === 0}
                                    >
                                        <Tooltip title="Clear all detected events">
                                            <ClearIcon fontSize="small" />
                                        </Tooltip>
                                    </IconButton>
                                </Stack>
                            )}
                        </div>
                        {tabValue === 0 && modelProgress < 1 && isExtracting && (
                            <LinearProgress
                                variant="determinate"
                                value={modelProgress * 100}
                                className='tw:mt-2'
                            />
                        )}
                        {lastError && (
                            <Typography color="error" variant="caption" className='tw:block tw:mt-1'>
                                {lastError}
                            </Typography>
                        )}
                    </div>
                    {
                        editButtonClicked ? (
                            <EditPaper
                                eventData={eventToEdit}
                                onClose={() => setEditButtonClicked(false)}
                                onSave={handleEditEventSave}
                            />
                        ) : (
                            <Paper variant='outlined' className='tw:max-h-[350px] tw:h-fit tw:mx-2 tw:overflow-y-auto'>
                                <TabPanel value={tabValue} index={0}>
                                    {/* Show current extraction status when extracting */}
                                    {isExtracting && (
                                        <Box className='tw:my-2 tw:p-2 tw:text-center tw:mx-auto'>
                                            <Typography variant="body2" className='tw:mb-1'>
                                                {status || 'Processing...'}
                                            </Typography>
                                            {totalItems > 0 && (
                                                <Typography variant="caption" color="textSecondary">
                                                    Section {currentItem} of {totalItems}
                                                </Typography>
                                            )}
                                            {modelProgress > 0 && (
                                                <LinearProgress variant="determinate" value={Math.min(100, Math.round(modelProgress * 100))} />
                                            )}
                                        </Box>
                                    )}

                                    {/* Always show detected events as they arrive */}
                                    {detectedEvents?.length ? (
                                        <EventListDisplay
                                            events={detectedEvents}
                                            setEditButtonClicked={setEditButtonClicked}
                                            setEventToEdit={setEventToEdit}
                                            setSelectedIndex={setSelectedIndex}
                                            setSnackBarOpen={setSnackBarOpen}
                                            setSnackBarMessage={setSnackBarMessage}
                                            eventsType={'detectedEvents'}
                                            onDelete={(index) => {
                                                removeDetectedEvent(index);
                                                setSnackBarMessage('Event deleted');
                                                setSnackBarOpen(true);
                                            }}
                                            onMarkAsAdded={markEventAsAdded}
                                            onEdit={(event, index) => {
                                                setEditingEventType('detected');
                                                setEditButtonClicked(true);
                                                setEventToEdit(event);
                                                setSelectedIndex(index);
                                            }}
                                        />
                                    ) : (
                                        !isExtracting && (
                                            <Typography variant='body2' className='tw:my-auto tw:p-4 tw:text-center tw:mx-auto'>
                                                No events detected on this page. Try refreshing or visiting a page with event information.
                                            </Typography>
                                        )
                                    )}
                                </TabPanel>
                                <TabPanel value={tabValue} index={1}>

                                    {googleApiContext.userEvents ? (

                                        <EventListDisplay events={googleApiContext.userEvents}
                                            setEditButtonClicked={setEditButtonClicked}
                                            setEventToEdit={setEventToEdit}
                                            setSelectedIndex={setSelectedIndex}
                                            setSnackBarOpen={setSnackBarOpen}
                                            setSnackBarMessage={setSnackBarMessage}
                                            eventsType={"userEvents"}
                                            onDelete={handleDeleteFromPopup}

                                            onEdit={(event, index) => {
                                                // Normalize Google Calendar event shape to EditPaper schema
                                                const toTwo = (n) => String(n).padStart(2, '0');
                                                const toDateParts = (dt) => {
                                                    if (!dt) return { date: null, time: null };
                                                    const d = new Date(dt);
                                                    if (isNaN(d)) return { date: null, time: null };
                                                    const date = `${d.getFullYear()}-${toTwo(d.getMonth() + 1)}-${toTwo(d.getDate())}`;
                                                    const time = `${toTwo(d.getHours())}:${toTwo(d.getMinutes())}`;
                                                    return { date, time };
                                                };

                                                let startDate = null, startTime = null, endDate = null, endTime = null;
                                                if (event?.start?.dateTime) {
                                                    const p = toDateParts(event.start.dateTime);
                                                    startDate = p.date; startTime = p.time;
                                                } else if (event?.start?.date) {
                                                    startDate = event.start.date;
                                                }
                                                if (event?.end?.dateTime) {
                                                    const p2 = toDateParts(event.end.dateTime);
                                                    endDate = p2.date; endTime = p2.time;
                                                } else if (event?.end?.date) {
                                                    // Google all-day events use exclusive end date; for editing, show the previous day as inclusive
                                                    try {
                                                        const d = new Date(event.end.date);
                                                        d.setDate(d.getDate() - 1);
                                                        endDate = `${d.getFullYear()}-${toTwo(d.getMonth() + 1)}-${toTwo(d.getDate())}`;
                                                    } catch (_) {
                                                        endDate = event.end.date;
                                                    }
                                                }

                                                const normalized = {
                                                    title: event.summary || event.title || 'Untitled event',
                                                    startDate,
                                                    startTime,
                                                    endDate: endDate || startDate,
                                                    endTime: endTime || null,
                                                    timezone: event?.start?.timeZone || event?.timeZone || null,
                                                    venue: null,
                                                    address: event.location || null,
                                                    city: null,
                                                    country: null,
                                                    url: event.htmlLink || null,
                                                    notes: event.description || null,
                                                };

                                                setEditingEventType('user');
                                                setEditButtonClicked(true);
                                                setEventToEdit(normalized);
                                                setSelectedIndex(index);
                                            }}
                                        />
                                    ) :
                                        (

                                            <Typography variant='h5' className='tw:my-auto tw:p-4 tw:text-center tw:mx-auto'>{googleApiContext?.user ? "Nothing to see here!" : "Sign in to see upcoming events from your calendar"}</Typography>

                                        )

                                    }


                                </TabPanel>
                                <TabPanel value={tabValue} index={2}>
                                    <DebugPanel />
                                </TabPanel>

                            </Paper>
                        )
                    }
                </Box>
            </div>
            <AppBar position='fixed' className='tw:!top-auto tw:!bottom-0'>

                <Toolbar>
                    CalAlder
                </Toolbar>
            </AppBar>

            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                message={snackBarMessage}
                autoHideDuration={1200}
                slots={{ transition: SlideTransition }}
                open={snackBarOpen}
                onClose={handleSnackBarClose}
                action={closeSnackBarActionButton}
                className='tw:w-fit'

            />

        </>
    )
}
export default Popup