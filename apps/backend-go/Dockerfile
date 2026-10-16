FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY cmd/ ./cmd/

RUN CGO_ENABLED=0 GOOS=linux go build -o /trippy-server ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /trippy-server .

EXPOSE 8080
ENV PORT=8080

CMD ["./trippy-server"]
