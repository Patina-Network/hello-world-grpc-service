FROM mirror.gcr.io/library/rust:1-alpine AS build

WORKDIR /app

RUN apk add --no-cache musl-dev protobuf-dev

COPY Cargo.toml Cargo.lock build.rs ./
COPY proto ./proto
COPY src ./src

RUN cargo build --release --locked

FROM mirror.gcr.io/library/alpine:3.23.3 AS server-runtime

WORKDIR /app

COPY --from=build /app/target/release/hello-world-grpc-service ./

ENV ENVIRONMENT=production

EXPOSE 3000 50051

ENTRYPOINT ["./hello-world-grpc-service"]
