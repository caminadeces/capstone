package com.capstone.user_auth_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
/** Boots the Spring application and its authentication API. */
public class UserAuthServiceApplication {

	/** Starts the application using the supplied command-line arguments. */
	public static void main(String[] args) {
		SpringApplication.run(UserAuthServiceApplication.class, args);
	}

}
