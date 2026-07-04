import { useState } from "react";
import { BookingFlow } from "../booking/BookingFlow";
import { UpcomingTab } from "./UpcomingTab";
import { HistoryTab } from "./HistoryTab";

type Tab = "booking" | "upcoming" | "history";

export function PatientHome() {
  const [tab, setTab] = useState<Tab>("booking");

  return (
    <div>
      <div role="tablist" className="tabs tabs-boxed mx-auto w-full max-w-lg">
        <a
          role="tab"
          className={`tab min-h-[44px] flex-1 ${tab === "booking" ? "tab-active" : ""}`}
          onClick={() => setTab("booking")}
        >
          Booking
        </a>
        <a
          role="tab"
          className={`tab min-h-[44px] flex-1 ${tab === "upcoming" ? "tab-active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          Upcoming
        </a>
        <a
          role="tab"
          className={`tab min-h-[44px] flex-1 ${tab === "history" ? "tab-active" : ""}`}
          onClick={() => setTab("history")}
        >
          History
        </a>
      </div>

      <div className="mt-4">
        {tab === "booking" && <BookingFlow />}
        {tab === "upcoming" && <UpcomingTab />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}
