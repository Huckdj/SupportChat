import { useState } from "react";

export default function App() {
  const [name, setName] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = () => {
    const now = new Date();
    const formattedDate = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    const result = `date:\t${formattedDate}\nsubject:\t${name} just sent you money 💸`;
    setOutput(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      <h2>Register</h2>

      <input
        type="text"
        placeholder="Nhập tên..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          padding: "8px",
          marginBottom: "10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          width: "250px",
          textAlign: "center"
        }}
      />

      <button onClick={handleSubmit} style={{ padding: "8px 12px" }}>
        Xuất dữ liệu
      </button>

      {output && (
        <div style={{ marginTop: "20px" }}>
          <pre
            style={{
              background: "#f4f4f4",
              padding: "10px",
              borderRadius: "4px",
              textAlign: "left"
            }}
          >
            {output}
          </pre>
          <button onClick={handleCopy} style={{ padding: "8px 12px" }}>
            Copy
          </button>
          {copied && <div style={{ color: "green", marginTop: "5px" }}>Copied!</div>}
        </div>
      )}
    </div>
  );
}
