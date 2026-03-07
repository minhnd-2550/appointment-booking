import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // Verify ownership
  const { data: appt } = await supabase
    .from("appointments")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (appt.user_id !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { data: orders } = await supabase
    .from("lab_orders")
    .select(
      "id, test_name, type, status, examination_results(id, result_text, file_path, uploaded_at)",
    )
    .eq("appointment_id", id)
    .order("created_at", { ascending: true });

  // Generate signed URLs for file results
  const ordersWithUrls = await Promise.all(
    (orders ?? []).map(async (order) => {
      const results = Array.isArray(order.examination_results)
        ? order.examination_results
        : [];
      const resultsWithUrls = await Promise.all(
        results.map(
          async (res: {
            id: string;
            result_text: string | null;
            file_path: string | null;
            uploaded_at: string;
          }) => {
            if (!res.file_path) return { ...res, signedUrl: null };
            const { data } = await supabase.storage
              .from("result-files")
              .createSignedUrl(res.file_path, 3600);
            return { ...res, signedUrl: data?.signedUrl ?? null };
          },
        ),
      );
      return { ...order, examination_results: resultsWithUrls };
    }),
  );

  return NextResponse.json({ data: ordersWithUrls });
}
