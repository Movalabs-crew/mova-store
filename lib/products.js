import { supabase } from "./supabase";
import { PRODUCTS_TABLE, PRODUCTS_BUCKET } from "./collections";
import { invalidateProductCache } from "./productCache";
import { validatePrice, validateProductName } from "./validation";

/**
 * MIME types a product image may be uploaded as, mapped to the extension that
 * is actually stored. The extension is derived from this table rather than
 * from `file.name`, so a client cannot get a `.html` / `.svg` payload stored
 * in the public bucket by renaming the file.
 */
export const ALLOWED_PRODUCT_IMAGE_TYPES = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
});

/** Hard ceiling for a single product image. Bucket objects are public. */
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Validate a candidate upload before it reaches storage.
 *
 * Returns the trusted MIME type and the extension to store it under, or throws
 * an `Error` whose message is safe to surface to the user.
 */
export function validateProductImage(file) {
  if (!file || typeof file !== "object") {
    throw new Error("Please choose an image file to upload.");
  }

  const type = typeof file.type === "string" ? file.type.trim().toLowerCase() : "";
  const ext = Object.prototype.hasOwnProperty.call(ALLOWED_PRODUCT_IMAGE_TYPES, type)
    ? ALLOWED_PRODUCT_IMAGE_TYPES[type]
    : null;

  if (!ext) {
    throw new Error("Only PNG, JPEG or WebP images can be uploaded.");
  }

  const size = typeof file.size === "number" && Number.isFinite(file.size) ? file.size : 0;
  if (size <= 0) {
    throw new Error("That image appears to be empty. Please choose a valid image file.");
  }
  if (size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("That image is too large. The maximum size is 5 MB.");
  }

  return { type, ext, size };
}

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

/**
 * Parse storage object path from a Supabase public URL.
 */
export function parseStoragePathFromUrl(publicUrl, bucket = PRODUCTS_BUCKET) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    typeof publicUrl !== "string" ||
    !publicUrl ||
    typeof supabaseUrl !== "string" ||
    !supabaseUrl
  ) {
    return null;
  }

  try {
    const url = new URL(publicUrl);
    const projectUrl = new URL(supabaseUrl);
    const projectPath = projectUrl.pathname.replace(/\/+$/, "");
    const objectPrefix = `${projectPath}/storage/v1/object/public/${encodeURIComponent(bucket)}/`;

    if (url.origin !== projectUrl.origin || !url.pathname.startsWith(objectPrefix)) {
      return null;
    }

    const encodedPath = url.pathname.slice(objectPrefix.length);
    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch {
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
  // Never trust the client-supplied name or MIME type: the stored extension and
  // the declared content type both come from the validated allow-list, so the
  // object can only ever be served back as one of the allowed image types.
  // `X-Content-Type-Options: nosniff` is set on the bucket, not here: uploads
  // are served from the Supabase storage domain.
  const { type, ext } = validateProductImage(file);

  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(PRODUCTS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: type,
  });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Run the shared validators and return the sanitized product name.
 * Throws the validator's message so the caller (admin form) can surface it.
 */
function validatedProductName(name) {
  const result = validateProductName(name);
  if (!result.isValid) throw new Error(result.error || "Please enter a valid product name");
  return result.sanitized;
}

/**
 * Run the shared validators and return the price as a number rounded to two
 * decimals. Throws the validator's message so the caller can surface it.
 */
function validatedProductPrice(price) {
  const result = validatePrice(price);
  if (!result.isValid) throw new Error(result.error || "Please enter a valid price");
  return Number(result.sanitized);
}

export async function createProduct({ name, price, img }) {
  // Validate before the insert so -50, 1e12 or NaN can never reach the table.
  const row = {
    name: validatedProductName(name),
    price: validatedProductPrice(price),
    img,
  };

  const { data, error } = await supabase.from(PRODUCTS_TABLE).insert([row]).select().single();

  if (error) throw new Error(error.message);
  invalidateProductCache();
  return mapProduct(data);
}

export async function updateProduct(id, { name, price, img }) {
  const updates = { img, updated_at: new Date().toISOString() };

  // Only the fields actually supplied are validated, so partial updates keep
  // working while a bad name or price is still rejected before the write.
  if (name !== undefined && name !== null) {
    updates.name = validatedProductName(name);
  }

  if (price !== undefined && price !== null) {
    updates.price = validatedProductPrice(price);
  }

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidateProductCache();
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

/**
 * Report a failed best-effort storage cleanup.
 *
 * The product row has already been deleted by the time cleanup runs, so the
 * failure must not be thrown. It is logged with enough context -- product id,
 * object path, and the underlying message -- to locate the orphaned object in
 * the bucket afterwards.
 */
function reportStorageCleanupFailure(productId, objectPath, error) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error);

  console.warn(
    `[products] Storage cleanup failed for deleted product "${productId}" ` +
      `(object "${objectPath}"): ${message}. The object may be orphaned in the ` +
      `"${PRODUCTS_BUCKET}" bucket.`
  );
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
  invalidateProductCache();

  const path = storageObjectPathFromPublicUrl(imageUrl);
  if (path) {
    try {
      // supabase-js reports storage failures in the resolved value rather than
      // by rejecting, so the resolved error has to be inspected explicitly.
      // Cleanup stays best-effort after the row has been deleted: the failure
      // is reported, never thrown, because the deletion the caller requested
      // has already succeeded and must not be undone.
      const { error: cleanupError } = await supabase.storage.from(PRODUCTS_BUCKET).remove([path]);
      if (cleanupError) {
        reportStorageCleanupFailure(id, path, cleanupError);
      }
    } catch (error) {
      // A rejected request (network or transport failure) is reported the same
      // way rather than being swallowed by this catch block.
      reportStorageCleanupFailure(id, path, error);
    }
  }
}
