# QuickNotes System Design

QuickNotes System Design is a project with two halves. The first half is a small web page that talks to an online API: it loads notes, creates a note and deletes a note, using HTML, CSS and JavaScript and the JSONPlaceholder practice API. The second half is a set of design documents for the real QuickNotes backend: an API design, a data model and a system architecture that is planned for 1 million users.

## How to run the API client

1. Download or clone the repository:

```
git clone https://github.com/mukta-55/quicknotes-system-design.git
```

2. Open the `quicknotes-system-design` folder.
3. Open `index.html` in a web browser. In VS Code you can also use the Live Server extension and click "Go Live".
4. Click **Load notes** to load 10 notes from the server. Use the form to create a note, and click **Delete** on a note to remove it.

The page needs an internet connection, because it sends its requests to https://jsonplaceholder.typicode.com/posts. No installation or build step is needed.

## Documents

- [API design](docs/api-design.md): the REST endpoints, request and response examples, and the error codes.
- [Data model](docs/data-model.md): the tables, keys, relationships, SQL and the choice between SQL and NoSQL.
- [Architecture](docs/architecture.md): requirements, the load estimate, the diagram, the request flows and the trade-offs.

## What I learned

- I learned to use fetch with async and await, to check response.ok because fetch does not throw on a 404 or 500, and to handle errors with try, catch and finally.
- I learned to write one reusable request() function, so that the GET and POST code share the same fetch and error checking instead of repeating it.
- I learned to disable a button while a request is running and to turn it back on in finally, so that a user cannot send the same request twice.
- I learned that a practice API such as JSONPlaceholder does not really store data: when I deleted a note I had just created, the server still answered with status 200, so I explained my approach in a code comment.
- I learned to design REST endpoints with plural nouns and the right HTTP method, for example DELETE /notes/42 instead of a URL with a verb in it.
