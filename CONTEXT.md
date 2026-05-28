# law-ph — Domain Glossary

## Chat Wonder
The AI backend service (Python, `localhost:8000 / CHAT_WONDER_API_URL`) that handles legal AI sessions, RAG retrieval, and response generation. law-ph communicates with it via WebSocket (`/chat-stream`) for streaming responses and REST for session management.

## Sources Block
A `[Sources] [{...}]` JSON payload appended by Chat Wonder at the end of AI responses, containing metadata about the legal documents the AI retrieved. In law-ph, this is **always stripped silently** and never shown to the user or stored.

## Stream Proxy
The Next.js route at `/api/chat/stream` that bridges the Chat Wonder WebSocket connection to an HTTP streaming response for the browser client.

## ILM_META
A custom metadata envelope embedded in message content as `[ILM_META]{...}[/ILM_META]`. Used to persist UI-only state (file attachments, voice notes, analysis flags, highlights) alongside the message text in the database. Stripped before display.

## Case
A legal matter tracked by a lawyer. Has a name, parties involved, and notes. Every Case has a linked Conversation (sharing the same ID) that holds its chat history with the AI.

## Case Owner
The lawyer who created the Case. The Case Owner is the sole authority over access: only they can generate invite links, remove participants, or delete the case. Deleting a Case destroys it for all participants.

## Participant
A lawyer who joined a shared Case by accepting an invite link. Participants can view the case and send messages to the AI, but cannot invite others, remove members, or delete the case. A Participant who removes themselves (or is removed by the Case Owner) loses access immediately; the case remains intact for everyone else.

## Case Invite
A time-limited link (5-minute TTL) generated exclusively by the Case Owner to grant Participant access to a Case. Multi-use within the window — anyone with the link can join before it expires. Generating a new link invalidates the previous one. Only one active invite exists per Case at a time.

## Shared Case
A Case that has at least one accepted Participant. The app polls for new messages every 3 seconds while a Shared Case is open and the browser tab is visible. Polling is a temporary measure pending WebSocket implementation.

## Consultation
A private AI conversation that is not linked to a Case. Has no participants, no polling, and no invite mechanism. Owned solely by the creating user.
