import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import doctorsRouter from "./routes/doctors";
import slotsRouter from "./routes/slots";
import bookingsRouter from "./routes/bookings";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/doctors", doctorsRouter);
app.use("/slots", slotsRouter);
app.use("/bookings", bookingsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
