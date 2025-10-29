package com.example.quickagenda.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Feedback {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2000)
    private String text;

    private String source; // e.g. "app" | "share"

    private String userAgent;

    private String shareCode; // optional, if coming from a specific shared page

    @Column(columnDefinition = "timestamptz")
    private OffsetDateTime createdAt;
}
