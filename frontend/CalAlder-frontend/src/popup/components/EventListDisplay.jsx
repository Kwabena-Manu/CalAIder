import React, { useState, useEffect } from 'react';
import { useGoogleAPIContext } from '../../context/GoogleAPIContext';

import { mockEvents } from '../mockData';
import { formatDate, formatEventDateTime } from '../../utils/dateFormatUtils';



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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';


const EventListDisplay = (props) => {

    const maxLengthSummary = props.eventsType === "detectedEvents" ? 25 : 40;
    const maxLengthLocation = props.eventsType === "detectedEvents" ? 30 : 60;

    // Function to handle edit event button click event
    const handleEditEventButtonClick = (event, index) => {
        console.log(event);
        // Prefer onEdit callback if provided, otherwise use legacy setters
        if (typeof props.onEdit === 'function') {
            props.onEdit(event, index);
        } else {
            props.setEditButtonClicked(true);
            props.setEventToEdit(event);
            props.setSelectedIndex(index);
        }
    };

    // Function to handle add event button click event
    const googleApi = useGoogleAPIContext();
    const [addingIndex, setAddingIndex] = useState(null);

    // Add event to Google Calendar and show snackbar
    const handleAddEventButtonClick = async (event, index) => {
        if (!googleApi?.addEventToCalendar) {
            if (typeof props.setSnackBarMessage === 'function') props.setSnackBarMessage('Sign in to add events to calendar');
            if (typeof props.setSnackBarOpen === 'function') props.setSnackBarOpen(true);
            return;
        }

        try {
            setAddingIndex(index);
            await googleApi.addEventToCalendar(event);
            // Mark event as added in parent state
            if (typeof props.onMarkAsAdded === 'function') {
                props.onMarkAsAdded(index);
            }
            if (typeof props.setSnackBarMessage === 'function') props.setSnackBarMessage('Event added to your calendar!');
            if (typeof props.setSnackBarOpen === 'function') props.setSnackBarOpen(true);
        } catch (err) {
            console.error('Failed to add event to calendar', err);
            if (typeof props.setSnackBarMessage === 'function') props.setSnackBarMessage('Failed to add event');
            if (typeof props.setSnackBarOpen === 'function') props.setSnackBarOpen(true);
        } finally {
            setAddingIndex(null);
        }
    };

    // Function to handle delete event button click event
    const handleDeleteEventButtonClick = async (eventIndex, someMessage = 'Event deleted') => {
        if (!window.confirm('Delete this event?')) return;

        try {
            // If this is a user calendar event (not a detected event), delete from Google Calendar first
            if (props.eventsType !== 'detectedEvents') {
                const ev = props.events[eventIndex];
                if (ev?.id && googleApi?.deleteCalendarEvent) {
                    await googleApi.deleteCalendarEvent(ev.id);
                }
            }

            // Prefer parent callback for UI removal
            if (typeof props.onDelete === 'function') {
                props.onDelete(eventIndex);
            } else if (typeof props.setEvents === 'function') {
                props.setEvents(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== eventIndex) : prev);
            } else {
                console.warn('Provide onDelete(index) or setEvents setter to remove items from parent state.');
            }

            if (typeof props.setSnackBarMessage === 'function') props.setSnackBarMessage(someMessage);
            if (typeof props.setSnackBarOpen === 'function') props.setSnackBarOpen(true);
        } catch (err) {
            console.error('Failed to delete calendar event', err);
            if (typeof props.setSnackBarMessage === 'function') props.setSnackBarMessage('Failed to delete event');
            if (typeof props.setSnackBarOpen === 'function') props.setSnackBarOpen(true);
        }
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
                                            <div className='tw:flex tw:items-center tw:gap-1'>
                                                <Typography className='tw:!font-bold tw:text-zinc-600'>
                                                    {(() => {
                                                        const title = event.summary || event.title || 'Untitled event';
                                                        return title.length > maxLengthSummary ? `${title.slice(0, maxLengthSummary)}…` : title;
                                                    })()}
                                                </Typography>
                                                {event.addedToCalendar && (
                                                    <Chip
                                                        icon={<CheckCircleIcon />}
                                                        label="Added"
                                                        size="small"
                                                        color="success"
                                                        sx={{ height: '20px', fontSize: '0.7rem' }}
                                                    />
                                                )}
                                            </div>
                                        </>
                                    }
                                    secondary={
                                        <>
                                            <div className='tw:text-xs'>
                                                {
                                                    (() => {
                                                        // Prefer editable address first, then venue+city, then raw location
                                                        let location = '';
                                                        if (event.address) {
                                                            location = event.address;
                                                        } else if (event.venue) {
                                                            location = event.venue;
                                                            if (event.city) location += `, ${event.city}`;
                                                        } else {
                                                            location = event.location || 'No Location';
                                                        }
                                                        return location.length > maxLengthLocation ? `${location.slice(0, maxLengthLocation)}...` : location;
                                                    })()
                                                }

                                            </div>
                                            <div className='tw:text-xs tw:truncate'>
                                                {props.eventsType === "detectedEvents"
                                                    ? formatEventDateTime(event)
                                                    : `${formatDate(event.start)} - ${formatDate(event.end)}`
                                                }
                                            </div>
                                        </>
                                    } />


                                {props.eventsType === "detectedEvents" ? (
                                    <Stack direction="row" spacing={0.5} className='tw:invisible  tw:group-hover:visible tw:group-focus:visible tw:transition-opacity tw:duration-150 tw:opacity-0 tw:group-hover:opacity-100 tw:flex tw:items-center '>
                                        <Tooltip title={event.addedToCalendar ? "Already added to calendar" : "Add event to calendar"}>
                                            <span>
                                                <IconButton
                                                    disabled={addingIndex === index || event.addedToCalendar}
                                                    onClick={() => handleAddEventButtonClick(props.events[index], index)}
                                                >
                                                    <AddIcon fontSize='small' />
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        <Tooltip title="Edit event">
                                            <IconButton onClick={() => handleEditEventButtonClick(props.events[index], index)}>
                                                <EditCalendarIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip title='Delete event'>
                                            <IconButton onClick={() => handleDeleteEventButtonClick(index, "Event deleted!")}>
                                                <DeleteForeverIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                ) : (
                                    <Stack direction="row" spacing={0.5} className='tw:invisible  tw:group-hover:visible tw:group-focus:visible tw:transition-opacity tw:duration-150 tw:opacity-0 tw:group-hover:opacity-100 tw:flex tw:items-center '>
                                        <Tooltip title="Edit event in Google Calendar">
                                            <IconButton onClick={() => handleEditEventButtonClick(props.events[index], index)}>
                                                <EditCalendarIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>

                                        <Tooltip title='Delete event from Google Calendar'>
                                            <IconButton onClick={() => handleDeleteEventButtonClick(index, "Event deleted from calendar!")}>
                                                <DeleteForeverIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                )}
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