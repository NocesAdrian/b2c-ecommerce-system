CREATE TABLE gemini_request_limiter (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    last_request_at DATETIME(6) NULL
);

INSERT INTO gemini_request_limiter (id, last_request_at)
VALUES (1, NULL);
