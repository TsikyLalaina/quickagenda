package com.example.quickagenda.service;

import com.example.quickagenda.dto.EventCreateRequest;
import com.example.quickagenda.dto.EventDetailResponse;
import com.example.quickagenda.dto.SessionCreateRequest;
import com.example.quickagenda.dto.SessionResponse;
import com.example.quickagenda.dto.SessionTimeUpdateRequest;
import com.example.quickagenda.entity.Event;
import com.example.quickagenda.entity.Session;
import com.example.quickagenda.repository.EventRepository;
import com.example.quickagenda.repository.SessionRepository;
import net.fortuna.ical4j.data.CalendarOutputter;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.DateTime;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.CalScale;
import net.fortuna.ical4j.model.property.Location;
import net.fortuna.ical4j.model.property.ProdId;
import net.fortuna.ical4j.model.property.Version;
import org.apache.commons.text.RandomStringGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final SessionRepository sessionRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public EventService(EventRepository eventRepository, SessionRepository sessionRepository) {
        this.eventRepository = eventRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    public Event createEvent(EventCreateRequest request) {
        Event event = new Event();
        event.setName(request.getName());
        event.setEventDate(request.getEventDate());
        event.setShareCode(generateShareCode());

        Event savedEvent = eventRepository.save(event);

        List<Session> toSave = new ArrayList<>();
        if (request.getSessions() != null) {
            LocalDate date = request.getEventDate();
            for (SessionCreateRequest s : request.getSessions()) {
                Session sess = new Session();
                sess.setTitle(s.getTitle());
                sess.setLocation(s.getLocation());
                LocalDateTime start = LocalDateTime.of(date, LocalTime.parse(s.getStart(), TIME_FMT));
                LocalDateTime end = LocalDateTime.of(date, LocalTime.parse(s.getEnd(), TIME_FMT));
                sess.setStartTime(start);
                sess.setEndTime(end);
                sess.setEvent(savedEvent);
                toSave.add(sess);
            }
            if (!toSave.isEmpty()) {
                sessionRepository.saveAll(toSave);
            }
        }

        return savedEvent;
    }

    public EventDetailResponse getEventByShareCode(String code) {
        Event event = eventRepository.findByShareCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<Session> sessions = sessionRepository.findByEvent(event);
        return toDetailResponse(event, sessions);
    }

    public byte[] buildIcsByShareCode(String code) {
        Event event = eventRepository.findByShareCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<Session> sessions = sessionRepository.findByEvent(event);

        Calendar calendar = new Calendar();
        calendar.getProperties().add(new ProdId("-//Quickagenda//iCal4j//EN"));
        calendar.getProperties().add(Version.VERSION_2_0);
        calendar.getProperties().add(CalScale.GREGORIAN);

        ZoneId zone = ZoneId.systemDefault();
        for (Session s : sessions) {
            ZonedDateTime zStart = s.getStartTime().atZone(zone);
            ZonedDateTime zEnd = s.getEndTime().atZone(zone);
            DateTime dtStart = new DateTime(java.util.Date.from(zStart.toInstant()));
            DateTime dtEnd = new DateTime(java.util.Date.from(zEnd.toInstant()));

            VEvent vevent = new VEvent(dtStart, dtEnd, s.getTitle());
            if (s.getLocation() != null && !s.getLocation().isBlank()) {
                vevent.getProperties().add(new Location(s.getLocation()));
            }
            calendar.getComponents().add(vevent);
        }

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            new CalendarOutputter().output(calendar, baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate calendar");
        }
    }

    private EventDetailResponse toDetailResponse(Event event, List<Session> sessions) {
        List<SessionResponse> sessionDtos = sessions.stream().map(s -> new SessionResponse(
                s.getId(),
                s.getTitle(),
                s.getStartTime(),
                s.getEndTime(),
                s.getLocation()
        )).collect(Collectors.toList());
        return new EventDetailResponse(event.getId(), event.getName(), event.getEventDate(), event.getShareCode(), sessionDtos);
    }

    @Transactional
    public void updateSessionTimes(String code, Long sessionId, SessionTimeUpdateRequest body) {
        Event event = eventRepository.findByShareCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (session.getEvent() == null || !session.getEvent().getId().equals(event.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        LocalDate date = event.getEventDate();
        LocalDateTime start = LocalDateTime.of(date, LocalTime.parse(body.getStart(), TIME_FMT));
        LocalDateTime end = LocalDateTime.of(date, LocalTime.parse(body.getEnd(), TIME_FMT));

        sessionRepository.updateSessionTimes(sessionId, start, end);
    }
    private String generateShareCode() {
        RandomStringGenerator gen = new RandomStringGenerator.Builder()
                .withinRange('0', 'z')
                .filteredBy(Character::isLetterOrDigit)
                .build();
        return gen.generate(6).toUpperCase();
    }
}
