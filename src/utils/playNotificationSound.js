/**
 * 🔊 Vanguard IC — เล่นเสียงแจ้งเตือนผ่าน Web Audio API
 * ใช้ร่วมกันทั้ง useNotifications และ useNurseNotifications
 */
export function playNotificationSound() {
  try {
    // ✅ เช็คว่า Browser รองรับ Web Audio API หรือไม่
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    
    // ✅ iOS Fix — ต้อง resume ก่อน (iOS Safari ต้องใช้ user gesture)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        playTone(audioContext);
      }).catch(() => {
        // Silent fail — ไม่กระทบการทำงานหลัก
      });
    } else {
      playTone(audioContext);
    }
  } catch (error) {
    // Silent fail — not critical
    console.debug('Notification sound failed:', error.message);
  }
}

/**
 * 🎵 เล่นเสียง Beep สั้นๆ
 */
function playTone(audioContext) {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // เสียง Beep ความถี่ 800Hz
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    // เริ่มดังแล้วค่อยๆ เบาลง (ป้องกันหูแตก)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    // เล่น 0.3 วินาที
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // ✅ Cleanup — ป้องกัน memory leak
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    // Silent fail
  }
}