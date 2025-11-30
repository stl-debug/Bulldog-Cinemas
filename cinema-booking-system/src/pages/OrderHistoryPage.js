// src/pages/OrderHistoryPage.js
import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:5001";

function OrderHistoryPage() {
  const { user } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return; // not logged in yet

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("Missing auth token. Please log in again.");
          return;
        }

        const res = await fetch(`${API_BASE}/api/auth/orders`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        setOrders(data.orders || []);
      } catch (err) {
        console.error("Failed to load orders:", err);
        setError(err.message || "Failed to load order history");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    // keep this super simple, no redirects to avoid loops
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem" }}>
        <h1>Order History</h1>
        <p>You need to be logged in to view your order history.</p>
        <a href="/login?redirect=/order-history">Go to login</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem" }}>
      <h1>Order History</h1>

      {loading && <p>Loading your orders...</p>}
      {error && (
        <p style={{ color: "red" }}>Error loading order history: {error}</p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p>You haven&apos;t placed any orders yet.</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {orders.map((order) => {
            const dt = order.startTime ? new Date(order.startTime) : null;
            const dateStr = dt
              ? dt.toLocaleString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "N/A";

            return (
              <div
                key={order.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                }}
              >
                <h3 style={{ marginBottom: 4 }}>
                  {order.movieTitle || "Movie"}
                </h3>
                <p style={{ margin: 0 }}>
                  <strong>Theatre:</strong>{" "}
                  {order.theatreName || "Bulldog Cinemas"}{" "}
                  {order.showroom ? `– Showroom ${order.showroom}` : ""}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Showtime:</strong> {dateStr}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Seats:</strong>{" "}
                  {order.seats && order.seats.length > 0
                    ? order.seats.join(", ")
                    : "N/A"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Tickets:</strong>{" "}
                  {order.ticketCount || order.seats?.length || 0}
                  {order.ageCategories && order.ageCategories.length > 0 && (
                    <> ({order.ageCategories.join(", ")})</>
                  )}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Total Paid:</strong>{" "}
                  {order.total != null ? `$${order.total.toFixed(2)}` : "N/A"}
                </p>
                {order.paymentLast4 && (
                  <p style={{ margin: 0 }}>
                    <strong>Card:</strong> **** **** **** {order.paymentLast4}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
                  <strong>Booked on:</strong>{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("en-US")
                    : "N/A"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrderHistoryPage;
