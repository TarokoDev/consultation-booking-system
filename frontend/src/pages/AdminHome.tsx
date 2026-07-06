import { useEffect, useState } from "react";
import { getAdminUsers, getAdminUserBookings } from "../api/client";
import type { AdminUser, AdminUserBooking } from "../api/types";
import { formatFullName } from "../utils/formatName";
import { formatDate, formatSlotTime } from "../utils/formatDateTime";
import { splitBookings } from "../utils/splitBookings";

type RoleTab = "patient" | "doctor";

const STATUS_BADGE: Record<AdminUserBooking["status"], string> = {
  confirmed: "badge-info",
  completed: "badge-success",
  cancelled: "badge-error",
};

// Shows the counterpart of the user being viewed: a patient's bookings list
// their doctors; a doctor's bookings list their patients.
function BookingCard({ booking, viewedRole }: { booking: AdminUserBooking; viewedRole: RoleTab }) {
  const counterpartName =
    viewedRole === "patient"
      ? formatFullName({
          title: booking.doctor_title,
          first_name: booking.doctor_first_name,
          middle_name: booking.doctor_middle_name,
          last_name: booking.doctor_last_name,
        })
      : formatFullName({
          title: booking.patient_title,
          first_name: booking.patient_first_name,
          middle_name: booking.patient_middle_name,
          last_name: booking.patient_last_name,
        });

  return (
    <div className="card bg-base-100 border border-gray-200">
      <div className="card-body flex flex-row justify-between items-center">
        <div>
          <h3 className="card-title">{counterpartName}</h3>
          {viewedRole === "patient" && (
            <p className="text-sm text-gray-500">{booking.doctor_specialty}</p>
          )}
          <p className="text-sm">
            {formatDate(booking.start_time)} · {formatSlotTime(booking.start_time)}–{formatSlotTime(booking.end_time)}
          </p>
          <p className="text-sm">Reason for visit: {booking.notes ? booking.notes : "N/A"}</p>
        </div>
        <span className={`badge badge-sm ${STATUS_BADGE[booking.status]}`}>{booking.status}</span>
      </div>
    </div>
  );
}

function UserDetail({ user, onBack }: { user: AdminUser; onBack: () => void }) {
  const [bookings, setBookings] = useState<AdminUserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminUserBookings(user.id)
      .then((data) => setBookings(data.bookings ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const viewedRole: RoleTab = user.role === "doctor" ? "doctor" : "patient";
  const { upcoming, history } = splitBookings(bookings);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="btn btn-ghost btn-sm min-h-[44px] px-2">
        &larr; Go back
      </button>

      <div>
        <h2 className="text-lg font-semibold">{formatFullName(user)}</h2>
        <p className="text-sm text-gray-500">
          {user.email}
          {user.specialty ? ` · ${user.specialty}` : ""}
        </p>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-500 text-center">Loading bookings...</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-500 text-center">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="p-4 text-sm text-gray-500 text-center">No bookings for this user.</div>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming bookings.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} viewedRole={viewedRole} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No past bookings.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((b) => (
                  <BookingCard key={b.id} booking={b} viewedRole={viewedRole} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserList({ role, onSelect }: { role: RoleTab; onSelect: (user: AdminUser) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAdminUsers(role)
      .then((data) => setUsers(data.users ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [role]);

  if (loading) return <div className="p-4 text-sm text-gray-500 text-center">Loading users...</div>;
  if (error) return <div className="p-4 text-sm text-red-500 text-center">{error}</div>;
  if (users.length === 0)
    return <div className="p-4 text-sm text-gray-500 text-center">No users found.</div>;

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <label
          key={user.id}
          className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
          onClick={() => onSelect(user)}
        >
          <span>
            <span className="block font-medium text-gray-900">{formatFullName(user)}</span>
            <span className="block text-sm text-gray-500">
              {user.email}
              {user.specialty ? ` · ${user.specialty}` : ""}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function AdminHome() {
  const [tab, setTab] = useState<RoleTab>("patient");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  return (
    <div className="mx-auto w-full max-w-lg mt-10 flex flex-col gap-4">
      <div role="tablist" className="tabs tabs-box">
        <a
          role="tab"
          className={`tab ${tab === "patient" ? "tab-active" : ""}`}
          onClick={() => {
            setTab("patient");
            setSelectedUser(null);
          }}
        >
          Patients
        </a>
        <a
          role="tab"
          className={`tab ${tab === "doctor" ? "tab-active" : ""}`}
          onClick={() => {
            setTab("doctor");
            setSelectedUser(null);
          }}
        >
          Doctors
        </a>
      </div>

      <div className="bg-base-100 border-base-300 rounded-box border p-4">
        {selectedUser ? (
          <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />
        ) : (
          <UserList role={tab} onSelect={setSelectedUser} />
        )}
      </div>
    </div>
  );
}
