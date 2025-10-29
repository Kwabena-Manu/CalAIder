import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import reactLogo from '../assets/react.svg';
import viteLogo from '/vite.svg';
import './Popup.css';


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
import Card from '@mui/material/Card';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';






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
                <Box sx={{ p: 3 }}>
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

    // Function to  handle SnackBar close event
    const handleSnackBarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setSnackBarOpen(false);
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
    }

    const testData = [
        { title: "Event 1 ", secondary: "April 1" },
        { title: "Event 2 ", secondary: "April 1" },
        { title: "Event 3 ", secondary: "April 1" },
        { title: "Event 4 ", secondary: "April 1" },
        { title: "Event 5 ", secondary: "April 1" },
        { title: "Event 6 ", secondary: "April 1" },
        { title: "Event 7 ", secondary: "April 1" },
        { title: "Event 8 ", secondary: "April 1" },
        { title: "Event 9 ", secondary: "April 1" },
        { title: "Event 10 ", secondary: "April 1" },
        { title: "Event 11", secondary: "April 1" },
        { title: "Event 12 ", secondary: "April 1" },
        { title: "Event 13 ", secondary: "April 1" },
        { title: "Event 14", secondary: "April 1" },

    ]
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
                                <Tabs className='tw:mx-auto' value={tabValue} onChange={handleTabChange} centered>
                                    <Tab label="Detected Events" {...a11yProps(0)} />
                                    <Tab label="Upcoming Events" {...a11yProps(1)} />
                                    {/* <Tab></Tab> */}
                                </Tabs>



                            </ListItem>
                        </List>
                    </nav>
                </Box>

                <Box className=" tw:overflow-hidden tw:!px-2">
                    <div className='tw:my-2 tw:px-4 tw:text-sm'>
                        {googleApiContext.userEvents != null && googleApiContext.userEvents.length != 0 ? (
                            `Events Detected (${googleApiContext.userEvents.length})`
                        ) : (
                            "No events detected"
                        )}
                    </div>
                    <Paper variant='outlined' className='tw:max-h-[280px] tw:h-fit tw:mx-2 tw:overflow-y-auto'>
                        <TabPanel value={tabValue} index={0}>
                            "what is matter"
                        </TabPanel>
                        <TabPanel value={tabValue} index={1}>

                            {googleApiContext.userEvents ? (

                                <List className='tw:my-0 tw:!p-0 '>
                                    {
                                        googleApiContext.userEvents.map((event, index, array) => (

                                            <React.Fragment key={event.id}>
                                                <div className=' tw:hover:bg-stone-100 tw:flex tw:items-center tw:justify-between tw:group'>
                                                    <ListItemText className='tw:pl-1 tw:w-[60%]'
                                                        primary={
                                                            <>
                                                                <Typography className='tw:!font-bold tw:text-zinc-600'>
                                                                    {event.summary}
                                                                </Typography>
                                                            </>
                                                        }
                                                        secondary={
                                                            <>
                                                                <span className='tw:text-sm'>
                                                                    {event.start.dateTime}
                                                                </span>
                                                            </>
                                                        } />
                                                    {/* Use group-hover/group-focus so the icons reveal when the parent ListItemButton is hovered/focused.
                                                Note: element can't receive hover when it's `invisible`, so we show it via the parent. */}
                                                    <Stack direction="row" spacing={0.5} className='tw:invisible  tw:group-hover:visible tw:group-focus:visible tw:transition-opacity tw:duration-150 tw:opacity-0 tw:group-hover:opacity-100 tw:flex tw:items-center '>
                                                        <Tooltip title="Add event to calendar">
                                                            <IconButton onClick={() => handleAddEventButtonClick("Event added to your calendar!")}>
                                                                <AddIcon fontSize='small' />
                                                            </IconButton>
                                                        </Tooltip>

                                                        <Tooltip title="Edit event">
                                                            <IconButton >

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
                            ) :
                                (

                                    <Typography variant='h5' className='tw:my-auto tw:p-4 tw:text-center tw:mx-auto'>Nothing to see here!</Typography>

                                )

                            }


                        </TabPanel>

                    </Paper>
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