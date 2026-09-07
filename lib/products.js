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
    updated_at: row.updated_at,
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

  const { error: uploadError } = await supabase.storage.from(PRODUCTS_BUCKET).upload(path, file, {
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

/**
 * Recover the storage object path from a stored public image URL.
 *
 * Only the absolute publicUrl is kept on the row, so the object path has to be
 * read back out of it before the image can be removed. Returns null for
 * anything that is not a public URL in this bucket -- an externally hosted
 * image must never be treated as ours to delete.
 */
export function storageObjectPathFromPublicUrl(url) {
  if (typeof url !== "string" || url === "") return null;

  try {
    const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (!configuredUrl) return null;

    const base = new URL(configuredUrl.endsWith("/") ? configuredUrl : `${configuredUrl}/`);
    if (base.protocol !== "https:" && base.protocol !== "http:") return null;

    const bucketUrl = new URL(
      `storage/v1/object/public/${encodeURIComponent(PRODUCTS_BUCKET)}/`,
      base
    );
    const imageUrl = new URL(url);
    if (imageUrl.origin !== bucketUrl.origin || !imageUrl.pathname.startsWith(bucketUrl.pathname)) {
      return null;
    }

    // pathname excludes cache-busting query parameters and fragments.
    const path = imageUrl.pathname.slice(bucketUrl.pathname.length);
    if (!path) return null;
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

export async function deleteProduct(id) {
  // Read the image before the row goes: the object path exists only inside the
  // stored URL, so once the row is deleted the file can no longer be located
  // and stays in the bucket forever.
  let imageUrl = null;
  try {
    const { data } = await supabase.from(PRODUCTS_TABLE).select("img").eq("id", id).maybeSingle();
    imageUrl = data?.img ?? null;
  } catch {
    // A failed lookup must not block the deletion the caller asked for; the
    // worst case is the orphaned image this function is meant to prevent.
  }

  // Keep the image intact if the database rejects or cannot complete the deletion.
  const { error } = await supabase.from(PRODUCTS_TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);

  const path = storageObjectPathFromPublicUrl(imageUrl);
  if (path) {
    try {
      // supabase-js reports storage failures in the resolved value rather than
      // by rejecting. Cleanup is best-effort after the row has been deleted.
      await supabase.storage.from(PRODUCTS_BUCKET).remove([path]);
    } catch {
      // The row is already deleted; tolerate a failed best-effort cleanup.
    }
  }
}
