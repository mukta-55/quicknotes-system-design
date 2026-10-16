# QuickNotes Architecture

This document describes how QuickNotes can be built to serve 1 million users.

## 1. Requirements

### Functional requirements

- Users can create an account and log in.
- A logged-in user can create, list, update and delete their own notes.
- Each note has a category, and users can filter and search their notes.
- A user can only see and change their own notes.
- Slow tasks, such as sending a welcome email or exporting notes, run in the background.

### Non-functional requirements

- **Availability:** the service should stay up even if one server fails, so there should be no single point of failure.
- **Latency:** loading the note list should feel instant. Users notice delays above about 100 to 200 ms, so the aim is to serve most reads from the cache in a few milliseconds.
- **Scalability:** the system must handle 1 million registered users and grow by adding servers.
- **Durability:** saved notes must not be lost, so the database is backed up and replicated.
- **Security:** all traffic uses HTTPS, and every request carries a token that identifies the user.
- **Consistency:** a note list that is a moment out of date is acceptable, but a user should never see another user's notes.

## 2. Load estimate for 1 million users

**Assumptions:** 1,000,000 registered users; 20% are active each day, which gives 200,000 daily active users (DAU); each active user creates 5 notes per day and loads their notes 20 times per day; an average note is about 500 bytes; one day is about 100,000 seconds (rounded); peak traffic is about 5 times the average.

| Measure               | Calculation                                                | Result                     |
| --------------------- | ---------------------------------------------------------- | -------------------------- |
| Writes (new notes)    | 200,000 x 5 = 1,000,000 per day; 1,000,000 / 100,000       | about 10 writes per second |
| Reads (loading notes) | 200,000 x 20 = 4,000,000 per day; 4,000,000 / 100,000      | about 40 reads per second  |
| Peak writes           | 10 x 5                                                     | about 50 writes per second |
| Peak reads            | 40 x 5                                                     | about 200 reads per second |
| Storage per year      | 1,000,000 notes x 500 bytes = 500 MB per day; 500 MB x 365 | about 180 GB per year      |

**What this tells us:** the system is read-heavy, with about 4 times more reads than writes, so caching reads will help a lot. 200 requests per second at peak is manageable for a few ordinary servers, and 180 GB per year fits comfortably in one well-configured database. The design does not need to be enormous.

## 3. Architecture diagram

```
Users / clients ---> DNS (quicknotes.com -> IP addresses)
      |
      |--- static files (HTML, CSS, JS) ---> CDN (edge servers) --(miss only)--> Origin
      |
      |--- API calls (HTTPS, JSON)
      v
Load balancer
   |        |        |
   v        v        v
App 1     App 2     App 3 ------> Cache (Redis)
   |          |          |
 writes     reads       jobs
   |          |          |
   v          v          v
Primary DB --> Read replica     Queue ---> Worker (emails, exports)
```

## 4. What each component does

- **Users / clients:** the browsers and phone apps that people use to read and write their notes.
- **DNS:** turns the name quicknotes.com into the IP addresses of our servers, so users can find us.
- **CDN:** keeps copies of the static files (index.html, style.css, script.js) on edge servers close to users, which reduces latency and takes load off our own servers.
- **Load balancer:** spreads incoming API requests across the app servers and stops sending traffic to any server that fails its health checks.
- **App servers (at least 2):** run the QuickNotes code, check the user's token and apply the rules. They are stateless, so any server can handle any request and a failed server can be replaced without losing data.
- **Cache (Redis):** keeps each user's note list in memory, so repeated reads are answered in about 1 ms without touching the database.
- **Primary database:** the one true copy of the data, which accepts all writes and holds the users, notes and tags.
- **Read replica:** a copy of the primary that answers read queries, so the primary has less work to do, and it can take over if the primary fails.
- **Queue:** holds slow jobs, so the app server can answer the user straight away and a burst of jobs waits in line instead of overloading the system.
- **Worker:** takes jobs from the queue and does the slow work, such as sending an email or building an export, in the background.

## 5. Request flows

### GET /notes (loading the notes)

1. The request reaches the load balancer, which picks a healthy app server (about 1 ms).
2. The app server checks the token in the Authorization header and identifies the user (1 to 2 ms).
3. It asks Redis for the key `notes:user:1`.
4. **Cache hit:** the notes come back in about 1 ms and the server sends the response with status 200.
5. **Cache miss:** the app server queries a read replica (about 5 to 20 ms with a good index), stores the result in Redis with a time to live (TTL), and sends the response. The next request will be a hit.

### POST /notes (saving a note)

1. The load balancer forwards the request to any healthy app server.
2. The app server checks the token, then validates the data (for example the text must not be empty and must be 200 characters or fewer).
3. It writes the note to the primary database, because only the primary accepts writes (about 5 to 10 ms).
4. It deletes the key `notes:user:1` from Redis, so that stale notes are never served.
5. It responds with status 201 Created. Within a few milliseconds the primary copies the new row to the replicas.

## 6. Trade-offs

- **Speed versus freshness:** the cache and the read replica make reads fast, but a user could briefly see a slightly old note list. The cache is cleared on every change and the replica copies data a few milliseconds after the primary. For QuickNotes, a list that is a second out of date is acceptable.
- **Simplicity versus scalability:** one server would be simple to build and run, but it could not survive a failure or a traffic peak. A load balancer with several app servers, a cache and replicas is harder to build and debug, but it grows by adding servers. The app code stays a single, well-organised application (a monolith), because splitting it into microservices would add complexity that the team does not need yet.
- **Cost versus reliability:** extra app servers, a read replica and a CDN cost more money, but they keep the service available and fast.

## 7. Avoiding single points of failure

- **App servers:** there are at least 2, behind a load balancer with health checks. If one crashes, the load balancer stops sending it traffic, and because the servers are stateless no data is lost.
- **Load balancer:** it would itself be a single point of failure if there were only one. A managed cloud load balancer, or a pair of load balancers, avoids that.
- **Database:** the read replica holds a copy of the data. If the primary fails, a replica can be promoted to become the new primary (failover). Regular backups protect the data further.
- **Static files:** the CDN keeps copies at many edge servers, so the front end is still served if one location has a problem.
- **Cache:** if Redis is unavailable, the app servers can read from the database instead, so the service gets slower but keeps working.
- **Monitoring:** logs, metrics and alerts (such as the error rate and the 95th-percentile latency of GET /notes) tell engineers about a failure before most users notice.
