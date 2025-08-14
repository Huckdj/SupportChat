import { useState, useEffect } from "react";

export default function CheckMail() {
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [token, setToken] = useState("");
  const [notification, setNotification] = useState(null);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");

  const showNotification = (text, type = "info") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Lấy domain khi load trang
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const res = await fetch("https://api.mail.tm/domains");
        const data = await res.json();
        const list = data["hydra:member"] || [];
        setDomains(list);
        if (list.length > 0) setSelectedDomain(list[0].domain);
      } catch {
        showNotification("Lỗi kết nối khi lấy domain", "error");
      }
    };
    fetchDomains();
  }, []);

  // Hàm tìm code 4–6 ký tự số
  const extractCode = (subject, html, text) => {
    const regex = /\b\d{4,6}\b/g;
    const combined = `${subject || ""} ${html || ""} ${text || ""}`;
    const match = combined.match(regex);
    return match ? match[0] : "N/A";
  };

  const handleExport = async () => {
    if (!emailInput || !passInput) {
      showNotification("Vui lòng nhập email và mật khẩu", "error");
      return;
    }

    try {
      // Đăng nhập
      const loginRes = await fetch("https://api.mail.tm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: emailInput.trim(),
          password: passInput
        })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        showNotification(`Lỗi đăng nhập: ${loginData["hydra:description"] || "Không rõ"}`, "error");
        return;
      }
      setToken(loginData.token);

      // Lấy danh sách tin nhắn
      const msgRes = await fetch("https://api.mail.tm/messages", {
        headers: { Authorization: `Bearer ${loginData.token}` }
      });
      const msgData = await msgRes.json();
      const rawMessages = msgData["hydra:member"] || [];

      // Tải nội dung từng tin nhắn để tìm code
      const detailedMessages = await Promise.all(
        rawMessages.map(async (msg) => {
          try {
            const detailRes = await fetch(`https://api.mail.tm/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${loginData.token}` }
            });
            const detailData = await detailRes.json();
            const htmlContent = detailData.html?.join(" ") || "";
            const textContent = detailData.text || "";
            const code = extractCode(msg.subject, htmlContent, textContent);
            return {
              ...msg,
              fromName: detailData.from?.address || "",
              html: htmlContent,
              text: textContent,
              code
            };
          } catch {
            return { ...msg, code: "N/A" };
          }
        })
      );

      setMessages(detailedMessages);
      setSelectedMessage(null);

      // Thông báo code của mail mới nhất nếu có
      if (detailedMessages.length > 0 && detailedMessages[0].code !== "N/A") {
        showNotification(`Code mới nhất: ${detailedMessages[0].code}`, "success");
      } else {
        showNotification("Đã tải danh sách tin nhắn", "success");
      }
    } catch (error) {
      console.error(error);
      showNotification("Không thể kết nối API", "error");
    }
  };

  const viewMessage = (id) => {
    const found = messages.find((m) => m.id === id);
    if (found) setSelectedMessage(found);
  };

  const handleCreate = async () => {
    if (!emailInput || !passInput) {
      showNotification("Vui lòng nhập đầy đủ email và mật khẩu", "error");
      return;
    }
    const fullEmail = `${emailInput.trim()}@${selectedDomain}`;
    try {
      const res = await fetch("https://api.mail.tm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fullEmail,
          password: passInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(`Lỗi tạo tài khoản: ${data["hydra:description"] || "Không rõ"}`, "error");
        return;
      }
      setCreatedAccount({ email: fullEmail, password: passInput });
      showNotification("Tạo tài khoản thành công", "success");
    } catch {
      showNotification("Không thể tạo email mới", "error");
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      {notification && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            background: notification.type === "error"
              ? "#f44336"
              : notification.type === "success"
              ? "#4caf50"
              : "#2196f3",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "0 0 5px 5px",
            zIndex: 1000
          }}
        >
          {notification.text}
        </div>
      )}

      <h2>CheckMail Tool</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Tên email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          style={{ padding: "8px", width: "150px", border: "1px solid #ccc", borderRadius: "4px" }}
        />
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
        >
          {domains.map((d) => (
            <option key={d.id} value={d.domain}>
              @{d.domain}
            </option>
          ))}
        </select>
      </div>

      <input
        type="password"
        placeholder="Nhập mật khẩu"
        value={passInput}
        onChange={(e) => setPassInput(e.target.value)}
        style={{ padding: "8px", width: "250px", border: "1px solid #ccc", borderRadius: "4px", marginBottom: "10px", display: "block" }}
      />

      <button onClick={handleExport} style={{ padding: "8px 12px", marginRight: "5px" }}>Export</button>
      <button onClick={handleCreate} style={{ padding: "8px 12px" }}>Create</button>

      {createdAccount && (
        <div style={{ marginTop: 20 }}>
          <h4>Tài khoản đã tạo:</h4>
          <div>Email: {createdAccount.email}</div>
          <div>Pass: {createdAccount.password}</div>
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>Danh sách tin nhắn:</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {messages.map((msg, index) => (
              <li
                key={msg.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  marginBottom: "8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: "#fff"
                }}
                onClick={() => viewMessage(msg.id)}
              >
                <div style={{ fontWeight: "bold" }}>
                  #{index + 1} - {msg.subject || "(Không có tiêu đề)"} | Code: {msg.code}
                </div>
                <div style={{ fontSize: "12px", color: "#555" }}>
                  From: {msg.fromName} | {new Date(msg.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedMessage && (
        <div style={{ marginTop: 20, padding: "10px", background: "#f9f9f9", borderRadius: "4px" }}>
          <h4>{selectedMessage.subject}</h4>
          <div><strong>From:</strong> {selectedMessage.fromName}</div>
          <div><strong>Date:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}</div>
          <div
            style={{ marginTop: 10, padding: "10px", background: "#fff", border: "1px solid #ddd" }}
            dangerouslySetInnerHTML={{ __html: selectedMessage.html || selectedMessage.text || "" }}
          />
        </div>
      )}
    </div>
  );
}
