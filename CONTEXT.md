# law-ph — Domain Glossary

> **ILoveLawyer** is the end-user product name. **law-ph** is the internal/repository name. They refer to the same platform.

## Chat Wonder
The AI backend service (Python, `localhost:8000 / CHAT_WONDER_API_URL`) that handles legal AI sessions, RAG retrieval, and response generation. law-ph communicates with it via WebSocket (`/chat-stream`) for streaming responses and REST for session management.

## Sources Block
A `[Sources] [{...}]` JSON payload appended by Chat Wonder at the end of AI responses, containing metadata about the legal documents the AI retrieved. In law-ph, the citation parser reads this payload before stripping it — extracting structured data rendered as a citations panel. The raw JSON is never shown in the chat UI, never logged to the browser console, and never forwarded back to Chat Wonder in subsequent conversation turns.

## Stream Proxy
The Next.js route at `/api/chat/stream` that bridges the Chat Wonder WebSocket connection to an HTTP streaming response for the browser client.

## ILM_META
A custom metadata envelope embedded in message content as `[ILM_META]{...}[/ILM_META]`. Used to persist UI-only state (file attachments, voice notes, analysis flags, highlights) alongside the message text in the database. Stripped before display.

## Message
A single turn in a Conversation. Authored by the user (`role: user`), the AI (`role: assistant`), or the system (`role: system`). System messages record events like a Participant joining a Case. Always scoped to exactly one Conversation.

## Case
A legal matter tracked by a lawyer. Has a name, parties involved, and notes. Every Case has a linked Conversation (sharing the same ID) that holds its chat history with the AI.

## Case Owner
The lawyer who created the Case. The Case Owner is the sole authority over access: only they can generate invite links, remove participants, or delete the case. Deleting a Case destroys it for all participants.

## Participant
A lawyer who joined a shared Case by accepting an invite link. Participants can view the case and send messages to the AI, but cannot invite others, remove members, or delete the case. A Participant who removes themselves (or is removed by the Case Owner) loses access immediately; the case remains intact for everyone else.

## Case Invite
A time-limited link (5-minute TTL) generated exclusively by the Case Owner to grant Participant access to a Case. Multi-use within the window — anyone with the link can join before it expires. Generating a new link invalidates the previous one. Only one active invite exists per Case at a time.

## Shared Case
A Case that has at least one accepted Participant. The app stays in sync with new messages while a Shared Case is open and the browser tab is visible.

## Voice Note
An audio recording attached to a message inside a Case. Stored in S3 and referenced via ILM_META metadata. Can be run through AWS Transcribe to produce a Transcription.

## Transcription
The text output produced by converting a Voice Note (or other audio file) to text via AWS Transcribe. Stored in its own database record. Also accessible as a standalone flow via the `/transcribe` page, independent of a Case.

## Document
A file (PDF, Word, etc.) uploaded by a user, stored in S3, and optionally attached to a Case. Has an AI-generated summary. Currently scoped to a Case, but intended to exist independently of any Case in the future.

## Bookmark
A saved reference that a user pins for quick access. Can point to either a Case (a legal matter the user is working on) or a legal source from the Legal Library (a law, jurisprudence, or issuance).

## Conversation
The database record that stores a chat thread. Both Cases and Consultations use this structure — a Case's Conversation has a `caseId` set (and shares the same ID as the Case), while a Consultation's Conversation has `caseId` null.

## Consultation
A private AI conversation that is not linked to a Case. A user can have multiple Consultations. Has no participants, no polling, and no invite mechanism. Owned solely by the creating user.
