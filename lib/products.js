import { supabase } from "./supabase";
import { PRODUCTS_TABLE, PRODUCTS_BUCKET } from "./collections";

/**
 * Normalize a products row for the UI.
 */
export function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    img: row.img,
    created_at: row.created_at,
  };
}

export async function listProducts() {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapProduct);
}

export async function getProductById(id) {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

export async function uploadProductImage(file) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function createProduct({ name, price, img }) {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .insert([{ name, price, img }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

export async function updateProduct(id, { name, price, img }) {
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ name, price, img, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

export async function deleteProduct(id) {
  const { error } = await supabase.from(PRODUCTS_TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
