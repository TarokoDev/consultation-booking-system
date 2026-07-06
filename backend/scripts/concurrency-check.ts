// ============================================================================
// Concurrency check — proves the double-booking defence works.
//
// Fires one booking request per seeded patient at the SAME slot at the same
// moment, then asserts:
//
//   1. exactly ONE request succeeds (201), every other gets a 409
//   2. the slot disappears from the public availability list
//
// Afterwards it cancels the winning booking so the check is re-runnable.
//
// Usage (backend must be running, DB seeded):
//
//   npm test                       # against http://localhost:3000
//   API_URL=https://... npm test   # against a deployed backend
//
// Exits 0 on pass, 1 on fail. API-only — needs no direct DB access.
// ============================================================================

const API = process.env.API_URL ?? "http://localhost:3000";
const PASSWORD = "password123";

const PATIENT_EMAILS = [
  "alice_goh@godoc.test",
  "marcus_lim@godoc.test",
  "priya_nair@godoc.test",
  "daniel_wong@godoc.test",
  "nurul_aisyah@godoc.test",
];

interface Slot {
  id: number;
  start_time: string;
  end_time: string;
}

async function api<T>(path: string, token?: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as T };
}

async function login(email: string): Promise<string> {
  const { status, body } = await api<{ token: string }>("/auth/login", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (status !== 200) throw new Error(`login failed for ${email} (HTTP ${status})`);
  return body.token;
}

// A slot is a fair target only if NO participating patient already has a
// booking overlapping it — otherwise their 409 would be an overlap rejection,
// not the slot-contention rejection this check is about.
async function findFairSlot(tokens: string[]): Promise<Slot> {
  const { body: doctorsBody } = await api<{ doctors: { id: number }[] }>("/doctors", tokens[0]);
  const doctorId = doctorsBody.doctors[0].id;

  // Loop through the next 20 days to find a fair slot
  for (let daysAhead = 1; daysAhead <= 20; daysAhead++) {
    const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const date = d.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });

    const { body: slotsBody } = await api<{ slots: Slot[] }>(
      `/slots?doctorId=${doctorId}&date=${date}`,
      tokens[0]
    );
    if (!slotsBody.slots?.length) continue;

    // Get the booked times for each patient
    const bookedPerPatient = await Promise.all(
      tokens.map(async (t) => {
        const { body } = await api<{ bookedTimes: { start_time: string; end_time: string }[] }>(
          `/bookings/patient/booked-times?date=${date}`,
          t
        );
        return body.bookedTimes ?? [];
      })
    );

    // Find a fair slot that no patient has a conflicting booking
    const fair = slotsBody.slots.find((slot) =>
      bookedPerPatient.every((times) =>
        times.every(
          (b) =>
            new Date(slot.start_time).getTime() >= new Date(b.end_time).getTime() ||
            new Date(slot.end_time).getTime() <= new Date(b.start_time).getTime()
        )
      )
    );
    if (fair) return fair;
  }
  throw new Error("no fair slot found in the next 20 days — reseed the database");
}

async function main() {
  console.log(`Target API: ${API}`);
  console.log(`Logging in ${PATIENT_EMAILS.length} patients...`);
  const tokens = await Promise.all(PATIENT_EMAILS.map(login));

  const slot = await findFairSlot(tokens);
  console.log(`Target slot: id=${slot.id}, starts ${slot.start_time}`);

  console.log(`Firing ${tokens.length} concurrent booking requests at slot ${slot.id}...`);
  const results = await Promise.all(
    tokens.map((t) =>
      api<{ booking?: { id: number }; error?: string }>("/bookings", t, {
        method: "POST",
        body: JSON.stringify({ slotId: slot.id, notes: "Concurrency check" }),
      })
    )
  );

  const created = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);
  const other = results.filter((r) => r.status !== 201 && r.status !== 409);

  results.forEach((r, i) =>
    console.log(`  ${PATIENT_EMAILS[i].padEnd(28)} -> HTTP ${r.status}${r.body.error ? ` (${r.body.error})` : ""}`)
  );

  // Assertion 2: the slot must vanish from public availability.
  const date = new Date(slot.start_time).toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  const { body: doctorsBody } = await api<{ doctors: { id: number }[] }>("/doctors", tokens[0]);
  const { body: afterBody } = await api<{ slots: Slot[] }>(
    `/slots?doctorId=${doctorsBody.doctors[0].id}&date=${date}`,
    tokens[0]
  );
  const stillListed = afterBody.slots?.some((s) => s.id === slot.id) ?? false;

  // Cleanup: cancel the winning booking so the check can run again.
  const winnerIdx = results.findIndex((r) => r.status === 201);
  if (winnerIdx >= 0 && results[winnerIdx].body.booking) {
    const bookingId = results[winnerIdx].body.booking!.id;
    const { status } = await api(`/bookings/patient/${bookingId}/cancel`, tokens[winnerIdx], {
      method: "PATCH",
    });
    console.log(`Cleanup: cancelled booking ${bookingId} (HTTP ${status})`);
  }

  console.log("");
  const pass = created.length === 1 && conflicts.length === tokens.length - 1 && other.length === 0 && !stillListed;
  console.log(`Created: ${created.length} (expected 1)`);
  console.log(`Conflicts (409): ${conflicts.length} (expected ${tokens.length - 1})`);
  console.log(`Unexpected statuses: ${other.length} (expected 0)`);
  console.log(`Slot still publicly listed after booking: ${stillListed} (expected false)`);
  console.log("");
  console.log(pass ? "PASS — exactly one booking won the race." : "FAIL — see counts above.");
  process.exitCode = pass ? 0 : 1;
}

main().catch((err) => {
  console.error("Check errored:", err.message ?? err);
  process.exitCode = 1;
});
