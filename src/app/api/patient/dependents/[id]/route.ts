import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const GENDER = ["male", "female", "other"] as const;
const RELATIONSHIP = ["child", "parent", "spouse", "sibling", "other"] as const;

const UpdateDependentSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.enum(GENDER).nullable().optional(),
  relationship: z.enum(RELATIONSHIP).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = UpdateDependentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined)
    updates.full_name = parsed.data.fullName;
  if (parsed.data.dateOfBirth !== undefined)
    updates.date_of_birth = parsed.data.dateOfBirth;
  if (parsed.data.gender !== undefined) updates.gender = parsed.data.gender;
  if (parsed.data.relationship !== undefined)
    updates.relationship = parsed.data.relationship;
  if (parsed.data.isActive !== undefined)
    updates.is_active = parsed.data.isActive;

  const { data, error } = await supabase
    .from("dependents")
    .update(updates)
    .eq("id", id)
    .eq("account_holder_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ dependent: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if dependent has any appointments
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("dependent_id", id)
    .eq("account_holder_id", user.id);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error:
          "Không thể xóa người phụ thuộc đang có lịch hẹn. Bạn có thể vô hiệu hóa thay thế.",
        code: "HAS_APPOINTMENTS",
      },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("dependents")
    .delete()
    .eq("id", id)
    .eq("account_holder_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
