import { useState } from 'react';
import './EditPaper.css';

import dayjs from 'dayjs';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";

export default function EditPaper({ eventData, onClose, onSave }) {
    // Helper to safely build dayjs from separate date & time
    const makeDateTime = (dateStr, timeStr) => {
        if (!dateStr) return dayjs();
        // If time missing, default to 00:00 so DatePicker still reflects the date
        const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00`;
        const d = dayjs(iso);
        return d.isValid() ? d : dayjs();
    };

    const [editedEvent, setEditedEvent] = useState(eventData);

    return (
        <div className='edit-paper-container'>
            <div className='edit-paper-label'>Title</div>
            <input
                className='edit-paper-title-input'
                type='text'
                placeholder="Enter the event title"
                // onChange={e => setTitleInput(e.target.value)}
                onChange={e => setEditedEvent({ ...editedEvent, title: e.target.value })}
                value={editedEvent.title}
            />
            <div className='edit-paper-label'>Address/Location</div>
            <input
                className='edit-paper-title-input'
                type='text'
                placeholder="Enter the event title"
                // onChange={e => setTitleInput(e.target.value)}
                onChange={e => setEditedEvent({ ...editedEvent, address: e.target.value })}
                value={editedEvent.address}
            />
            <div className='edit-paper-label'>Start Date</div>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    className='edit-paper-date-picker'
                    label="Start Date"
                    value={dayjs(editedEvent.startDate)}
                    onChange={(newValue) => setEditedEvent({ ...editedEvent, startDate: dayjs(newValue).format('YYYY-MM-DD') })}
                    slotProps={{
                        textField: {
                            size: "small",
                            fullWidth: true,
                        },
                    }}
                />
            </LocalizationProvider>
            <div className='edit-paper-label'>End Date</div>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    className='edit-paper-date-picker'
                    label="End Date"
                    value={dayjs(editedEvent.endDate || editedEvent.startDate)}
                    onChange={(newValue) => setEditedEvent({ ...editedEvent, endDate: dayjs(newValue).format('YYYY-MM-DD') })}
                    slotProps={{
                        textField: {
                            size: "small",
                            fullWidth: true,
                        },
                    }}
                />
            </LocalizationProvider>
            <div className='edit-paper-label'>Time</div>
            <div className='edit-paper-time-container'>
                <div>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                            label="Start Time"
                            value={makeDateTime(editedEvent?.startDate, editedEvent?.startTime)}
                            onChange={(newValue) => {
                                setEditedEvent({
                                    ...editedEvent,
                                    startTime: dayjs(newValue).format("HH:mm")
                                });
                            }}
                            ampm
                            slotProps={{
                                textField: {
                                    size: "small",
                                    fullWidth: true,
                                },
                            }}
                        />
                    </LocalizationProvider>
                </div>
                <div>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                            label="End Time"
                            value={makeDateTime(editedEvent?.endDate ?? editedEvent?.startDate, editedEvent?.endTime)}
                            onChange={(newValue) => {
                                setEditedEvent({
                                    ...editedEvent,
                                    endTime: dayjs(newValue).format("HH:mm")
                                });
                            }}
                            ampm
                            slotProps={{
                                textField: {
                                    size: "small",
                                    fullWidth: true,
                                },
                            }}
                        />
                    </LocalizationProvider>
                </div>
            </div>
            <div className='edit-paper-label'>Description</div>
            <textarea
                className='edit-paper-textarea'
                placeholder='Description of the event'
                onChange={e => setEditedEvent({ ...editedEvent, notes: e.target.value })}
                value={editedEvent.notes}
            />
            <div className='edit-paper-button-container'>
                <button id="cancel-button" onClick={() => onClose()}>Cancel</button>
                <button id="save-button" onClick={() => onSave(editedEvent)}>Save</button>
            </div>
        </div>
    );
};
