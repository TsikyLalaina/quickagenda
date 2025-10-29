package com.example.quickagenda.repository;

import com.example.quickagenda.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    @Query("select f from Feedback f order by f.createdAt desc")
    List<Feedback> findRecent();
}
