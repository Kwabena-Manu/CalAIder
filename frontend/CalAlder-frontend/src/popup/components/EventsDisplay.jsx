import React, { useState, useEffect } from 'react';

import PropTypes from 'prop-types';
import { formatDate } from '../../utils/dateFormatUtils';
import { useGoogleAPIContext } from '../../context/GoogleAPIContext';


import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';











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

const EventDisplay = (props) => {

    // Instantiating the Google API Context
    const googleApiContext = useGoogleAPIContext();

    return (
        <>
            <Paper variant='outlined' className='tw:max-h-[280px] tw:h-fit tw:mx-2 tw:overflow-y-auto'>
                <TabPanel value={props.tabValue} index={0}>
                    "what is matter"
                </TabPanel>
                <TabPanel value={props.tabValue} index={1}>

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
                                                        <div className='tw:text-xs tw:truncate'>
                                                            {formatDate(event.start)} - {formatDate(event.end)}
                                                        </div>
                                                        <div>
                                                            {event?.location > 30 ? `${event.location.slice(0, 30)}...` : event.location.slice(0, 30)}
                                                        </div>
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
                    ) :
                        (

                            <Typography variant='h5' className='tw:my-auto tw:p-4 tw:text-center tw:mx-auto'>Nothing to see here!</Typography>

                        )

                    }


                </TabPanel>

            </Paper>

        </>
    )
}
export default EventDisplay