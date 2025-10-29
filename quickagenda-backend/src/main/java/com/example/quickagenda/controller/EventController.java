package com.example.quickagenda.controller;

import com.example.quickagenda.dto.EventCreateRequest;
import com.example.quickagenda.dto.EventDetailResponse;
import com.example.quickagenda.dto.SessionTimeUpdateRequest;
import com.example.quickagenda.entity.Event;
import com.example.quickagenda.service.EventService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<Event> create(@RequestBody EventCreateRequest request) {
        Event created = eventService.createEvent(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/{code}")
    public ResponseEntity<EventDetailResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(eventService.getEventByShareCode(code));
    }

    @GetMapping(value = "/{code}.ics", produces = "text/calendar")
    public ResponseEntity<byte[]> getIcs(@PathVariable String code) {
        byte[] ics = eventService.buildIcsByShareCode(code);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar; charset=UTF-8"));
        headers.setContentDisposition(ContentDisposition.attachment().filename(code + ".ics").build());
        return new ResponseEntity<>(ics, headers, HttpStatus.OK);
    }

    @PatchMapping("/{code}/sessions/{id}")
    public ResponseEntity<Void> updateSessionTimes(@PathVariable String code,
                                                   @PathVariable("id") Long sessionId,
                                                   @RequestBody SessionTimeUpdateRequest body) {
        eventService.updateSessionTimes(code, sessionId, body);
        return ResponseEntity.ok().build();
    }
}
