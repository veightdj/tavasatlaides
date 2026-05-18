import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, userId: string, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("store-assets").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
}
