import { useState } from "react";
import { BookingFlow } from "../booking/BookingFlow";
import { UpcomingTab } from "./UpcomingTab";
import { HistoryTab } from "./HistoryTab";

type Tab = "booking" | "upcoming" | "history";

export function PatientHome() {
  const [tab, setTab] = useState<Tab>("booking");

  return (
    <div className="mx-auto w-full max-w-lg mt-10 flex flex-col gap-4">
      <div role="tablist" className="tabs tabs-box">
        <a role="tab" className={`tab ${tab === "booking" ? "tab-active" : ""}`} onClick={() => setTab("booking")}>
          Booking
        </a>
        <a role="tab" className={`tab ${tab === "upcoming" ? "tab-active" : ""}`} onClick={() => setTab("upcoming")}>
          Upcoming
        </a>
        <a role="tab" className={`tab ${tab === "history" ? "tab-active" : ""}`} onClick={() => setTab("history")}>
          History
        </a>
      </div>

      <div className="bg-base-100 border-base-300 rounded-box border p-4">
        {tab === "booking" && <BookingFlow />}
        {tab === "upcoming" && <UpcomingTab />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
