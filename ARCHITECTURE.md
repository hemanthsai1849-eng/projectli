# Architecture Document for High-Frequency Betting Platform

## Core Requirements & System Design (SDD)

This architecture establishes a high-frequency, real-time betting platform optimized for System Integrity, Transactional Security, and Scalability.

### 1. Technology Stack
*   **Frontend**: Next.js (App Router), Tailwind CSS, React Query, Socket.io-client.
*   **Backend**: Node.js, Express, Socket.io (WebSocket), Redis (Pub/Sub for scaling).
*   **Database**: PostgreSQL leveraging Prisma ORM for type safety.

### 2. Scalability: Service-Ready Modular Monolith
To reduce operational overhead while preparing for scale, the application is divided into domains within a single repository (Modular Monolith). Modules can run as a single process initially but strictly communicate via Event Emitters/Message Queues so they can be seamlessly extracted into independent microservices (e.g., a dedicated RNG Microservice).

*   **WebSocket Servers**: Must be entirely stateless. We utilize Redis Pub/Sub so that a client connected to WS-Node-1 can receive events emitted by WS-Node-2.

### 3. Integrity: ACID Compliance
Financial transactions MUST NEVER enter a phantom or unresolved state. 
*   **PostgreSQL Transactions**: The `WAITING -> LOCKED -> PAYOUT` flow wraps all user balance modifications inside strict SQL transaction blocks. 
*   **Optimistic locking/Concurrency clauses**: Prevent multiple rapid requests from exploiting race conditions and double-spending balances.

### 4. Transparency: Provably Fair Engine (Commit-Reveal Scheme)
Fairness is cryptographically guaranteed and openly verifiable.
*   **Server Seed Generation**: A secure random `ServerSeed` is generated.
*   **Commit Phase**: Before round begins, `HMAC-SHA256(ServerSeed)` is computed. This hash is broadcasted to all users.
*   **Betting Phase**: Users lock in their bets, generating random `ClientSeed` components.
*   **Reveal Phase & Outcome computation**: Once round locks, the underlying `ServerSeed` is revealed. Outcome is defined by modular arithmetic mapping `calculate_result(ServerSeed, combinedClientSeeds, Nonce)`.
*   **Independent Verification**: Any user can verify no manipulation occurred because the Hash is mathematically bound to the Outcome.

### 5. Audit Trail
All game instances generate an **Audit Token**. The token is immutable and timestamped, creating a completely irrefutable non-repudiation log for an IT Audit. 

---

## Inter-Component Communication Flow

1.  **Frontend (Next.js)** authenticates user. Connects to **WebSocket (Node.js)** for live ticks.
2.  **State Broadcast Loop** runs continuously at 60s intervals. State broadcasts: `WAITING -> LOCKED -> RESULT -> PAYOUT`.
3.  **Client Betting**: Client fires API POST req to Backend or WS emission.
4.  **Transaction API**: Node.js Backend validates timer (>5s remaining), initiates PostgreSQL transaction linking Bet amount to User.
5.  **Round Engine**: Hits `RESULT` state. **RNG Service** invoked to combine Commit-Reveal materials and produce Outcome.
6.  **Resolution & Payout**: Node.js Backend computes payouts, runs PostgreSQL updates. Audit Module finalizes Token. Node.js instructs WebSocket to broadcast `WINNERS`.

## Reference for Code Generators
*All future code generated for this platform MUST reference and strictly respect the architectural decisions laid out in this document.*
