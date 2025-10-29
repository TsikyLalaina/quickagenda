import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import CalendarView from './CalendarView'

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
  const qrRef = useRef(null)

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

  // Load qrcode.js from CDN once and render QR
  useEffect(() => {
    if (!qrRef.current) return
    const ensureScript = () => new Promise((resolve, reject) => {
      if (window.QRCode) return resolve()
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('Failed to load QR lib'))
      document.body.appendChild(s)
    })
    ensureScript().then(() => {
      if (!qrRef.current) return
      qrRef.current.innerHTML = ''
      // eslint-disable-next-line no-new
      new window.QRCode(qrRef.current, {
        text: shareUrl,
        width: 128,
        height: 128,
      })
    }).catch(() => {})
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

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>
  if (error) return <div style={{ padding: 16, color: 'crimson' }}>Error: {error}</div>
  if (!event) return <div style={{ padding: 16 }}>Not found</div>

  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0 }}>{event.name}</h1>
        <div style={{ color: '#64748b', marginBottom: 12 }}>{formatFullDate(eventDateObj)}</div>
        <CalendarView eventDate={eventDateObj} sessions={sessionsForView} readOnly />
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href={googleLink || '#'} target="_blank" rel="noreferrer">
            <button disabled={!googleLink}>Add to Google Calendar</button>
          </a>
          <a href={`/api/events/${event.shareCode}.ics`}>
            <button>Download .ics</button>
          </a>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Share</div>
            <div ref={qrRef} />
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{shareUrl}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
