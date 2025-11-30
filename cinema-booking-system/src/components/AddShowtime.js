import React, { useEffect, useState } from "react";
import styles from "../styles/AdminHome.module.css";
import axios from "axios";

export default function AddShowtime() {
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState("");
  const [showrooms] = useState(["Auditorium 1", "Auditorium 2", "Auditorium 3"]);
  const [selectedShowroom, setSelectedShowroom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadMovies() {
      try {
        const res = await axios.get(`/api/movies`);
        setMovies(res.data || []);
      } catch (err) {
        console.error("Failed to load movies", err);
      }
    }
    loadMovies();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!selectedMovie || !selectedShowroom) {
      setMessage("Please select a movie and showroom.");
      return;
    }
    if (!startDate || !endDate || !time) {
      setMessage("Please provide a from date, to date, and a time.");
      return;
    }

    try {
      // Normalize date inputs to YYYY-MM-DD
      const normalizeDate = (d) => {
        // If already in YYYY-MM-DD, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const dt = new Date(d);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const day = String(dt.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      const normalizedStart = normalizeDate(startDate);
      const normalizedEnd = normalizeDate(endDate);

      // Normalize time to 24h HH:mm for backend, accepting "1:30 PM" or "13:30"
      const normalizeTime = (t) => {
        const ampmMatch = t.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
        if (ampmMatch) {
          let hh = parseInt(ampmMatch[1], 10);
          const mm = ampmMatch[2];
          const ampm = ampmMatch[3].toUpperCase();
          if (ampm === "PM" && hh !== 12) hh += 12;
          if (ampm === "AM" && hh === 12) hh = 0;
          return `${String(hh).padStart(2, "0")}:${mm}`;
        }
        // Fallback: try Date parsing
        const dateObj = new Date(`1970-01-01T${t}`);
        const hh = String(dateObj.getHours()).padStart(2, "0");
        const mm = String(dateObj.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      };

      const normalizedTime = normalizeTime(time);

      const payload = {
        movieId: selectedMovie,
        showroom: selectedShowroom,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        times: [normalizedTime],
      };
      const res = await axios.post(`/api/showtimes/bulk`, payload);
      setMessage(`Created ${res.data.created} showtimes.`);
    } catch (err) {
      console.error("Error creating showtime:", err);
      const apiError = err.response?.data?.error;
      setMessage(apiError ? `Error: ${apiError}` : "Failed to create showtimes.");
    }
  }

  return (
    <div className={styles.card}>
      <h2>Add Showtime</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Movie *
          <select value={selectedMovie} onChange={(e) => setSelectedMovie(e.target.value)}>
            <option value="">Select a movie</option>
            {movies.map((m) => (
              <option key={m._id} value={m._id}>{m.title}</option>
            ))}
          </select>
        </label>

        <label>
          Showroom *
          <select value={selectedShowroom} onChange={(e) => setSelectedShowroom(e.target.value)}>
            <option value="">Select a showroom</option>
            {showrooms.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          From Date *
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          To Date *
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label>
          Time (24h) *
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>

        <button type="submit">Create</button>
      </form>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}

