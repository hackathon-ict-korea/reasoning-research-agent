import { supabase } from "./supabase-client";

export async function createConversation() {
  const { data, error } = await supabase
    .from("conversations")
    .insert([{}])
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data; // { id, created_at }
}

export async function addDocToConversation(
  conversationId: string,
  title: string
) {
  const { data, error } = await supabase
    .from("docs")
    .insert([{ title, conversation_id: conversationId }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create doc: ${error.message}`);
  return data; // { id, title, conversation_id, created_at }
}

export async function getDocsByConversation(conversationId: string) {
  const { data, error } = await supabase
    .from("docs")
    .select("id, title, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to retrieve docs: ${error.message}`);
  return data;
}
