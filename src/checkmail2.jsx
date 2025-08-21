import { useEffect } from "react";
import axios from "axios";

export default function CheckMail2() {
  useEffect(() => {
    axios
      .get(
        "https://script.google.com/macros/s/AKfycbxGmWKek8E9Arh-XenTjgLHEV82muZ0wHtjbEG61HROe2Yeid71NC66NaZd9ltc0tqW/exec"
      )
      .then((res) => {
        console.log("📩 API Response:", res.data);
      })
      .catch((err) => {
        console.error("❌ API Error:", err);
      });
  }, []);

  return <div>CheckMail2 đang chạy... (xem console)</div>;
}
