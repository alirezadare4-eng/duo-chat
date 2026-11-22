// Image compression utility for fast MQTT and safe localStorage
export function compressImage(file, maxWidth = 1000, maxHeightOrQuality = 0.75, qualityArg = 0.75) {
  return new Promise((resolve, reject) => {
    let quality = 0.75;
    let maxHeight = maxWidth;
    if (typeof maxHeightOrQuality === 'number') {
      if (maxHeightOrQuality <= 1) {
        quality = maxHeightOrQuality;
      } else {
        maxHeight = maxHeightOrQuality;
        quality = typeof qualityArg === 'number' && qualityArg <= 1 ? qualityArg : 0.75;
      }
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || (maxHeight && height > maxHeight)) {
          const ratio = Math.min(maxWidth / width, maxHeight ? maxHeight / height : 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Generate unique message ID
export function generateMessageId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// Format seconds into 00:00
export function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

