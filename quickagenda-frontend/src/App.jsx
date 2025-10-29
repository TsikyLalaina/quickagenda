import { useEffect, useState } from 'react'
import './App.css'
import CalendarView from './CalendarView'
import Container from '@mui/material/Container'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SendIcon from '@mui/icons-material/Send'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeMode } from './theme.jsx'

function hhmmAdd(start, minutes) {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60)
  const nm = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.max(0, Math.min(23, nh)))}:${pad(Math.max(0, Math.min(59, nm)))}`
}

function App() {
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('') // YYYY-MM-DD
  const [sessionTitle, setSessionTitle] = useState('')
  const [duration, setDuration] = useState(60) // minutes
  const [localSessions, setLocalSessions] = useState([]) // before event is created
  const [shareCode, setShareCode] = useState(null)
  const [serverSessions, setServerSessions] = useState([]) // after event is created
  const [notice, setNotice] = useState({ type: null, text: '' }) // type: 'success' | 'error' | 'info'
  const [feedbackInput, setFeedbackInput] = useState('')
  const [feedbackList, setFeedbackList] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const FEEDBACK_MAX = 300

  const loadFeedback = async () => {
    try {
      setFeedbackLoading(true)
      const res = await fetch('/api/feedback')
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setFeedbackList(data || [])
    } catch (e) {
      // ignore
    } finally { setFeedbackLoading(false) }
  }

  useEffect(() => { loadFeedback() }, [])

  const isCreated = !!shareCode

  const addToCalendar = () => {
    if (!eventDate || !sessionTitle) return
    const start = '09:00'
    const end = hhmmAdd(start, Number(duration))
    if (!isCreated) {
      const id = `tmp-${Date.now()}`
      setLocalSessions((prev) => [...prev, { id, title: sessionTitle, startTime: start, endTime: end, location: '' }])
      setSessionTitle('')
      setNotice({ type: 'success', text: 'Session added to calendar draft' })
    } else {
      // Event already created: we currently don't have an API to add sessions.
      setNotice({ type: 'info', text: 'Adding new sessions after creation is not supported yet.' })
    }
  }

  const createEvent = async () => {
    if (!name || !eventDate) {
      setNotice({ type: 'error', text: 'Please enter event name and date' })
      return
    }
    const todayStr = new Date().toISOString().split('T')[0]
    if (eventDate < todayStr) {
      setNotice({ type: 'error', text: 'Event date cannot be in the past' })
      return
    }
    if (localSessions.length === 0) {
      setNotice({ type: 'error', text: 'Please add at least one session' })
      return
    }
    try {
      const body = {
        name,
        eventDate,
        sessions: localSessions.map((s) => ({ title: s.title, start: s.startTime, end: s.endTime, location: s.location || '' }))
      }
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to create event')
      const created = await res.json()
      setShareCode(created.shareCode)
      // Load sessions with IDs
      const detailsRes = await fetch(`/api/events/${created.shareCode}`)
      if (!detailsRes.ok) throw new Error('Failed to load created event details')
      const details = await detailsRes.json()
      setServerSessions(details.sessions || [])
      setLocalSessions([])
      setNotice({ type: 'success', text: `Event created! Share code: ${created.shareCode}` })
    } catch (e) {
      console.error(e)
      setNotice({ type: 'error', text: 'Error creating event' })
    }
  }

  const hh = (n) => String(n).padStart(2, '0')
  const toHHmmFromHour = (h) => `${hh(h)}:00`

  const handleSessionTimeChange = async (id, newStart, newEnd) => {
    if (!isCreated) {
      // Update local only
      setLocalSessions((prev) => prev.map(s => s.id === id ? { ...s, startTime: newStart, endTime: newEnd } : s))
      setNotice({ type: 'success', text: 'Session time updated' })
      return
    }
    try {
      const res = await fetch(`/api/events/${shareCode}/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: newStart, end: newEnd })
      })
      if (!res.ok) throw new Error('Failed to update session times')
      setServerSessions((prev) => prev.map(s => s.id === id ? { ...s, startTime: newStart, endTime: newEnd } : s))
      setNotice({ type: 'success', text: 'Session time saved' })
    } catch (e) {
      console.error(e)
      setNotice({ type: 'error', text: 'Error updating session time' })
    }
  }

  const handleSessionUpdateByHour = (id, startHour, endHour) => {
    const start = toHHmmFromHour(startHour)
    const end = toHHmmFromHour(endHour)
    return handleSessionTimeChange(id, start, end)
  }

  const getShareLink = async () => {
    if (!shareCode) {
      setNotice({ type: 'info', text: 'Create the event first' })
      return
    }
    const absolute = `${window.location.origin}/s/${shareCode}`
    try {
      await navigator.clipboard.writeText(absolute)
      setNotice({ type: 'success', text: 'Share link copied to clipboard' })
    } catch {
      setNotice({ type: 'info', text: absolute })
    }
  }

  const sessionsForView = (isCreated ? serverSessions : localSessions).map(s => {
    const [sh] = (s.startTime || '').split(':').map(Number)
    const [eh] = (s.endTime || '').split(':').map(Number)
    return { ...s, startHour: sh, endHour: eh }
  })

  return (
    <>
      <AppBar position="static" color="primary">
        <Toolbar>
          <CalendarMonthIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Quickagenda
          </Typography>
          {/* Theme toggle */}
          {(() => { const { mode, toggle } = useThemeMode(); return (
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton aria-label="Toggle theme" color="inherit" onClick={toggle} size="large" sx={{ mr: 1 }}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          )})()}
          <IconButton aria-label="Copy share link" color="inherit" onClick={getShareLink} disabled={!isCreated} size="large">
            <ContentCopyIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Create event</Typography>
                  <Stack spacing={2}>
                    <TextField label="Event name" value={name} onChange={(e) => setName(e.target.value)} placeholder="BBQ" fullWidth />
                    <TextField label="Event date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} inputProps={{ min: new Date().toISOString().split('T')[0] }} fullWidth InputLabelProps={{ shrink: true }} />
                    <Divider />
                    <TextField label="Session title" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="Cake" fullWidth />
                    <FormControl fullWidth>
                      <InputLabel id="duration-label">Duration</InputLabel>
                      <Select labelId="duration-label" label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                        <MenuItem value={30}>30 min</MenuItem>
                        <MenuItem value={60}>1 h</MenuItem>
                        <MenuItem value={120}>2 h</MenuItem>
                      </Select>
                    </FormControl>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={addToCalendar} fullWidth>
                        Add to Calendar (9:00)
                      </Button>
                      <Button variant="contained" startIcon={<EventAvailableIcon />} onClick={createEvent} disabled={isCreated} fullWidth>
                        Create Event
                      </Button>
                    </Stack>
                    {isCreated && (
                      <Typography variant="caption" color="success.main">Share code: {shareCode}</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom><InfoOutlinedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />How it works</Typography>
                  <List dense>
                    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Enter an event name and pick a date (today or later)." /></ListItem>
                    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Add one or more sessions; adjust times later if needed." /></ListItem>
                    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Create the event to get a shareable link." /></ListItem>
                    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Share the link or QR so guests can add to their calendars." /></ListItem>
                  </List>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Feedback</Typography>
                  <Stack spacing={1}>
                    <TextField
                      label="Suggest a feature…"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      multiline rows={3} fullWidth
                      helperText={`${Math.min(feedbackInput.length, FEEDBACK_MAX)}/${FEEDBACK_MAX}`}
                      error={feedbackInput.length > FEEDBACK_MAX}
                    />
                    <Button variant="contained" startIcon={<SendIcon />} disabled={feedbackSubmitting || feedbackInput.trim().length === 0 || feedbackInput.length > FEEDBACK_MAX} onClick={async () => {
                      const text = (feedbackInput || '').trim()
                      if (!text) return
                      try {
                        setFeedbackSubmitting(true)
                        const res = await fetch('/api/feedback', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source: 'app' })
                        })
                        if (!res.ok) throw new Error('submit failed')
                        setFeedbackInput('')
                        setNotice({ type: 'success', text: 'Thanks for your feedback!' })
                        loadFeedback()
                      } catch (e) {
                        setNotice({ type: 'error', text: 'Could not submit feedback' })
                      } finally { setFeedbackSubmitting(false) }
                    }}>
                      Submit feedback
                    </Button>
                  </Stack>
                  {feedbackLoading && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={1}>
                        <Skeleton variant="text" height={24} />
                        <Skeleton variant="text" height={24} />
                        <Skeleton variant="text" height={24} />
                      </Stack>
                    </>
                  )}
                  {!feedbackLoading && feedbackList.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <List dense>
                        {feedbackList.map(f => (
                          <ListItem key={f.id} alignItems="flex-start">
                            <ListItemIcon><ChatBubbleOutlineIcon /></ListItemIcon>
                            <ListItemText primary={f.text} secondary={f.createdAt ? new Date(f.createdAt).toLocaleString() : null} />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Calendar preview</Typography>
                <CalendarView
                  eventDate={eventDate ? new Date(eventDate) : null}
                  sessions={sessionsForView}
                  onSessionUpdate={handleSessionUpdateByHour}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={!!notice.type}
        autoHideDuration={4000}
        onClose={() => setNotice({ type: null, text: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {notice.type && (
          <Alert severity={notice.type} onClose={() => setNotice({ type: null, text: '' })} sx={{ width: '100%' }}>
            {notice.text}
          </Alert>
        )}
      </Snackbar>
    </>
  )
}

export default App
