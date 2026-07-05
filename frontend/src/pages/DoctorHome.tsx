import { useState } from "react";
import { DoctorUpcomingTab } from "./DoctorUpcomingTab";
import { DoctorHistoryTab } from "./DoctorHistoryTab";

type Tab = "upcoming" | "history";

export function DoctorHome() {
  const [tab, setTab] = useState<Tab>("upcoming");

  return (
    <div className="mx-auto w-full max-w-lg mt-10 flex flex-col gap-4">
      <div role="tablist" className="tabs tabs-box">
        <a role="tab" className={`tab ${tab === "upcoming" ? "tab-active" : ""}`} onClick={() => setTab("upcoming")}>
          Upcoming
        </a>
        <a role="tab" className={`tab ${tab === "history" ? "tab-active" : ""}`} onClick={() => setTab("history")}>
          History
        </a>
      </div>

      <div className="bg-base-100 border-base-300 rounded-box border p-4">
        {tab === "upcoming" && <DoctorUpcomingTab />}
        {tab === "history" && <DoctorHistoryTab />}
      </div>
    </div>
  );
}
