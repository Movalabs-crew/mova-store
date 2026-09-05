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

/**
 * Parse storage object path from a Supabase public URL.
 */
export function parseStoragePathFromUrl(publicUrl, bucket = PRODUCTS_BUCKET) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  try {
    const url = new URL(publicUrl);
    const marker = `/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) {
      return url.pathname.slice(idx + marker.length);
    }
    return url.pathname.split("/").pop() || null;
  } catch {
    const marker = `/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx !== -1) {
      return publicUrl.slice(idx + marker.length);
    }
    return null;
  }
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
    .update({ name, price, img })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapProduct(data);
}

export async function deleteProduct(id) {
  try {
    const product = await getProductById(id);
    if (product && product.img) {
      const storagePath = parseStoragePathFromUrl(product.img, PRODUCTS_BUCKET);
      if (storagePath) {
        await supabase.storage.from(PRODUCTS_BUCKET).remove([storagePath]);
      }
    }
  } catch {
    // Tolerant: continue to row deletion even if storage remove fails or image is missing
  }

  const { error } = await supabase.from(PRODUCTS_TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
