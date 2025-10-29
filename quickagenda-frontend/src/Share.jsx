import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import CalendarView from './CalendarView'
import QRCode from 'qrcode'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import DownloadIcon from '@mui/icons-material/Download'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import HomeIcon from '@mui/icons-material/Home'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import Tooltip from '@mui/material/Tooltip'
import { useThemeMode } from './theme.jsx'

function formatFullDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return ''
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(d)
}

function toHour(str) {
  if (!str) return null
  try {
    // Accepts 'HH:mm' or ISO like '2025-10-29T15:00:00'
    const h = str.length >= 13 && str.includes('T') ? Number(str.substring(11, 13)) : Number(str.split(':')[0])
    return isNaN(h) ? null : h
  } catch {
    return null
  }
}

export default function Share() {
  const { code } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [event, setEvent] = useState(null)
  const [qrSrc, setQrSrc] = useState('')
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => `${window.location.origin}/s/${code}`, [code])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/events/${code}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then(data => { if (active) { setEvent(data); setError(null) } })
      .catch(err => { if (active) setError(err?.message || 'Error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [code])

  // Render QR code using npm 'qrcode': prefer Data URL (<img>) for reliability
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const darkBG = '#111827' // slate-900
    const lightBG = '#ffffff'
    const opts = prefersDark
      ? { width: 160, color: { dark: '#ffffff', light: darkBG } }
      : { width: 160, color: { dark: '#000000', light: lightBG } }

    // Generate Data URL; if it fails we'll show external fallback
    QRCode.toDataURL(shareUrl, opts)
      .then((url) => {
        setQrSrc(url)
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('QR data URL generation failed', err)
      })
  }, [shareUrl])

  const eventDateObj = useMemo(() => event?.eventDate ? new Date(event.eventDate) : null, [event])

  const sessionsForView = useMemo(() => {
    const arr = event?.sessions || []
    return arr.map(s => ({
      id: s.id,
      title: s.title,
      location: s.location,
      startHour: toHour(s.startTime),
      endHour: toHour(s.endTime),
    }))
  }, [event])

  const firstSession = (event?.sessions && event.sessions[0]) || null
  const googleLink = useMemo(() => {
    if (!event || !eventDateObj || !firstSession) return null
    const pad = (n) => String(n).padStart(2, '0')
    const toDateTime = (isoDate, hhmmIso) => {
      const hh = toHour(hhmmIso) ?? 9
      const start = new Date(`${isoDate}T${pad(hh)}:00:00`)
      // Google needs YYYYMMDDTHHmmssZ or local without timezone. Use local naive.
      const y = start.getFullYear()
      const m = pad(start.getMonth() + 1)
      const d = pad(start.getDate())
      const H = pad(start.getHours())
      const M = pad(start.getMinutes())
      const S = '00'
      return `${y}${m}${d}T${H}${M}${S}`
    }
    const start = toDateTime(event.eventDate, firstSession.startTime)
    // derive end by end hour
    const end = toDateTime(event.eventDate, firstSession.endTime)
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.name || 'Event',
      dates: `${start}/${end}`,
      details: `${window.location.origin}/s/${event.shareCode}`,
    })
    return `https://www.google.com/calendar/render?${params.toString()}`
  }, [event, eventDateObj, firstSession])

  if (loading) return <Container sx={{ py: 4 }}>Loading…</Container>
  if (error) return <Container sx={{ py: 4 }}><Typography color="error">Error: {error}</Typography></Container>
  if (!event) return <Container sx={{ py: 4 }}>Not found</Container>

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <CalendarMonthIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Quickagenda</Typography>
          {(() => { const { mode, toggle } = useThemeMode(); return (
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton aria-label="Toggle theme" color="inherit" onClick={toggle} size="large" sx={{ mr: 1 }}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          )})()}
          <Button color="inherit" startIcon={<HomeIcon />} href="/">Create your own</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>{event.name}</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatFullDate(eventDateObj)}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <CalendarView eventDate={eventDateObj} sessions={sessionsForView} readOnly />
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Actions</Typography>
                  <Stack spacing={1}>
                    <Button variant="contained" startIcon={<CalendarMonthIcon />} href={googleLink || '#'} target="_blank" disabled={!googleLink} fullWidth>
                      Add to Google Calendar
                    </Button>
                    <Button variant="outlined" startIcon={<DownloadIcon />} href={`/api/events/${event.shareCode}.ics`} fullWidth>
                      Download .ics
                    </Button>
                    <Button variant="text" startIcon={<HomeIcon />} href="/" fullWidth>
                      Create your own event
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom><QrCode2Icon sx={{ mr: 1, verticalAlign: 'middle' }} />Share</Typography>
                  <Stack alignItems="center" spacing={1}>
                    <img
                      src={qrSrc || `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
                      alt="QR code"
                      style={{ width: 160, height: 160 }}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                      <TextField value={shareUrl} fullWidth size="small" InputProps={{ readOnly: true }} />
                      <IconButton color="primary" onClick={async () => {
                        try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch {}
                      }}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>How it works</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Share this page with your guests. They can view the agenda and add sessions to their calendars. You can also download an .ics file for a one-time import.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity="success" sx={{ width: '100%' }}>Link copied</Alert>
      </Snackbar>
    </>
  )
}
