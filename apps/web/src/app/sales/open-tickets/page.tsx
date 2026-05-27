import { redirect } from "next/navigation";

export default function OpenTicketsRedirect() {
  redirect("/sales/receipts");
}
