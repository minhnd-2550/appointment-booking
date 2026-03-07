import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Generate a signed download URL for a Supabase Storage object.
 * Uses service-role client so it works from server-side routes.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 60, // 1 hour default
): Promise<string> {
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to generate signed URL: ${error?.message ?? "unknown"}`,
    );
  }

  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple storage paths in one call.
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 60 * 60,
): Promise<Array<{ path: string; signedUrl: string }>> {
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error || !data) {
    throw new Error(
      `Failed to generate signed URLs: ${error?.message ?? "unknown"}`,
    );
  }

  return data.map((item) => ({
    path: item.path ?? "",
    signedUrl: item.signedUrl ?? "",
  }));
}
