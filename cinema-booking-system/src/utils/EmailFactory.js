const EMAIL_TYPES = {
  ACCOUNT_CONFIRM: "ACCOUNT_CONFIRM",
  PASSWORD_RESET: "PASSWORD_RESET",
  PROFILE_UPDATE: "PROFILE_UPDATE",
  BOOKING_CONFIRMATION: "BOOKING_CONFIRMATION",
  PROMOTION_BLAST: "PROMOTION_BLAST",
};

class EmailFactory {
  /**
   * Build a Nodemailer payload based on the requested email type.
   * @param {string} type One of EMAIL_TYPES
   * @param {object} data Data required for the template
   * @returns {{to:string, subject:string, html:string}}
   */
  static create(type, data) {
    switch (type) {
      case EMAIL_TYPES.ACCOUNT_CONFIRM:
        return EmailFactory.#buildAccountConfirmEmail(data);
      case EMAIL_TYPES.PASSWORD_RESET:
        return EmailFactory.#buildPasswordResetEmail(data);
      case EMAIL_TYPES.PROFILE_UPDATE:
        return EmailFactory.#buildProfileUpdateEmail(data);
      case EMAIL_TYPES.BOOKING_CONFIRMATION:
        return EmailFactory.#buildBookingConfirmationEmail(data);
      case EMAIL_TYPES.PROMOTION_BLAST:
        return EmailFactory.#buildPromotionBlastEmail(data);
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  }

  static #buildAccountConfirmEmail({ email, token }) {
    const confirmUrl = `${process.env.BACKEND_URL}/api/auth/confirm/${token}`;
    return {
      to: email,
      subject: "Confirm your account",
      html: `Click <a href="${confirmUrl}">here</a> to confirm your account.`,
    };
  }

  static #buildPasswordResetEmail({ email, token }) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    return {
      to: email,
      subject: "Reset your password",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password (expires in 1 hour):</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
      `,
    };
  }

  static #buildProfileUpdateEmail({ email, changes = [] }) {
    return {
      to: email,
      subject: "Your profile has been updated",
      html: `
        <h2>Your profile has been updated</h2>
        <p>The following fields were changed:</p>
        <ul>
          ${changes.map((c) => `<li>${c}</li>`).join("")}
        </ul>
        <p>If you did not make these changes, please contact support immediately.</p>
      `,
    };
  }

  static #buildBookingConfirmationEmail({ email, booking }) {
    if (!booking) {
      throw new Error("Booking data is required for booking confirmation emails.");
    }

    const dt = booking.startTime ? new Date(booking.startTime) : null;
    const showtimeStr = dt
      ? dt.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "Unknown showtime";

    const seatList = (booking.seats || [])
      .map((s) => `${s.row}${s.number}`)
      .join(", ");

    const ticketCount =
      booking.ticketCount || (booking.seats ? booking.seats.length : 0);

    return {
      to: email,
      subject: "Your Bulldog Cinemas Booking Confirmation",
      html: `
        <h2>Your Bulldog Cinemas Booking is Confirmed</h2>
        <p>Hi ${booking.firstName || ""},</p>
        <p>Thank you for your purchase. Here are your booking details:</p>
        <ul>
          <li><strong>Movie:</strong> ${booking.movieTitle || "Movie"}</li>
          <li><strong>Theatre:</strong> ${booking.theatreName || "Bulldog Cinemas"} ${
            booking.showroom ? `– Showroom ${booking.showroom}` : ""
          }</li>
          <li><strong>Showtime:</strong> ${showtimeStr}</li>
          <li><strong>Seats:</strong> ${seatList || "N/A"}</li>
          <li><strong>Tickets:</strong> ${ticketCount}</li>
        </ul>
        <p>Enjoy your movie!</p>
      `,
    };
  }

  static #buildPromotionBlastEmail({ email, promo }) {
    if (!promo) {
      throw new Error("Promo data is required for promotion blast emails.");
    }

    const discountText =
      promo.discountType === "PERCENT"
        ? `${promo.discountValue}% OFF`
        : `$${promo.discountValue} OFF`;

    return {
      to: email,
      subject: "New Promotion from Bulldog Cinemas!",
      html: `
        <h2>${promo._id} - ${discountText}</h2>
        <div style="background-color: #333; color: #fff; padding: 15px; border-radius: 5px;">
          <p style="color: #fff; margin: 0;">${promo.description}</p>
        </div>
        <p>Valid from ${new Date(promo.validFrom).toDateString()} to ${new Date(
          promo.validTo
        ).toDateString()}</p>
      `,
    };
  }
}

module.exports = {
  EmailFactory,
  EMAIL_TYPES,
};

