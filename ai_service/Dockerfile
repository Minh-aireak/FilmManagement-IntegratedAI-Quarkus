FROM maven:3-eclipse-temurin-21 AS build
WORKDIR /app

# Copy root pom and all module poms so Maven can resolve dependencies
COPY pom.xml .
COPY api_gateway/pom.xml api_gateway/
COPY identity_service/pom.xml identity_service/
COPY movie_service/pom.xml movie_service/
COPY ticket_service/pom.xml ticket_service/
COPY ai_service/pom.xml ai_service/

# Pre-fetch dependencies for the ai_service module
RUN mvn -pl ai_service dependency:go-offline -B

# Copy module source and build
COPY ai_service/src ai_service/src
RUN mvn -pl ai_service package -DskipTests -Dquarkus.profile=prod -Dquarkus.devservices.enabled=false

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /deployments

# Copy Quarkus application layout produced by the build
COPY --from=build /app/ai_service/target/quarkus-app/lib/ /deployments/lib/
COPY --from=build /app/ai_service/target/quarkus-app/*.jar /deployments/
COPY --from=build /app/ai_service/target/quarkus-app/app/ /deployments/app/
COPY --from=build /app/ai_service/target/quarkus-app/quarkus/ /deployments/quarkus/

EXPOSE 8083
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]

