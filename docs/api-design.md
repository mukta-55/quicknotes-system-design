# QuickNotes API Design

This document describes the REST API the backend team should build for QuickNotes. Every endpoint except login needs a login token in the header `Authorization: Bearer <token>`. The API only returns and changes the notes of the logged-in user. All request and response bodies are JSON.

## Endpoints

| Method | Path                               | Description                                              | Success status |
| ------ | ---------------------------------- | -------------------------------------------------------- | -------------- |
| GET    | /notes                             | List all notes of the logged-in user, newest first       | 200 OK         |
| GET    | /notes/{id}                        | Get one note by its id                                   | 200 OK         |
| POST   | /notes                             | Create a new note                                        | 201 Created    |
| PATCH  | /notes/{id}                        | Update some fields of one note                           | 200 OK         |
| DELETE | /notes/{id}                        | Delete one note                                          | 204 No Content |
| GET    | /notes?category=work&search=report | List notes filtered by category and by words in the text | 200 OK         |

The last endpoint uses query parameters. They come after the `?` and are joined with `&`.

## Example: create a note

**Request**

```
POST /notes
Content-Type: application/json
Authorization: Bearer abc123

{ "text": "Buy milk", "category": "personal" }
```

**Response (201 Created)**

```json
{
  "id": 42,
  "text": "Buy milk",
  "category": "personal",
  "createdAt": "2026-09-22T09:15:00Z"
}
```

## Example: list notes

**Request**

```
GET /notes
Authorization: Bearer abc123
```

**Response (200 OK)**

```json
[
  {
    "id": 42,
    "text": "Buy milk",
    "category": "personal",
    "createdAt": "2026-09-22T09:15:00Z"
  },
  {
    "id": 41,
    "text": "Revise HTTP methods",
    "category": "study",
    "createdAt": "2026-09-21T18:30:00Z"
  }
]
```

## Error codes

| Status                    | Meaning                                           | Example of when it happens                                         |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| 400 Bad Request           | The request was invalid                           | POST /notes with an empty text, or text longer than 200 characters |
| 401 Unauthorized          | The user is not logged in or the token is invalid | GET /notes with no Authorization header, or an expired token       |
| 403 Forbidden             | The user is logged in but not allowed to do this  | DELETE /notes/42 when note 42 belongs to another user              |
| 404 Not Found             | The note or URL does not exist                    | GET /notes/9999 when no note has that id                           |
| 500 Internal Server Error | Something broke on the server                     | The database is unreachable while handling GET /notes              |

**Example error body** (for a 400 response):

```json
{
  "error": {
    "status": 400,
    "message": "Note text is required and must be 200 characters or fewer."
  }
}
```
