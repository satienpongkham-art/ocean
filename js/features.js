// ─── เปิด/ปิดฟีเจอร์เสริม (ซ่อนสิ่งที่ไม่ใช้ ให้แอปโล่งขึ้น) ───
import * as store from './store.js';
export const FEATURES = [
  ['call', 'โหมดโทรรวด', 'จับเวลาโทรทีละคน', 'flame'],
  ['mandala', 'แมนฮาร่าเป้าหมาย', 'ตารางเป้าหมาย 9 ช่อง', 'grid'],
  ['review', 'ทบทวนสัปดาห์', 'สรุปคะแนนและกิจกรรมรายสัปดาห์', 'line'],
  ['train', 'ฝึกตัวเอง', 'ฝึกจำแผน ซ้อมข้อโต้แย้ง', 'bulb'],
  ['objections', 'รับมือข้อโต้แย้ง', 'การ์ดฝึกตอบคำถามลูกค้า', 'chat'],
  ['simulate', 'จำลองเหตุการณ์', 'จำลองค่าใช้จ่ายเมื่อเจ็บป่วย', 'heart'],
  ['bodymap', 'แผนที่ร่างกาย & เส้นทางชีวิต', 'ภาพอธิบายความคุ้มครอง', 'compass'],
  ['island', 'แถบสดด้านบนจอ', 'นับถอยหลังโทรรวด เตือนก่อนถึงนัด', 'bell'],
  ['basket', 'ปุ่มลอยชุดแผน', 'ชุดแผนที่กำลังคุย มุมซ้ายล่าง', 'plans'],
  ['fx', 'พลุฉลอง & การ์ดเอียง', 'ลูกเล่นตอนปิดการขาย', 'star'],
];
export const featureOn = (id) => (store.getSettings().features || {})[id] !== false;
export function setFeature(id, on) { store.saveSettings({ features: { ...(store.getSettings().features || {}), [id]: !!on } }); }
