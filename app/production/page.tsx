import { redirect } from "next/navigation";

// The Playbook tab lands on the reference, not a jobs list — projects now live
// under the Production tab.
export default function PlaybookIndex() {
  redirect("/production/playbook");
}
