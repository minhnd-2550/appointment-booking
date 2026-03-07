import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceList } from "@/components/patient/InvoiceList";

export const metadata = { title: "Hoá đơn của tôi" };

export default async function MyInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className='max-w-2xl mx-auto px-4 py-8 space-y-6'>
      <h1 className='text-2xl font-bold'>Hoá đơn của tôi</h1>
      <InvoiceList />
    </div>
  );
}
