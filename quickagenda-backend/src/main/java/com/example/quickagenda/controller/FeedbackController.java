package com.example.quickagenda.controller;

import com.example.quickagenda.entity.Feedback;
import com.example.quickagenda.repository.FeedbackRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;

    public FeedbackController(FeedbackRepository feedbackRepository) {
        this.feedbackRepository = feedbackRepository;
    }

    @PostMapping
    public ResponseEntity<Feedback> submit(@RequestBody Feedback body, @RequestHeader(value = "User-Agent", required = false) String ua) {
        if (body.getText() == null || body.getText().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        body.setId(null);
        body.setCreatedAt(OffsetDateTime.now());
        if (ua != null && (body.getUserAgent() == null || body.getUserAgent().isBlank())) {
            body.setUserAgent(ua);
        }
        Feedback saved = feedbackRepository.save(body);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @GetMapping
    public List<Feedback> list() {
        return feedbackRepository.findRecent();
    }
}
