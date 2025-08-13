// Simple contrast checker (WCAG approximate)
// Usage: contrast('#ffffff', '#1a1a1a') >= 4.5
export function luminance(hex: string) {
  const c = hex.replace('#','');
  const bigint = parseInt(c.length===3 ? c.split('').map(x=>x+x).join('') : c,16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const toLin = (v:number)=> {
    const srgb = v/255;
    return srgb <= 0.03928 ? srgb/12.92 : Math.pow((srgb+0.055)/1.055,2.4);
  };
  return 0.2126*toLin(r)+0.7152*toLin(g)+0.0722*toLin(b);
}

export function contrast(hex1: string, hex2: string) {
  const L1 = luminance(hex1) + 0.05;
  const L2 = luminance(hex2) + 0.05;
  return L1 > L2 ? +(L1/L2).toFixed(2) : +(L2/L1).toFixed(2);
}

export function passesAA(ratio: number, large=false) {
  return large ? ratio >= 3 : ratio >= 4.5;
}

export function passesAAA(ratio: number, large=false) {
  return large ? ratio >= 4.5 : ratio >= 7;
}
