# Build stage
FROM maven:3-eclipse-temurin-25 AS build
WORKDIR /app

# 1. Copy root pom.xml
COPY pom.xml .

# 2. Copy all module poms
COPY api_gateway/pom.xml api_gateway/
COPY identity_service/pom.xml identity_service/
COPY movie_service/pom.xml movie_service/
COPY ticket_service/pom.xml ticket_service/

# 3. Pre-fetch dependencies
RUN mvn -pl api_gateway dependency:go-offline -B

# 4. Copy source code
COPY api_gateway/src api_gateway/src

# 5. Build
RUN mvn -pl api_gateway package -DskipTests -Dquarkus.profile=prod -Dquarkus.devservices.enabled=false

# Run stage
FROM eclipse-temurin:25-jre
WORKDIR /deployments
COPY --from=build /app/api_gateway/target/quarkus-app/lib/ /deployments/lib/
COPY --from=build /app/api_gateway/target/quarkus-app/*.jar /deployments/
COPY --from=build /app/api_gateway/target/quarkus-app/app/ /deployments/app/
COPY --from=build /app/api_gateway/target/quarkus-app/quarkus/ /deployments/quarkus/

EXPOSE 8888
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]
