import React, { useState, useEffect } from 'react';
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


function SlideTransition(props) {
    return <Slide {...props} direction="up" />;
}


const Popup = (props) => {
    const [count, setCount] = useState(0);
    const [snackBarOpen, setSnackBarOpen] = useState(false);
    const [snackBarMessage, setSnackBarMessage] = useState('');

    const handleSnackBarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setSnackBarOpen(false);
    };

    const handleAddEventButtonClick = (someMessage) => {
        setSnackBarOpen(true);
        setSnackBarMessage(someMessage);
    };

    const handleDeleteEventButtonClick = (someMessage) => {
        setSnackBarOpen(true);
        setSnackBarMessage(someMessage);
    };

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
                        <List>
                            <ListItem>

                                <ListItemText primary={<div className='tw:text-[30px]'> <span className='tw:font-bold tw:text-[#1a73e8]  tw:tracking-wider'>CalAlder</span></div>} className='tw:m-auto tw:text-center' />
                            </ListItem>
                            <Divider />
                            <ListItem className='tw:bg-stone-100'>
                                <ListItemText primary="login" className='tw:text-right tw:mx-2' />
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <ListItemText primary="signup" className='tw:text-left tw:mx-2' />
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
                    <Paper variant='outlined' className='tw:max-h-[350px] tw:h-fit tw:mx-2 tw:overflow-y-auto tw:!pr-2 '>
                        <List className='tw:my-0 tw:!p-0 tw:mr-4'>

                            {
                                testData.map((item, index, array) => (
                                    <React.Fragment key={item.title}>
                                        <div className='tw:pl-4 tw:hover:bg-stone-100 tw:flex tw:items-center tw:justify-between tw:group'>
                                            <ListItemText className='tw:w-[65%]' primary={item.title} secondary={
                                                <>
                                                    <Typography>
                                                        {item.secondary}
                                                    </Typography>
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