import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

const DebugPanel = () => {
    const [lastPageExtraction, setLastPageExtraction] = useState(null);
    const [lastModelResultHistory, setLastModelResultHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadData = () => {
        setLoading(true);
        chrome.storage.local.get(['lastPageExtraction', 'lastModelResultHistory'], (res) => {
            setLastPageExtraction(res?.lastPageExtraction ?? null);
            setLastModelResultHistory(res?.lastModelResultHistory ?? []);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
    }, []);

    const clearHistory = () => {
        chrome.storage.local.remove(['lastPageExtraction', 'lastModelResultHistory'], () => {
            loadData();
        });
    };

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button variant="outlined" size="small" onClick={loadData}>Refresh</Button>
                <Button variant="outlined" color="error" size="small" onClick={clearHistory}>Clear</Button>
            </Box>

            <Divider sx={{ mb: 1 }} />

            <Typography variant="subtitle2">Last Page Extraction</Typography>
            {loading ? <Typography variant="body2">Loading...</Typography> : (
                lastPageExtraction ? (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">Timestamp: {new Date(lastPageExtraction.timestamp).toLocaleString()}</Typography>
                        <List dense>
                            <ListItem>
                                <ListItemText primary={`Type: ${lastPageExtraction.payload?.type ?? 'unknown'}`} secondary={Array.isArray(lastPageExtraction.payload?.items) ? `Items: ${lastPageExtraction.payload.items.length}` : ''} />
                            </ListItem>

                            {Array.isArray(lastPageExtraction.payload?.items) ? (
                                lastPageExtraction.payload.items.map((it, idx) => (
                                    <ListItem key={idx} sx={{ pl: 0 }}>
                                        <ListItemText primary={it?.title || it?.text || `Item ${idx + 1}`} secondary={JSON.stringify(it).slice(0, 200)} />
                                    </ListItem>
                                ))
                            ) : (
                                // If items is present but not an array, show its JSON representation
                                lastPageExtraction.payload?.items && (
                                    <ListItem>
                                        <ListItemText primary={JSON.stringify(lastPageExtraction.payload.items).slice(0, 1000)} />
                                    </ListItem>
                                )
                            )}

                            {!lastPageExtraction.payload?.items && lastPageExtraction.raw && (
                                <ListItem>
                                    <ListItemText primary={lastPageExtraction.raw.slice(0, 1000)} />
                                </ListItem>
                            )}
                        </List>
                    </Box>
                ) : (
                    <Typography variant="body2">No page extraction saved yet.</Typography>
                )
            )}

            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2">Model Result History</Typography>
            {lastModelResultHistory?.length ? (
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {lastModelResultHistory.slice().reverse().map((h, i) => (
                        <ListItem key={i} alignItems="flex-start">
                            <ListItemText
                                primary={`[${new Date(h.timestamp).toLocaleString()}] ${h.inputPreview?.slice(0, 60) || ''}`}
                                secondary={JSON.stringify(h.result).slice(0, 300)}
                            />
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography variant="body2">No model history yet.</Typography>
            )}
        </Box>
    );
};

export default DebugPanel;
