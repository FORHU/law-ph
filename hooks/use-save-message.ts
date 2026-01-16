import { Message } from "@/types";

export default function useSaveMessage(){
    async function saveMessageToDB({ role, content, conversation_id, imagePreview, timestamp } : Message){
    if(!content.trim()) return;

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
            ...(timestamp ? { timestamp } : {})
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