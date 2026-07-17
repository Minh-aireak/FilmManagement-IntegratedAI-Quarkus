FROM maven:3-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
COPY api_gateway/pom.xml api_gateway/
COPY identity_service/pom.xml identity_service/
COPY movie_service/pom.xml movie_service/
COPY ticket_service/pom.xml ticket_service/
RUN mvn -pl movie_service dependency:go-offline -B
COPY movie_service/src movie_service/src
RUN mvn -pl movie_service package -DskipTests -Dquarkus.profile=prod -Dquarkus.devservices.enabled=false

FROM eclipse-temurin:25-jre
WORKDIR /deployments
COPY --from=build /app/movie_service/target/quarkus-app/lib/ /deployments/lib/
COPY --from=build /app/movie_service/target/quarkus-app/*.jar /deployments/
COPY --from=build /app/movie_service/target/quarkus-app/app/ /deployments/app/
COPY --from=build /app/movie_service/target/quarkus-app/quarkus/ /deployments/quarkus/
EXPOSE 8081
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]
