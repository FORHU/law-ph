# law-ph — Domain Glossary

## Chat Wonder
The AI backend service (Python, `localhost:8000 / CHAT_WONDER_API_URL`) that handles legal AI sessions, RAG retrieval, and response generation. law-ph communicates with it via WebSocket (`/chat-stream`) for streaming responses and REST for session management.

## Sources Block
A `[Sources] [{...}]` JSON payload appended by Chat Wonder at the end of AI responses, containing metadata about the legal documents the AI retrieved. In law-ph, this is **always stripped silently** and never shown to the user or stored.

## Stream Proxy
The Next.js route at `/api/chat/stream` that bridges the Chat Wonder WebSocket connection to an HTTP streaming response for the browser client.

## ILM_META
A custom metadata envelope embedded in message content as `[ILM_META]{...}[/ILM_META]`. Used to persist UI-only state (file attachments, voice notes, analysis flags, highlights) alongside the message text in the database. Stripped before display.
