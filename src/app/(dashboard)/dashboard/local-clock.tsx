"use client";

import { useEffect, useState } from "react";

const TIME_ZONE = "Asia/Dhaka";
const timeFormatter = new Intl.DateTimeFormat("en-BD", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

export function LocalClock({ initialTime }: { initialTime: number }) {
  const [time, setTime] = useState(() => timeFormatter.format(new Date(initialTime)));

  useEffect(() => {
    const update = () => setTime(timeFormatter.format(new Date()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="tabular" aria-label="Bangladesh time">
      {time}
    </span>
  );
}
