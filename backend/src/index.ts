import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./features/auth/auth.routes";
import doctorsRouter from "./features/doctors/doctors.routes";
import slotsRouter from "./features/slots/slots.routes";
import bookingsRouter from "./features/bookings/bookings.routes";
import adminRouter from "./features/admin/admin.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/doctors", doctorsRouter);
app.use("/slots", slotsRouter);
app.use("/bookings", bookingsRouter);
app.use("/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
