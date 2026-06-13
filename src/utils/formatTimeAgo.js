/**
 * แปลง timestamp เป็นข้อความ "เมื่อ X นาทีที่แล้ว"
 * ใช้ร่วมกันทั้ง ICCommandCenter และ WardNursePane
 */
export function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  if (days < 7) return `${days} วันที่แล้ว`;

  return new Date(timestamp).toLocaleDateString("th-TH");
}