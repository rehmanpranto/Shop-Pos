/** Turns a local Bangladeshi number like 017XXXXXXXX into the international form WhatsApp needs. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return `88${digits}`;
  if (digits.length === 13 && digits.startsWith("8801")) return digits;
  if (digits.length >= 10 && !digits.startsWith("0")) return digits;
  return null;
}

/** Link that opens WhatsApp with a message ready to send. Null when the phone number is unusable. */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
