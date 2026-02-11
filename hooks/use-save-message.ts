import { Message } from "@/types";

export default function useSaveMessage(){
    async function saveMessageToDB({ role, content, conversation_id, imagePreview, timestamp, created_at } : Partial<Message>){
    if(!content || !content.trim()) return;

    if(!conversation_id) return;


    const res = await fetch('/api/chat/messages', {
        method: "POST",
         headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            role,
            content,
            conversation_id,
            ...(imagePreview ? { imagePreview } : {}),
            ...(timestamp || created_at ? { created_at: timestamp || created_at } : {})
        })
    })

    if (!res.ok){
        const err = await res.json()
        console.error("Failed to save message:", err)
        throw new Error(err.error || "Failed to save message")
    }

    return true
}

return { saveMessageToDB }
}