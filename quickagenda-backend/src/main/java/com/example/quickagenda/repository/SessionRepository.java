package com.example.quickagenda.repository;

import com.example.quickagenda.entity.Event;
import com.example.quickagenda.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    List<Session> findByEvent(Event event);

    @Modifying
    @Transactional
    @Query("UPDATE Session s SET s.startTime = :start, s.endTime = :end WHERE s.id = :id")
    void updateSessionTimes(@Param("id") Long id,
                            @Param("start") LocalDateTime start,
                            @Param("end") LocalDateTime end);
}
