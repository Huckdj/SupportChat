import { useState, useEffect } from "react";

export default function CheckMail() {
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [token, setToken] = useState("");
  const [notification, setNotification] = useState(null);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [createdAccounts, setCreatedAccounts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

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

  // Copy text to clipboard
  const copyToClipboard = async (text, index = null) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== null) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
      showNotification("Đã copy!", "success");
    } catch {
      showNotification("Không thể copy", "error");
    }
  };

  // Copy all accounts
  const copyAllAccounts = () => {
    const allAccountsText = createdAccounts
      .map(acc => `${acc.email}|${acc.password}`)
      .join('\n');
    copyToClipboard(allAccountsText);
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

  const handleCreateMultiple = async () => {
    if (!emailInput || !passInput) {
      showNotification("Vui lòng nhập danh sách email và mật khẩu", "error");
      return;
    }

    // Parse danh sách email từ input
    const emailNames = emailInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (emailNames.length === 0) {
      showNotification("Vui lòng nhập ít nhất một tên email", "error");
      return;
    }

    setIsCreating(true);
    const newAccounts = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emailNames.length; i++) {
      const emailName = emailNames[i];
      const fullEmail = `${emailName}@${selectedDomain}`;
      
      // Hiển thị tiến trình
      showNotification(`Đang tạo ${i + 1}/${emailNames.length}: ${emailName}`, "info");
      
      let retryCount = 0;
      let created = false;
      
      while (retryCount < 3 && !created) {
        try {
          const res = await fetch("https://api.mail.tm/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: fullEmail,
              password: passInput
            })
          });
          
          if (res.status === 429) {
            // Rate limit - chờ lâu hơn
            const waitTime = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
            showNotification(`Rate limit - Chờ ${waitTime/1000}s rồi thử lại...`, "info");
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }
          
          const data = await res.json();
          
          if (res.ok) {
            newAccounts.push({ email: fullEmail, password: passInput });
            successCount++;
            created = true;
            showNotification(`✅ Tạo thành công: ${emailName}`, "success");
          } else {
            failCount++;
            console.log(`Lỗi tạo ${fullEmail}: ${data["hydra:description"] || "Không rõ"}`);
            created = true; // Dừng retry cho lỗi không phải 429
          }
        } catch (error) {
          retryCount++;
          if (retryCount >= 3) {
            failCount++;
            console.log(`Lỗi kết nối khi tạo ${fullEmail}`);
            created = true;
          } else {
            // Chờ trước khi retry
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      // Delay 5s giữa các request để tránh rate limit
      if (i < emailNames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    setCreatedAccounts(newAccounts);
    setIsCreating(false);
    
    if (successCount > 0) {
      showNotification(`Hoàn thành! Tạo thành công ${successCount}/${emailNames.length} tài khoản`, "success");
    } else {
      showNotification("Không tạo được tài khoản nào", "error");
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: "1200px" }}>
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

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Panel tạo email */}
        <div style={{ flex: "1", minWidth: "300px", border: "1px solid #ddd", padding: "15px", borderRadius: "8px" }}>
          <h3>Tạo Email Mới</h3>
          
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
              Danh sách tên email (mỗi dòng một tên):
            </label>
            <textarea
              placeholder={`dangxuanhoa323\ndoanhphuong709\nvoanhhuy557\ntranthanhdung328\nhoangngocphuong826`}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{ 
                padding: "8px", 
                width: "100%", 
                height: "120px",
                border: "1px solid #ccc", 
                borderRadius: "4px",
                resize: "vertical",
                fontFamily: "monospace"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" }}>
            <span>@</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px", flex: 1 }}
            >
              {domains.map((d) => (
                <option key={d.id} value={d.domain}>
                  {d.domain}
                </option>
              ))}
            </select>
          </div>

          <input
            type="password"
            placeholder="Mật khẩu chung cho tất cả"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            style={{ 
              padding: "8px", 
              width: "100%", 
              border: "1px solid #ccc", 
              borderRadius: "4px", 
              marginBottom: "10px" 
            }}
          />

          <button 
            onClick={handleCreateMultiple} 
            disabled={isCreating}
            style={{ 
              padding: "10px 15px", 
              background: isCreating ? "#ccc" : "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isCreating ? "not-allowed" : "pointer",
              width: "100%"
            }}
          >
            {isCreating ? "Đang tạo..." : "Tạo Tất Cả"}
          </button>
        </div>

        {/* Panel check email */}
        <div style={{ flex: "1", minWidth: "300px", border: "1px solid #ddd", padding: "15px", borderRadius: "8px" }}>
          <h3>Kiểm Tra Email</h3>
          
          <input
            type="text"
            placeholder="Email đầy đủ (ví dụ: test@domain.com)"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            style={{ 
              padding: "8px", 
              width: "100%", 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              marginBottom: "10px"
            }}
          />

          <input
            type="password"
            placeholder="Mật khẩu"
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            style={{ 
              padding: "8px", 
              width: "100%", 
              border: "1px solid #ccc", 
              borderRadius: "4px", 
              marginBottom: "10px" 
            }}
          />

          <button 
            onClick={handleExport} 
            style={{ 
              padding: "10px 15px", 
              background: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%"
            }}
          >
            Kiểm Tra Email
          </button>
        </div>
      </div>

      {/* Danh sách tài khoản đã tạo */}
      {createdAccounts.length > 0 && (
        <div style={{ marginTop: 20, border: "1px solid #ddd", padding: "15px", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3>Tài Khoản Đã Tạo ({createdAccounts.length})</h3>
            <button
              onClick={copyAllAccounts}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 12px",
                background: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              📋 Copy Tất Cả
            </button>
          </div>
          
          <div style={{ background: "#f5f5f5", padding: "10px", borderRadius: "4px", marginBottom: "15px" }}>
            <strong>Định dạng xuất:</strong> mail|pass
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {createdAccounts.map((account, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: "4px"
                }}
              >
                <code style={{ fontFamily: "monospace", fontSize: "14px" }}>
                  {account.email}|{account.password}
                </code>
                <button
                  onClick={() => copyToClipboard(`${account.email}|${account.password}`, index)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 8px",
                    background: copiedIndex === index ? "#4caf50" : "#2196f3",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  {copiedIndex === index ? (
                    <>
                      ✅ Copied
                    </>
                  ) : (
                    <>
                      📋 Copy
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách tin nhắn */}
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

      {/* Chi tiết tin nhắn */}
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