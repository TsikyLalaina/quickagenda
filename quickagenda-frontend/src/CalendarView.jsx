import React, { useMemo } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

// Props:
// - eventDate: Date
// - sessions: [{ id, title, startTime?: 'HH:mm', endTime?: 'HH:mm', location?, startHour?, endHour? }]
// - onSessionUpdate: (id, startHour, endHour) => void
export default function CalendarView({ eventDate, sessions, onSessionUpdate, readOnly = false }) {
  const hours = useMemo(() => Array.from({ length: 13 }, (_, i) => 8 + i), []) // 8..20

  const title = useMemo(() => {
    if (!(eventDate instanceof Date) || isNaN(eventDate)) return 'Pick a date'
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(eventDate)
  }, [eventDate])

  const parseHour = (t) => {
    if (!t) return null
    const [h] = String(t).split(':').map(Number)
    return isNaN(h) ? null : h
  }

  const sessionHourRange = (s) => {
    const sh = s.startHour ?? parseHour(s.startTime)
    const eh = s.endHour ?? parseHour(s.endTime)
    return { sh, eh }
  }

  const byHour = useMemo(() => {
    const map = new Map(hours.map(h => [h, []]))
    sessions.forEach(s => {
      const { sh } = sessionHourRange(s)
      const bucket = map.get(sh)
      if (bucket) bucket.push(s)
    })
    return map
  }, [sessions, hours])

  const onDragEnd = (result) => {
    const { destination, draggableId } = result
    if (!destination) return
    const destHour = parseInt(destination.droppableId.replace('hour-', ''), 10)
    const session = sessions.find(s => String(s.id) === String(draggableId))
    if (!session) return
    const { sh, eh } = sessionHourRange(session)
    const duration = Math.max(1, (eh ?? sh ?? 9) - (sh ?? 9))
    const newStart = Math.min(20, Math.max(8, destHour))
    const newEnd = Math.min(20, newStart + duration)
    onSessionUpdate(session.id, newStart, newEnd)
  }

  const shell = (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
        <div>
          {hours.map(h => (
            <div key={`label-${h}`} style={{ height: 44, borderTop: '1px solid #f1f5f9', color: '#64748b' }}>
              {h <= 12 ? `${h} AM` : `${h - 12} PM`}
            </div>
          ))}
        </div>
        <div>
          {readOnly ? (
            hours.map(h => (
              <div key={`row-${h}`} style={{
                height: 44,
                borderTop: '1px solid #f1f5f9',
                padding: 4,
                display: 'flex',
                gap: 6,
                alignItems: 'stretch',
              }}>
                {(byHour.get(h) || []).map((s) => (
                  <div key={s.id} style={{
                    border: '1px solid #93c5fd',
                    background: '#dbeafe',
                    borderRadius: 6,
                    padding: '6px 8px',
                    minWidth: 140,
                  }} title={`${s.title}${s.location ? ' @ ' + s.location : ''}`}>
                    <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{s.title}</div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              {hours.map(h => (
                <Droppable droppableId={`hour-${h}`} key={`drop-${h}`} direction="vertical">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        height: 44,
                        borderTop: '1px solid #f1f5f9',
                        background: snapshot.isDraggingOver ? '#f0f9ff' : 'transparent',
                        padding: 4,
                        display: 'flex',
                        gap: 6,
                        alignItems: 'stretch',
                      }}
                    >
                      {(byHour.get(h) || []).map((s, idx) => (
                        <Draggable draggableId={String(s.id)} index={idx} key={s.id}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              style={{
                                ...prov.draggableProps.style,
                                border: '1px solid #93c5fd',
                                background: '#dbeafe',
                                borderRadius: 6,
                                padding: '6px 8px',
                                boxShadow: snap.isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
                                minWidth: 140,
                              }}
                              title={`${s.title}${s.location ? ' @ ' + s.location : ''}`}
                            >
                              <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{s.title}</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </DragDropContext>
          )}
        </div>
      </div>
    </div>
  )

  return shell
}
