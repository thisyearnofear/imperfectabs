import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: "32rem", width: "100%", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "3.75rem",
            fontWeight: "900",
            color: "#dc2626",
            marginBottom: "1rem",
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "900",
            textTransform: "uppercase",
            color: "#000",
            marginBottom: "1rem",
          }}
        >
          Page Not Found
        </h2>
        <p
          style={{
            color: "#4b5563",
            fontFamily: "monospace",
            marginBottom: "1.5rem",
          }}
        >
          The page you're looking for doesn't exist.
          <br />
          Let's get you back to your workout!
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            backgroundColor: "#2563eb",
            color: "white",
            fontWeight: "bold",
            fontSize: "1.125rem",
            padding: "0.75rem 1.5rem",
            border: "4px solid black",
            textTransform: "uppercase",
            transition: "all 0.2s",
            textDecoration: "none",
          }}
        >
          🏠 Go Home
        </Link>
      </div>
    </div>
  );
}
