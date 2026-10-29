package com.capstone.core_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Configures the API's OpenAPI metadata and JWT bearer authentication scheme. */
@Configuration
public class OpenApiConfig {
    /** Creates the OpenAPI document metadata and bearer token security definition. */
    @Bean
    public OpenAPI coreServiceOpenAPI() {
        return new OpenAPI()
                .info(
                        new Info()
                                .title("Core Service API")
                                .description(
                                "REST API for authentication, recipes, meal plans, and grocery "
                                        + "lists. Protected endpoints require a JWT bearer token "
                                        + "obtained from /api/auth/register or /api/auth/login.")
                                .version("v1"))
                .schemaRequirement(
                        "bearerAuth",
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT"));
    }
}
