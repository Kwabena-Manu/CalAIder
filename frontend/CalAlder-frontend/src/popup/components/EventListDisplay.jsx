import React, { useState, useEffect } from 'react';

import { mockEvents } from '../mockData';
import { formatDate } from '../../utils/dateFormatUtils';



// MaterialUI imports

import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';


const EventListDisplay = (props) => {

    const maxLengthSummary = props.eventsType === "detectedEvents" ? 25 : 40;
    const maxLengthLocation = props.eventsType === "detectedEvents" ? 30 : 60;

    // Function to handle add event button click event
    const handleEditEventButtonClick = (event, index) => {
        console.log(event);
        props.setEditButtonClicked(true);
        props.setEventToEdit(event);
        props.setSelectedIndex(index);
    };

    // Function to handle add event button click event
    const handleAddEventButtonClick = (someMessage) => {
        props.setSnackBarOpen(true);
        props.setSnackBarMessage(someMessage);
    };

    // Function to handle delete event button click event
    const handleDeleteEventButtonClick = (eventIndex, someMessage = 'Event deleted') => {
        if (!window.confirm('Delete this event?')) return;

        // Prefer parent callback
        if (typeof props.onDelete === 'function') {
            props.onDelete(eventIndex); // parent removes it from state
        } else if (typeof props.setEvents === 'function') {
            // fallback: parent gave a setter
            props.setEvents(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== eventIndex) : prev);
        } else {
            console.warn('Provide onDelete(index) or setEvents setter to remove items from parent state.');
        }

        if (typeof props.setSnackBarMessage === 'function') props.setSnackBarMessage(someMessage);
        if (typeof props.setSnackBarOpen === 'function') props.setSnackBarOpen(true);
    };


    return (
        <>
            <List className='tw:my-0 tw:!p-0 '>
                {
                    props.events.map((event, index, array) => (

                        <React.Fragment key={event.id || event.title + event.startDate}>
                            <div className=' tw:hover:bg-stone-100 tw:flex tw:items-center tw:justify-between tw:group'>
                                <ListItemText className='tw:pl-1 tw:w-[60%]'
                                    primary={
                                        <>
                                            <Typography className='tw:!font-bold tw:text-zinc-600'>
                                                {(() => {
                                                    const title = event.summary || event.title || 'Untitled event';
                                                    return title.length > maxLengthSummary ? `${title.slice(0, maxLengthSummary)}…` : title;
                                                })()}
                                            </Typography>
                                        </>
                                    }
                                    secondary={
                                        <>
                                            <div className='tw:text-xs'>
                                                {
                                                    (() => {
                                                        const location = event.location || event.address || 'No Location';
                                                        return location.length > maxLengthLocation ? `${location.slice(0, maxLengthLocation)}...` : location;
                                                    })()
                                                }

                                            </div>
                                            <div className='tw:text-xs tw:truncate'>
                                                {event.startDate || formatDate(event.start)} - {event.endDate || formatDate(event.end)}
                                            </div>
                                        </>
                                    } />


                                {props.eventsType === "detectedEvents" ?

                                    (<Stack direction="row" spacing={0.5} className='tw:invisible  tw:group-hover:visible tw:group-focus:visible tw:transition-opacity tw:duration-150 tw:opacity-0 tw:group-hover:opacity-100 tw:flex tw:items-center '>
                                        <Tooltip title="Add event to calendar">
                                            <IconButton onClick={() => handleAddEventButtonClick("Event added to your calendar!")}>
                                                <AddIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip title="Edit event">
                                            <IconButton onClick={() => handleEditEventButtonClick(props.events[index], index)} >

                                                <EditCalendarIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>


                                        <Tooltip title='Delete event'>
                                            <IconButton onClick={() => handleDeleteEventButtonClick(index, "Event deleted!")}>

                                                <DeleteForeverIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>)
                                    :
                                    (<></>)
                                }
                            </div>

                            {index !== array.length - 1 && <Divider />}

                        </React.Fragment>
                    ))
                }

            </List>
        </>
    )
}
export default EventListDisplay