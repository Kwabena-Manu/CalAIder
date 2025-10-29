import React, { useState, useEffect } from 'react';
import reactLogo from '../assets/react.svg';
import viteLogo from '/vite.svg';
import { extractEvents, ensureModelReady } from '../../../../promptAPI/prompt_ai.js';
import { mockEvents } from './mockData';
import EditPaper from '../components/EditPaper';


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


function SlideTransition(props) {
    return <Slide {...props} direction="up" />;
}


const Popup = (props) => {
    const [count, setCount] = useState(0);
    const [snackBarOpen, setSnackBarOpen] = useState(false);
    const [snackBarMessage, setSnackBarMessage] = useState('');
    const [editButtonClicked, setEditButtonClicked] = useState(false);
    const [eventToEdit, setEventToEdit] = useState({});
    const [eventList, setEventList] = useState([...mockEvents.events]);
    const [selectedIndex, setSelectedIndex] = useState(null);

    // Instantiating the Google API Context
    const googleApiContext = useGoogleAPIContext();

    useEffect(()=> {
        const detect_and_extract_events = async () => {
            // Loads and prepares Gemini Nano
            await ensureModelReady();

            // Extract web text from websites. Not fully working yet
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const webText = await chrome.runtime.getBackgroundPage()
                .then(bg => bg.extractPage(tab.id));
            
            console.log("Extracted text:", webText);

            // Extract events from web pages
            const data = await extractEvents(webText);
            setEventList([...data.events]);
            console.log(data);
        };
        detect_and_extract_events();        
    }, []);

    // Function to handle User Login 
    const handleUserLogin = async () => {

        const token = await googleApiContext.signIn();
        await googleApiContext.fetchUserInfo(token);
        var upcomingUserEvents = await googleApiContext.getUpComingEvents();
        console.log("Upcoming Events: ", upcomingUserEvents);
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

    const handleEditEventSave = (editedEvent) => {
        setEventList(prev =>
            prev.map((ev, i) => (i === selectedIndex ? { ...ev, ...editedEvent } : ev))
        );
        setEditButtonClicked(false);
        setSelectedIndex(null);
    };

    const testData = eventList.map(e => ({
        title: e.title,
        secondary: `${e.startDate} ${e.startTime ? `• ${e.startTime}` : ''}`
    }));

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

    return (
        <>
            <div className='popup tw:h-full tw:overflow-hidden'>
                <Box className="tw:w-full tw:overflow-hidden">
                    <nav>
                        <List>
                            <ListItem>

                                <ListItemText primary={<div className='tw:text-[30px]'> <span className='tw:font-bold tw:text-[#1a73e8]  tw:tracking-wider'>CalAlder</span></div>} className='tw:m-auto tw:text-center' />
                            </ListItem>
                            <Divider />
                            <ListItem className='tw:bg-stone-100'>
                                <ListItemText primary=
                                    {
                                        <>
                                            {googleApiContext.token && googleApiContext.user ?
                                                (
                                                    <div>
                                                        Hello, {googleApiContext.user.name}
                                                    </div>
                                                )
                                                :
                                                (
                                                    <Button variant='outlined' onClick={handleUserLogin}>Sign in</Button>
                                                )}

                                        </>
                                    } className='tw:text-center tw:mx-2' />
                                {/* <Divider orientation='vertical' variant='middle' flexItem />
                                <ListItemText primary="signup" className='tw:text-left tw:mx-2' /> */}
                            </ListItem>

                            <Divider />
                        </List>
                    </nav>
                </Box>

                <Box className=" tw:overflow-hidden">
                    <div className='tw:my-4 tw:mx-4 tw:text-lg'>
                        {testData.length === 0 ? (
                            "No events detected"
                        ) : (
                            `Events Detected (${testData.length})`
                        )}
                    </div>
                    {
                        editButtonClicked? (
                            <EditPaper 
                                eventData={eventToEdit} 
                                onClose={() => setEditButtonClicked(false)} 
                                onSave={handleEditEventSave}
                            />
                        ) : (
                            <Paper variant='outlined' className='tw:max-h-[350px] tw:h-fit tw:mx-2 tw:overflow-y-auto tw:!pr-2 '>
                                <List className='tw:my-0 tw:!p-0 tw:mr-4'>

                                    {
                                        testData.map((item, index, array) => (
                                            <React.Fragment key={item.title}>
                                                <div className='tw:pl-4 tw:hover:bg-stone-100 tw:flex tw:items-center tw:justify-between tw:group'>
                                                    <ListItemText className='tw:w-[65%]'
                                                        primary={
                                                            <>
                                                                <Typography className='tw:!font-bold tw:text-zinc-600'>
                                                                    {item.title}
                                                                </Typography>
                                                            </>
                                                        }
                                                        secondary={
                                                            <>
                                                                <span className='tw:text-sm'>
                                                                    {item.secondary}
                                                                </span>
                                                            </>
                                                        } />
                                                    <Divider orientation='vertical' variant='middle' />
                                                    {/* Use group-hover/group-focus so the icons reveal when the parent ListItemButton is hovered/focused.
                                                        Note: element can't receive hover when it's `invisible`, so we show it via the parent. */}
                                                    <Stack direction="row" spacing={1} className='tw:invisible tw:group-hover:visible tw:group-focus:visible tw:transition-opacity tw:duration-150 tw:opacity-0 tw:group-hover:opacity-100 tw:flex tw:items-center tw:space-x-2'>
                                                        <Tooltip title="Add event to calendar">
                                                            <IconButton onClick={() => handleAddEventButtonClick("Event added to your calendar!")}>
                                                                <AddIcon fontSize='small' />
                                                            </IconButton>
                                                        </Tooltip>

                                                        <Tooltip title="Edit event">
                                                            <IconButton onClick={() => handleEditEventButtonClick(eventList[index], index)} >

                                                                <EditCalendarIcon fontSize='small' />
                                                            </IconButton>
                                                        </Tooltip>


                                                        <Tooltip title='Delete event'>
                                                            <IconButton onClick={() => handleDeleteEventButtonClick("Event deleted!")}>

                                                                <DeleteForeverIcon fontSize='small' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </div>

                                                {index !== array.length - 1 && <Divider />}

                                            </React.Fragment>
                                        ))
                                    }

                                </List>

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