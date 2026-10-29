package com.capstone.core_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
/** Bootstraps the Core Service Spring Boot application. */
public class CoreServiceApplication {

    /** Starts the embedded server and Spring application context. */
    public static void main(String[] args) {
        SpringApplication.run(CoreServiceApplication.class, args);
    }

}
