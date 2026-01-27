// Guest booking storage utilities
// Stores guest contact info in localStorage so they can access their bookings

const GUEST_BOOKING_KEY = "smEliteHajj_guestBooking";

interface GuestBookingInfo {
  email: string;
  phone: string;
  name: string;
  bookingIds: string[];
  lastBookingAt: string;
}

export const saveGuestBookingInfo = (
  email: string,
  phone: string,
  name: string,
  bookingId: string
) => {
  try {
    const existing = getGuestBookingInfo();
    const bookingIds = existing?.bookingIds || [];
    
    // Add new booking ID if not already present
    if (!bookingIds.includes(bookingId)) {
      bookingIds.push(bookingId);
    }

    const info: GuestBookingInfo = {
      email: email || existing?.email || "",
      phone: phone || existing?.phone || "",
      name: name || existing?.name || "",
      bookingIds,
      lastBookingAt: new Date().toISOString(),
    };

    localStorage.setItem(GUEST_BOOKING_KEY, JSON.stringify(info));
  } catch (error) {
    console.error("Error saving guest booking info:", error);
  }
};

export const getGuestBookingInfo = (): GuestBookingInfo | null => {
  try {
    const stored = localStorage.getItem(GUEST_BOOKING_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading guest booking info:", error);
    return null;
  }
};

export const hasGuestBookings = (): boolean => {
  const info = getGuestBookingInfo();
  return !!(info && info.bookingIds && info.bookingIds.length > 0);
};

export const clearGuestBookingInfo = () => {
  try {
    localStorage.removeItem(GUEST_BOOKING_KEY);
  } catch (error) {
    console.error("Error clearing guest booking info:", error);
  }
};
