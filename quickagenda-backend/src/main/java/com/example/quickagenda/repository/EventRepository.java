package com.example.quickagenda.repository;

import com.example.quickagenda.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {
    Optional<Event> findByShareCode(String code);
}
