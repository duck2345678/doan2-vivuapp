# ========= BUILD STAGE =========
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw -q dependency:go-offline
COPY src ./src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*SNAPSHOT.jar app.jar
EXPOSE 8080

# JVM Memory Settings cho server 512MB
# -Xms150m: Initial heap size
# -Xmx300m: Max heap size (để dư ~200MB cho OS + off-heap)
# -XX:+UseG1GC: G1 Garbage Collector (tối ưu cho low memory)
# -XX:MaxGCPauseMillis=100: Giảm pause time
# -XX:+UseStringDeduplication: Giảm memory cho duplicate strings
# -XX:+ExitOnOutOfMemoryError: Restart container khi OOM
ENTRYPOINT ["java", \
    "-Xms150m", \
    "-Xmx300m", \
    "-XX:+UseG1GC", \
    "-XX:MaxGCPauseMillis=100", \
    "-XX:+UseStringDeduplication", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "/app/app.jar"]
