export const fmt = (dateStr, opts) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', opts).format(d);
};

export const normalizeRecord = (item = {}) => {
  const tanggalRaw = item.tanggal_periksa || item.Tanggal || item.tanggal || item.created_at || item.CreatedAt;
  const sys = item.sistolik ?? item.Sistole ?? item.sistole ?? 0;
  const dia = item.diastolik ?? item.Diastole ?? item.diastole ?? 0;
  const tb = item.tinggi_badan ?? item.TinggiBadan ?? 0;
  const bb = item.berat_badan ?? item.BeratBadan ?? 0;
  const gd = item.gula_darah ?? item.GulaDarah ?? item.guladarah ?? 0;
  const gol = item.golongan_darah || item.GolonganDarah || '-';
  const src = item.sumber || item.Sumber || 'mandiri';
  const status = item.status_kesehatan || item.StatusKesehatan || 'sehat';
  const kel = item.keluhan || item.Keluhan || '';
  const cat = item.catatan || item.Catatan || '';
  const dateObj = tanggalRaw ? new Date(tanggalRaw) : new Date();
  
  let bmiVal = item.bmi;
  if (bmiVal == null) {
    const h = Number(tb) / 100;
    const w = Number(bb);
    if (h > 0 && w > 0) {
      bmiVal = Number((w / (h * h)).toFixed(1));
    } else {
      bmiVal = 0;
    }
  }

  return {
    id: item.id || item.ID || 0,
    tanggal_periksa: dateObj ? dateObj.toISOString() : null,
    tinggi_badan: Number(tb) || 0,
    berat_badan: Number(bb) || 0,
    sistolik: Number(sys) || 0,
    diastolik: Number(dia) || 0,
    gula_darah: Number(gd) || 0,
    bmi: Number(bmiVal) || 0,
    golongan_darah: gol,
    sumber: src,
    status_kesehatan: status,
    keluhan: kel || cat,
  };
};

export const calculateHealthScore = (record) => {
  if (!record) return 0;
  
  let scores = [];
  let weights = [];
  
  const bmi = parseFloat(record.bmi);
  if (!isNaN(bmi) && bmi > 0) {
    let bmiScore = 50;
    if (bmi >= 18.5 && bmi < 25) bmiScore = 100;
    else if (bmi >= 25 && bmi < 30) bmiScore = 80;
    else if (bmi >= 17 && bmi < 18.5) bmiScore = 80;
    else bmiScore = 50;
    
    scores.push(bmiScore);
    weights.push(0.30);
  }
  
  const sys = parseInt(record.sistolik);
  const dia = parseInt(record.diastolik);
  if (!isNaN(sys) && sys > 0 && !isNaN(dia) && dia > 0) {
    let bpScore = 50;
    if (sys < 120 && dia < 80) bpScore = 100;
    else if (sys < 140 && dia < 90) bpScore = 80;
    else bpScore = 50;
    
    scores.push(bpScore);
    weights.push(0.30);
  }
  
  const gd = parseInt(record.gula_darah);
  let gdWeight = 0;
  if (!isNaN(gd) && gd > 0) {
    let gdScore = 50;
    if (gd >= 70 && gd <= 140) gdScore = 100;
    else if (gd > 140 && gd <= 200) gdScore = 75;
    else gdScore = 50;
    
    scores.push(gdScore);
    gdWeight = 0.10;
  }
  
  let lifestyleParsed = false;
  let stressScore = 100;
  let lifestyleScore = 100;
  
  if (record.keluhan && record.keluhan.startsWith('{')) {
    try {
      const data = JSON.parse(record.keluhan);
      if (data.is_screening_realistis) {
        lifestyleParsed = true;
        
        const stress = parseInt(data.tingkat_stres);
        if (!isNaN(stress)) {
          if (stress <= 3) stressScore = 100;
          else if (stress <= 6) stressScore = 80;
          else stressScore = 50;
        }
        
        const sleep = parseFloat(data.jam_tidur);
        let sleepScore = 100;
        if (!isNaN(sleep)) {
          if (sleep >= 7 && sleep <= 9) sleepScore = 100;
          else if (sleep === 6) sleepScore = 80;
          else sleepScore = 50;
        }
        
        const exercise = parseInt(data.olahraga);
        let exerciseScore = 100;
        if (!isNaN(exercise)) {
          if (exercise >= 3) exerciseScore = 100;
          else if (exercise >= 1) exerciseScore = 80;
          else exerciseScore = 50;
        }
        
        const water = parseFloat(data.konsumsi_air);
        let waterScore = 100;
        if (!isNaN(water)) {
          if (water >= 2.0) waterScore = 100;
          else if (water >= 1.5) waterScore = 80;
          else waterScore = 50;
        }
        
        const complaints = data.daftar_keluhan || [];
        let complaintsPenalty = complaints.length * 10;
        
        lifestyleScore = Math.max(50, ((sleepScore + exerciseScore + waterScore) / 3) - complaintsPenalty);
      }
    } catch (_) {}
  }
  
  if (lifestyleParsed) {
    scores.push(stressScore);
    weights.push(gdWeight > 0 ? 0.15 : 0.20);
    
    scores.push(lifestyleScore);
    weights.push(gdWeight > 0 ? 0.15 : 0.20);
  }
  
  if (gdWeight > 0) {
    weights.push(gdWeight);
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 75;
  
  let finalScore = 0;
  for (let i = 0; i < scores.length; i++) {
    finalScore += scores[i] * (weights[i] / totalWeight);
  }
  
  return Math.round(finalScore);
};

export const calculateStreak = (riwayat) => {
  if (!riwayat || riwayat.length === 0) return 0;
  
  const dates = riwayat
    .map(r => {
      const parsed = r.tanggal_periksa || r.Tanggal || r.tanggal;
      return parsed ? new Date(parsed) : null;
    })
    .filter(Boolean)
    .sort((a, b) => b - a);
    
  if (dates.length === 0) return 0;
  
  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };
  
  const today = new Date();
  const currentWeekStart = getStartOfWeek(today);
  
  const uniqueWeekStarts = Array.from(
    new Set(dates.map(d => getStartOfWeek(d).getTime()))
  ).sort((a, b) => b - a);
  
  if (uniqueWeekStarts.length === 0) return 0;
  
  let streak = 0;
  let expectedWeekStart = currentWeekStart.getTime();
  
  if (uniqueWeekStarts[0] !== expectedWeekStart) {
    const prevWeekStart = expectedWeekStart - 7 * 24 * 60 * 60 * 1000;
    if (uniqueWeekStarts[0] === prevWeekStart) {
      expectedWeekStart = prevWeekStart;
    } else {
      return 0;
    }
  }
  
  for (let i = 0; i < uniqueWeekStarts.length; i++) {
    if (uniqueWeekStarts[i] === expectedWeekStart) {
      streak++;
      expectedWeekStart -= 7 * 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }
  
  return streak;
};

export const getInterpretationDelta = (current, previous) => {
  if (!current) return null;
  if (!previous) {
    return {
      message: "Ini adalah pemeriksaan pertamamu! Teruskan kebiasaan rutin mingguan ini untuk memantau kesehatan tubuh & pikiranmu secara berkala. 🔥",
      type: "info"
    };
  }
  
  const weightDiff = current.berat_badan - previous.berat_badan;
  const bmiDiff = current.bmi - previous.bmi;
  const sysDiff = current.sistolik - previous.sistolik;
  const diaDiff = current.diastolik - previous.diastolik;
  
  let messages = [];
  let isGood = true;
  
  if (Math.abs(weightDiff) >= 0.5) {
    const direction = weightDiff > 0 ? "naik" : "turun";
    messages.push(`Berat badanmu ${direction} ${Math.abs(weightDiff).toFixed(1)} kg dibanding pemeriksaan sebelumnya.`);
    if (current.bmi >= 25 && weightDiff > 0) isGood = false;
  }
  
  if (Math.abs(bmiDiff) >= 0.1) {
    const direction = bmiDiff > 0 ? "naik" : "turun";
    messages.push(`Indeks Massa Tubuh (BMI) kamu ${direction} ${Math.abs(bmiDiff).toFixed(1)} poin.`);
  }

  if (Math.abs(sysDiff) >= 5 || Math.abs(diaDiff) >= 5) {
    if (current.sistolik >= 130 || current.diastolik >= 85) {
      if (sysDiff > 0 || diaDiff > 0) {
        messages.push(`Tensi darah kamu meningkat (+${sysDiff}/${diaDiff} mmHg) mendekati batas pre-hipertensi.`);
        isGood = false;
      }
    } else if (sysDiff < 0 || diaDiff < 0) {
      messages.push(`Kabar baik! Tensi darah kamu terpantau menurun (-${Math.abs(sysDiff)}/-${Math.abs(diaDiff)} mmHg) menuju normal.`);
    }
  }
  
  let currentStress = null, prevStress = null;
  if (current.keluhan && current.keluhan.startsWith('{')) {
    try { currentStress = JSON.parse(current.keluhan).tingkat_stres; } catch (_) {}
  }
  if (previous.keluhan && previous.keluhan.startsWith('{')) {
    try { prevStress = JSON.parse(previous.keluhan).tingkat_stres; } catch (_) {}
  }
  
  if (currentStress !== null && prevStress !== null) {
    const stressDiff = currentStress - prevStress;
    if (stressDiff < 0) {
      messages.push(`Tingkat stresmu berkurang ${Math.abs(stressDiff)} poin dari sebelumnya. Pikiranmu semakin rileks! 🧘‍♂️`);
    } else if (stressDiff > 0) {
      messages.push(`Tingkat stresmu terpantau naik ${stressDiff} poin. Luangkan waktu untuk istirahat sejenak.`);
      if (currentStress >= 7) isGood = false;
    }
  }
  
  if (messages.length === 0) {
    return {
      message: "Kondisi fisik & gaya hidupmu terpantau stabil dibanding pemeriksaan sebelumnya. Pertahankan konsistensi ini! 👍",
      type: "success"
    };
  }
  
  return {
    message: messages.join(" "),
    type: isGood ? "success" : "warning"
  };
};
