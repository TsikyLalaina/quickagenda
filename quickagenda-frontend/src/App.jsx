import { useState } from 'react'
import './App.css'
import CalendarView from './CalendarView'

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

  const isCreated = !!shareCode

  const addToCalendar = () => {
    if (!eventDate || !sessionTitle) return
    const start = '09:00'
    const end = hhmmAdd(start, Number(duration))
    if (!isCreated) {
      const id = `tmp-${Date.now()}`
      setLocalSessions((prev) => [...prev, { id, title: sessionTitle, startTime: start, endTime: end, location: '' }])
      setSessionTitle('')
    } else {
      // Event already created: we currently don't have an API to add sessions.
      // Inform user to use Create Event before or implement add-session later.
      alert('Event already created. Adding new sessions after creation is not supported yet.')
    }
  }

  const createEvent = async () => {
    if (!name || !eventDate) {
      alert('Please enter event name and date')
      return
    }
    if (localSessions.length === 0) {
      alert('Please add at least one session')
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
      alert(`Event created! Share code: ${created.shareCode}`)
    } catch (e) {
      console.error(e)
      alert('Error creating event')
    }
  }

  const hh = (n) => String(n).padStart(2, '0')
  const toHHmmFromHour = (h) => `${hh(h)}:00`

  const handleSessionTimeChange = async (id, newStart, newEnd) => {
    if (!isCreated) {
      // Update local only
      setLocalSessions((prev) => prev.map(s => s.id === id ? { ...s, startTime: newStart, endTime: newEnd } : s))
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
    } catch (e) {
      console.error(e)
      alert('Error updating session time')
    }
  }

  const handleSessionUpdateByHour = (id, startHour, endHour) => {
    const start = toHHmmFromHour(startHour)
    const end = toHHmmFromHour(endHour)
    return handleSessionTimeChange(id, start, end)
  }

  const getShareLink = () => {
    if (!shareCode) {
      alert('Create the event first')
      return
    }
    alert(`/s/${shareCode}`)
  }

  const sessionsForView = (isCreated ? serverSessions : localSessions).map(s => {
    const [sh] = (s.startTime || '').split(':').map(Number)
    const [eh] = (s.endTime || '').split(':').map(Number)
    return { ...s, startHour: sh, endHour: eh }
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Event name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="BBQ" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Event date</label>
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={{ width: '100%' }} />
        </div>
        <hr />
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Title</label>
          <input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="Cake" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: '100%' }}>
            <option value={30}>30 min</option>
            <option value={60}>1 h</option>
            <option value={120}>2 h</option>
          </select>
        </div>
        <button onClick={addToCalendar}>Add to Calendar (9:00)</button>
        <button onClick={createEvent} disabled={isCreated}>Create Event</button>
        <button onClick={getShareLink} disabled={!isCreated}>Get Share Link</button>
        {isCreated && <div style={{ color: '#0a7', fontSize: 12 }}>Share code: {shareCode}</div>}
      </div>

      <div>
        <CalendarView
          eventDate={eventDate ? new Date(eventDate) : null}
          sessions={sessionsForView}
          onSessionUpdate={handleSessionUpdateByHour}
        />
      </div>
    </div>
  )
}

export default App
