import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceList } from "@/components/patient/InvoiceList";

export const metadata = { title: "Hoá đơn của tôi" };

export default async function MyInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/my-invoices");

  return (
    <div className='mx-auto w-full max-w-2xl space-y-6 py-6'>
      <h1 className='text-2xl font-bold'>Hoá đơn của tôi</h1>
      <InvoiceList />
    </div>
  );
}
