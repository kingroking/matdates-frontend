export const calculateWeightClass = (federation, ageNum, gender, weightLbs, belt, isGi = true) => {
  const weight = parseFloat(weightLbs);
  const age = parseInt(ageNum) || 12;
  const beltDisplay = belt ? `${belt} Belt` : '';
  
  let fed = (federation || 'Other').toUpperCase();
  if (fed.includes('IBJJF')) fed = 'IBJJF';
  else if (fed.includes('JJWL')) fed = 'JJWL';
  else if (fed.includes('ADCC') || fed.includes('SUPER FIGHT') || fed.includes('UFC')) fed = 'ADCC';
  else fed = 'Other';

  const effectiveGi = fed === 'ADCC' ? false : isGi;

  if (fed === 'IBJJF') {
    if (age >= 18) {
      if (gender === 'Male') {
        if (effectiveGi) {
          if (weight <= 127.0) return `Adult Gi ${beltDisplay} Rooster (127.0 lbs)`;
          if (weight <= 141.5) return `Adult Gi ${beltDisplay} Light Feather (141.5 lbs)`;
          if (weight <= 154.5) return `Adult Gi ${beltDisplay} Feather (154.5 lbs)`;
          if (weight <= 168.0) return `Adult Gi ${beltDisplay} Light (168.0 lbs)`;
          if (weight <= 181.5) return `Adult Gi ${beltDisplay} Middle (181.5 lbs)`;
          if (weight <= 195.0) return `Adult Gi ${beltDisplay} Medium Heavy (195.0 lbs)`;
          if (weight <= 208.0) return `Adult Gi ${beltDisplay} Heavy (208.0 lbs)`;
          if (weight <= 222.0) return `Adult Gi ${beltDisplay} Super Heavy (222.0 lbs)`;
          return `Adult Gi ${beltDisplay} Ultra Heavy (No Maximum)`;
        } else {
          if (weight <= 122.5) return `Adult No-Gi ${beltDisplay} Rooster (122.5 lbs)`;
          if (weight <= 136.0) return `Adult No-Gi ${beltDisplay} Light Feather (136.0 lbs)`;
          if (weight <= 149.0) return `Adult No-Gi ${beltDisplay} Feather (149.0 lbs)`;
          if (weight <= 162.5) return `Adult No-Gi ${beltDisplay} Light (162.5 lbs)`;
          if (weight <= 175.5) return `Adult No-Gi ${beltDisplay} Middle (175.5 lbs)`;
          if (weight <= 188.5) return `Adult No-Gi ${beltDisplay} Medium Heavy (188.5 lbs)`;
          if (weight <= 202.0) return `Adult No-Gi ${beltDisplay} Heavy (202.0 lbs)`;
          if (weight <= 215.0) return `Adult No-Gi ${beltDisplay} Super Heavy (215.0 lbs)`;
          return `Adult No-Gi ${beltDisplay} Ultra Heavy (No Maximum)`;
        }
      }
      if (gender === 'Female') {
        if (effectiveGi) {
          if (weight <= 107.0) return `Adult Gi ${beltDisplay} Rooster (107.0 lbs)`;
          if (weight <= 118.0) return `Adult Gi ${beltDisplay} Light Feather (118.0 lbs)`;
          if (weight <= 129.0) return `Adult Gi ${beltDisplay} Feather (129.0 lbs)`;
          if (weight <= 141.5) return `Adult Gi ${beltDisplay} Light (141.5 lbs)`;
          if (weight <= 152.5) return `Adult Gi ${beltDisplay} Middle (152.5 lbs)`;
          if (weight <= 163.5) return `Adult Gi ${beltDisplay} Medium Heavy (163.5 lbs)`;
          if (weight <= 175.0) return `Adult Gi ${beltDisplay} Heavy (175.0 lbs)`;
          return `Adult Gi ${beltDisplay} Super Heavy (No Maximum)`;
        } else {
          if (weight <= 103.0) return `Adult No-Gi ${beltDisplay} Rooster (103.0 lbs)`;
          if (weight <= 113.5) return `Adult No-Gi ${beltDisplay} Light Feather (113.5 lbs)`;
          if (weight <= 124.5) return `Adult No-Gi ${beltDisplay} Feather (124.5 lbs)`;
          if (weight <= 135.5) return `Adult No-Gi ${beltDisplay} Light (135.5 lbs)`;
          if (weight <= 146.5) return `Adult No-Gi ${beltDisplay} Middle (146.5 lbs)`;
          if (weight <= 157.5) return `Adult No-Gi ${beltDisplay} Medium Heavy (157.5 lbs)`;
          if (weight <= 169.0) return `Adult No-Gi ${beltDisplay} Heavy (169.0 lbs)`;
          return `Adult No-Gi ${beltDisplay} Super Heavy (No Maximum)`;
        }
      }
    } else {
      if (age >= 16) {
        if (gender === 'Male') {
          if (effectiveGi) {
            if (weight <= 118.0) return `Juvenile Gi ${beltDisplay} Rooster (118.0 lbs)`;
            if (weight <= 129.0) return `Juvenile Gi ${beltDisplay} Light Feather (129.0 lbs)`;
            if (weight <= 141.5) return `Juvenile Gi ${beltDisplay} Feather (141.5 lbs)`;
            if (weight <= 152.5) return `Juvenile Gi ${beltDisplay} Light (152.5 lbs)`;
            if (weight <= 163.5) return `Juvenile Gi ${beltDisplay} Middle (163.5 lbs)`;
            if (weight <= 175.0) return `Juvenile Gi ${beltDisplay} Medium Heavy (175.0 lbs)`;
            if (weight <= 186.0) return `Juvenile Gi ${beltDisplay} Heavy (186.0 lbs)`;
            if (weight <= 197.0) return `Juvenile Gi ${beltDisplay} Super Heavy (197.0 lbs)`;
            return `Juvenile Gi ${beltDisplay} Ultra Heavy (No Maximum)`;
          } else {
            if (weight <= 114.0) return `Juvenile No-Gi ${beltDisplay} Rooster (114.0 lbs)`;
            if (weight <= 124.5) return `Juvenile No-Gi ${beltDisplay} Light Feather (124.5 lbs)`;
            if (weight <= 135.5) return `Juvenile No-Gi ${beltDisplay} Feather (135.5 lbs)`;
            if (weight <= 146.5) return `Juvenile No-Gi ${beltDisplay} Light (146.5 lbs)`;
            if (weight <= 157.5) return `Juvenile No-Gi ${beltDisplay} Middle (157.5 lbs)`;
            if (weight <= 168.5) return `Juvenile No-Gi ${beltDisplay} Medium Heavy (168.5 lbs)`;
            if (weight <= 179.5) return `Juvenile No-Gi ${beltDisplay} Heavy (179.5 lbs)`;
            if (weight <= 190.5) return `Juvenile No-Gi ${beltDisplay} Super Heavy (190.5 lbs)`;
            return `Juvenile No-Gi ${beltDisplay} Ultra Heavy (No Maximum)`;
          }
        } else {
          if (effectiveGi) {
            if (weight <= 103.5) return `Juvenile Gi ${beltDisplay} Rooster (103.5 lbs)`;
            if (weight <= 114.5) return `Juvenile Gi ${beltDisplay} Light Feather (114.5 lbs)`;
            if (weight <= 125.5) return `Juvenile Gi ${beltDisplay} Feather (125.5 lbs)`;
            if (weight <= 136.5) return `Juvenile Gi ${beltDisplay} Light (136.5 lbs)`;
            if (weight <= 148.0) return `Juvenile Gi ${beltDisplay} Middle (148.0 lbs)`;
            if (weight <= 159.0) return `Juvenile Gi ${beltDisplay} Medium Heavy (159.0 lbs)`;
            if (weight <= 170.0) return `Juvenile Gi ${beltDisplay} Heavy (170.0 lbs)`;
            return `Juvenile Gi ${beltDisplay} Super Heavy (No Maximum)`;
          } else {
            if (weight <= 99.0) return `Juvenile No-Gi ${beltDisplay} Rooster (99.0 lbs)`;
            if (weight <= 109.5) return `Juvenile No-Gi ${beltDisplay} Light Feather (109.5 lbs)`;
            if (weight <= 120.0) return `Juvenile No-Gi ${beltDisplay} Feather (120.0 lbs)`;
            if (weight <= 131.0) return `Juvenile No-Gi ${beltDisplay} Light (131.0 lbs)`;
            if (weight <= 142.0) return `Juvenile No-Gi ${beltDisplay} Middle (142.0 lbs)`;
            if (weight <= 153.0) return `Juvenile No-Gi ${beltDisplay} Medium Heavy (153.0 lbs)`;
            if (weight <= 164.0) return `Juvenile No-Gi ${beltDisplay} Heavy (164.0 lbs)`;
            return `Juvenile No-Gi ${beltDisplay} Super Heavy (No Maximum)`;
          }
        }
      }

      const divisions = ["Rooster", "Light Feather", "Feather", "Light", "Middle", "Medium Heavy", "Heavy", "Super Heavy"];
      let category = "Youth";
      if (age >= 4 && age <= 6) category = "Mighty Mite";
      else if (age >= 7 && age <= 9) category = "Pee Wee";
      else if (age >= 10 && age <= 12) category = "Junior";
      else if (age >= 13 && age <= 15) category = "Teen";

      const lookupAge = Math.min(Math.max(age, 4), 15);
      const giLimits = {
        4: [26.0, 32.6, 40.0, 46.6, 53.0, 60.0, 66.6, 73.6],
        5: [32.6, 39.6, 44.6, 53.0, 57.6, 64.0, 71.0, 80.0],
        6: [39.6, 42.0, 48.6, 55.6, 62.0, 69.0, 77.6, 87.0],
        7: [40.0, 46.6, 53.0, 60.0, 67.0, 73.6, 80.0, 87.0],
        8: [46.6, 53.0, 60.0, 67.0, 73.6, 80.0, 87.0, 93.6],
        9: [53.0, 60.0, 67.0, 73.6, 80.0, 87.0, 93.6, 100.0],
        10: [60.0, 67.0, 73.6, 80.0, 87.0, 93.6, 100.0, 106.6],
        11: [67.0, 73.6, 80.0, 87.0, 93.6, 100.0, 106.6, 114.0],
        12: [71.0, 80.0, 89.0, 98.0, 106.6, 116.0, 125.0, 133.6],
        13: [80.0, 89.0, 98.0, 106.6, 116.0, 125.0, 133.6, 143.6],
        14: [89.0, 98.0, 106.6, 116.0, 125.0, 133.6, 143.6, 152.6],
        15: [98.0, 106.6, 116.0, 125.0, 133.6, 143.6, 152.6, 161.0]
      };
      const noGiLimits = {
        4: [24.0, 30.0, 36.6, 42.2, 50.0, 56.6, 63.2, 70.0],
        5: [30.0, 34.4, 41.0, 47.8, 54.4, 61.0, 67.8, 74.6],
        6: [34.4, 38.8, 45.6, 52.2, 58.8, 65.6, 72.2, 79.0],
        7: [36.8, 43.4, 50.0, 56.6, 63.4, 70.0, 76.8, 83.6],
        8: [43.4, 50.0, 56.6, 63.4, 70.0, 76.8, 83.6, 90.2],
        9: [50.0, 56.6, 63.4, 70.0, 76.8, 83.6, 90.2, 96.8],
        10: [56.6, 63.4, 70.0, 76.8, 83.6, 90.2, 96.8, 103.4],
        11: [63.4, 70.0, 76.8, 83.6, 90.2, 96.8, 103.4, 110.2],
        12: [67.8, 76.8, 85.8, 94.6, 103.4, 112.4, 121.2, 130.0],
        13: [76.8, 85.8, 94.6, 103.4, 112.4, 121.2, 130.0, 138.8],
        14: [85.8, 94.6, 103.4, 112.4, 121.2, 130.0, 138.8, 147.6],
        15: [94.6, 103.4, 112.4, 121.2, 130.0, 138.8, 147.6, 156.4]
      };

      const limits = effectiveGi ? giLimits[lookupAge] : noGiLimits[lookupAge];
      for (let i = 0; i < limits.length; i++) {
        if (weight <= limits[i]) {
          return `${category} (Age ${age}) ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} ${divisions[i]} (${limits[i].toFixed(1)} lbs)`;
        }
      }
      return `${category} (Age ${age}) ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Ultra Heavy (No Maximum)`;
    }
  }

  if (fed === 'JJWL') {
    if (age >= 18) {
      if (gender === 'Male') {
        if (weight <= 130.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Rooster (130 lbs)`;
        if (weight <= 141.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Light Feather (141 lbs)`;
        if (weight <= 154.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Feather (154 lbs)`;
        if (weight <= 168.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Light (168 lbs)`;
        if (weight <= 182.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Middle (182 lbs)`;
        if (weight <= 195.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Medium Heavy (195 lbs)`;
        if (weight <= 208.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Heavy (208 lbs)`;
        if (weight <= 222.0) return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Super Heavy (222 lbs)`;
        return `Adult ${effectiveGi ? 'Gi' : 'No-Gi'} ${beltDisplay} Ultra Heavy (223+ lbs)`;
      }
      if (gender === 'Female') {
        if (effectiveGi) {
          if (weight <= 108.0) return `Adult Gi ${beltDisplay} Rooster (108 lbs)`;
          if (weight <= 120.0) return `Adult Gi ${beltDisplay} Light Feather (120 lbs)`;
          if (weight <= 130.0) return `Adult Gi ${beltDisplay} Feather (130 lbs)`;
          if (weight <= 142.0) return `Adult Gi ${beltDisplay} Light (142 lbs)`;
          if (weight <= 154.0) return `Adult Gi ${beltDisplay} Middle (154 lbs)`;
          if (weight <= 165.0) return `Adult Gi ${beltDisplay} Middle Heavy (165 lbs)`;
          if (weight <= 177.0) return `Adult Gi ${beltDisplay} Heavy (177 lbs)`;
          return `Adult Gi ${beltDisplay} Heavy Plus (178+ lbs)`;
        } else {
          if (weight <= 120.0) return `Adult No-Gi ${beltDisplay} Light Feather (120 lbs)`;
          if (weight <= 130.0) return `Adult No-Gi ${beltDisplay} Feather (130 lbs)`;
          if (weight <= 142.0) return `Adult No-Gi ${beltDisplay} Light (142 lbs)`;
          if (weight <= 154.0) return `Adult No-Gi ${beltDisplay} Middle (154 lbs)`;
          return `Adult No-Gi ${beltDisplay} Heavy (155+ lbs)`;
        }
      }
    } else {
      if (weight <= 39.9) return `JJWL Youth ${beltDisplay} Under 40 lbs`;
      if (weight <= 49.9) return `JJWL Youth ${beltDisplay} 40-49 lbs`;
      if (weight <= 59.9) return `JJWL Youth ${beltDisplay} 50-59 lbs`;
      if (weight <= 69.9) return `JJWL Youth ${beltDisplay} 60-69 lbs`;
      if (weight <= 79.9) return `JJWL Youth ${beltDisplay} 70-79 lbs`;
      if (weight <= 89.9) return `JJWL Youth ${beltDisplay} 80-89 lbs`;
      if (weight <= 99.9) return `JJWL Youth ${beltDisplay} 90-99 lbs`;
      if (weight <= 109.9) return `JJWL Youth ${beltDisplay} 100-109 lbs`;
      if (weight <= 119.9) return `JJWL Youth ${beltDisplay} 110-119 lbs`;
      if (weight <= 129.9) return `JJWL Youth ${beltDisplay} 120-129 lbs`;
      if (weight <= 144.9) return `JJWL Youth ${beltDisplay} 130-144 lbs`;
      if (weight <= 159.9) return `JJWL Youth ${beltDisplay} 145-159 lbs`;
      return `JJWL Youth ${beltDisplay} 160+ lbs`;
    }
  }

  // --- OFFICIAL ADCC RULES MATRIX FOR ALL DIVISIONS ---
  if (fed === 'ADCC') {
    if (age >= 18) {
      if (gender === 'Male') {
        if (weight <= 143.0) return `ADCC Adult Male -65.0 kg (143 lbs) No-Gi`;
        if (weight <= 168.0) return `ADCC Adult Male -76.0 kg (168 lbs) No-Gi`;
        if (weight <= 183.0) return `ADCC Adult Male -83.0 kg (183 lbs) No-Gi`;
        if (weight <= 201.0) return `ADCC Adult Male -91.0 kg (201 lbs) No-Gi`;
        if (weight <= 220.0) return `ADCC Adult Male -100.0 kg (220 lbs) No-Gi`;
        return `ADCC Adult Male +100.0 kg (220+ lbs) No-Gi`;
      }
      if (gender === 'Female') {
        if (weight <= 132.0) return `ADCC Adult Female -60.0 kg (132 lbs) No-Gi`;
        return `ADCC Adult Female +60.0 kg (132+ lbs) No-Gi`;
      }
    } else {
      // Official ADCC Youth & Teens Matrix (Ages 4 to 17)
      if (gender === 'Female') {
        if (age <= 6) {
          if (weight <= 44.0) return `ADCC Girls (6 & Under) -20.0 kg (44 lbs) No-Gi`;
          if (weight <= 53.0) return `ADCC Girls (6 & Under) -24.0 kg (53 lbs) No-Gi`;
          if (weight <= 62.0) return `ADCC Girls (6 & Under) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Girls (6 & Under) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 80.0) return `ADCC Girls (6 & Under) -36.0 kg (80 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Girls (6 & Under) -40.0 kg (88 lbs) No-Gi`;
          return `ADCC Girls (6 & Under) +40.0 kg (89+ lbs) No-Gi`;
        }
        if (age >= 7 && age <= 8) {
          if (weight <= 53.0) return `ADCC Girls (7-8) -24.0 kg (53 lbs) No-Gi`;
          if (weight <= 62.0) return `ADCC Girls (7-8) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Girls (7-8) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 80.0) return `ADCC Girls (7-8) -36.0 kg (80 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Girls (7-8) -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 97.0) return `ADCC Girls (7-8) -44.0 kg (97 lbs) No-Gi`;
          return `ADCC Girls (7-8) +44.0 kg (98+ lbs) No-Gi`;
        }
        if (age >= 9 && age <= 10) {
          if (weight <= 53.0) return `ADCC Girls (9-10) -24.0 kg (53 lbs) No-Gi`;
          if (weight <= 62.0) return `ADCC Girls (9-10) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Girls (9-10) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 79.0) return `ADCC Girls (9-10) -36.0 kg (79 lbs) No-Gi`;
          if (weight <= 99.0) return `ADCC Girls (9-10) -45.0 kg (99 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Girls (9-10) -55.0 kg (121 lbs) No-Gi`;
          return `ADCC Girls (9-10) +55.0 kg (121+ lbs) No-Gi`;
        }
        if (age >= 11 && age <= 12) {
          if (weight <= 62.0) return `ADCC Girls (11-12) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Girls (11-12) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 79.0) return `ADCC Girls (11-12) -36.0 kg (79 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Girls (11-12) -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 110.0) return `ADCC Girls (11-12) -50.0 kg (110 lbs) No-Gi`;
          return `ADCC Girls (11-12) +50.0 kg (110+ lbs) No-Gi`;
        }
        if (age >= 13 && age <= 14) {
          if (weight <= 77.0) return `ADCC Girls (13-14) -35.0 kg (77 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Girls (13-14) -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 99.0) return `ADCC Girls (13-14) -45.0 kg (99 lbs) No-Gi`;
          if (weight <= 110.0) return `ADCC Girls (13-14) -50.0 kg (110 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Girls (13-14) -55.0 kg (121 lbs) No-Gi`;
          if (weight <= 132.0) return `ADCC Girls (13-14) -60.0 kg (132 lbs) No-Gi`;
          if (weight <= 154.0) return `ADCC Girls (13-14) -70.0 kg (154 lbs) No-Gi`;
          return `ADCC Girls (13-14) +70.0 kg (154+ lbs) No-Gi`;
        }
        if (age >= 15 && age <= 17) {
          if (weight <= 88.0) return `ADCC Juveniles (15-17) Girls -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 99.0) return `ADCC Juveniles (15-17) Girls -45.0 kg (99 lbs) No-Gi`;
          if (weight <= 110.0) return `ADCC Juveniles (15-17) Girls -50.0 kg (110 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Juveniles (15-17) Girls -55.0 kg (121 lbs) No-Gi`;
          if (weight <= 132.0) return `ADCC Juveniles (15-17) Girls -60.0 kg (132 lbs) No-Gi`;
          if (weight <= 143.0) return `ADCC Juveniles (15-17) Girls -65.0 kg (143 lbs) No-Gi`;
          return `ADCC Juveniles (15-17) Girls +65.0 kg (144+ lbs) No-Gi`;
        }
      } else {
        // Boys divisions
        if (age <= 6) {
          if (weight <= 44.0) return `ADCC Boys (6 & Under) -20.0 kg (44 lbs) No-Gi`;
          if (weight <= 53.0) return `ADCC Boys (6 & Under) -24.0 kg (53 lbs) No-Gi`;
          if (weight <= 62.0) return `ADCC Boys (6 & Under) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Boys (6 & Under) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Boys (6 & Under) -40.0 kg (88 lbs) No-Gi`;
          return `ADCC Boys (6 & Under) +40.0 kg (88+ lbs) No-Gi`;
        }
        if (age >= 7 && age <= 8) {
          if (weight <= 53.0) return `ADCC Boys (7-8) -24.0 kg (53 lbs) No-Gi`;
          if (weight <= 62.0) return `ADCC Boys (7-8) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Boys (7-8) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 79.0) return `ADCC Boys (7-8) -36.0 kg (79 lbs) No-Gi`;
          if (weight <= 99.0) return `ADCC Boys (7-8) -45.0 kg (99 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Boys (7-8) -55.0 kg (121 lbs) No-Gi`;
          return `ADCC Boys (7-8) +55.0 kg (121+ lbs) No-Gi`;
        }
        if (age >= 9 && age <= 10) {
          if (weight <= 62.0) return `ADCC Boys (9-10) -28.0 kg (62 lbs) No-Gi`;
          if (weight <= 71.0) return `ADCC Boys (9-10) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 79.0) return `ADCC Boys (9-10) -36.0 kg (79 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Boys (9-10) -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 110.0) return `ADCC Boys (9-10) -50.0 kg (110 lbs) No-Gi`;
          if (weight <= 132.0) return `ADCC Boys (9-10) -60.0 kg (132 lbs) No-Gi`;
          return `ADCC Boys (9-10) +60.0 kg (132+ lbs) No-Gi`;
        }
        if (age >= 11 && age <= 12) {
          if (weight <= 71.0) return `ADCC Boys (11-12) -32.0 kg (71 lbs) No-Gi`;
          if (weight <= 79.0) return `ADCC Boys (11-12) -36.0 kg (79 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Boys (11-12) -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 97.0) return `ADCC Boys (11-12) -44.0 kg (97 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Boys (11-12) -55.0 kg (121 lbs) No-Gi`;
          if (weight <= 143.0) return `ADCC Boys (11-12) -65.0 kg (143 lbs) No-Gi`;
          return `ADCC Boys (11-12) +65.0 kg (143+ lbs) No-Gi`;
        }
        if (age >= 13 && age <= 14) {
          if (weight <= 75.0) return `ADCC Boys (13-14) -34.0 kg (75 lbs) No-Gi`;
          if (weight <= 88.0) return `ADCC Boys (13-14) -40.0 kg (88 lbs) No-Gi`;
          if (weight <= 99.0) return `ADCC Boys (13-14) -45.0 kg (99 lbs) No-Gi`;
          if (weight <= 110.0) return `ADCC Boys (13-14) -50.0 kg (110 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Boys (13-14) -55.0 kg (121 lbs) No-Gi`;
          if (weight <= 132.0) return `ADCC Boys (13-14) -60.0 kg (132 lbs) No-Gi`;
          if (weight <= 143.0) return `ADCC Boys (13-14) -65.0 kg (143 lbs) No-Gi`;
          if (weight <= 154.0) return `ADCC Boys (13-14) -70.0 kg (154 lbs) No-Gi`;
          if (weight <= 165.0) return `ADCC Boys (13-14) -75.0 kg (165 lbs) No-Gi`;
          return `ADCC Boys (13-14) +75.0 kg (165+ lbs) No-Gi`;
        }
        if (age >= 15 && age <= 17) {
          if (weight <= 110.0) return `ADCC Juveniles (15-17) Boys -50.0 kg (110 lbs) No-Gi`;
          if (weight <= 121.0) return `ADCC Juveniles (15-17) Boys -55.0 kg (121 lbs) No-Gi`;
          if (weight <= 132.0) return `ADCC Juveniles (15-17) Boys -60.0 kg (132 lbs) No-Gi`;
          if (weight <= 143.0) return `ADCC Juveniles (15-17) Boys -65.0 kg (143 lbs) No-Gi`;
          if (weight <= 154.0) return `ADCC Juveniles (15-17) Boys -70.0 kg (154 lbs) No-Gi`;
          if (weight <= 165.0) return `ADCC Juveniles (15-17) Boys -75.0 kg (165 lbs) No-Gi`;
          if (weight <= 176.0) return `ADCC Juveniles (15-17) Boys -80.0 kg (176 lbs) No-Gi`;
          return `ADCC Juveniles (15-17) Boys +80.0 kg (177+ lbs) No-Gi`;
        }
      }
    }
  }

  // Universal Fallback
  if (age >= 18) {
    if (gender === 'Male') {
      if (weight <= 135.0) return `Adult ${beltDisplay} -135 lbs`;
      if (weight <= 145.0) return `Adult ${beltDisplay} -145 lbs`;
      if (weight <= 155.0) return `Adult ${beltDisplay} -155 lbs`;
      if (weight <= 170.0) return `Adult ${beltDisplay} -170 lbs`;
      if (weight <= 185.0) return `Adult ${beltDisplay} -185 lbs`;
      if (weight <= 205.0) return `Adult ${beltDisplay} -205 lbs`;
      if (weight <= 230.0) return `Adult ${beltDisplay} -230 lbs`;
      return `Adult ${beltDisplay} +230 lbs`;
    } else {
      if (weight <= 115.0) return `Adult ${beltDisplay} -115 lbs`;
      if (weight <= 125.0) return `Adult ${beltDisplay} -125 lbs`;
      if (weight <= 135.0) return `Adult ${beltDisplay} -135 lbs`;
      if (weight <= 145.0) return `Adult ${beltDisplay} -145 lbs`;
      if (weight <= 155.0) return `Adult ${beltDisplay} -155 lbs`;
      if (weight <= 170.0) return `Adult ${beltDisplay} -170 lbs`;
      return `Adult ${beltDisplay} +170 lbs`;
    }
  } else {
    if (weight <= 50.0) return `Youth (Age ${age}) ${beltDisplay} Under 50 lbs`;
    if (weight <= 65.0) return `Youth (Age ${age}) ${beltDisplay} 50-65 lbs`;
    if (weight <= 80.0) return `Youth (Age ${age}) ${beltDisplay} 65-80 lbs`;
    if (weight <= 95.0) return `Youth (Age ${age}) ${beltDisplay} 80-95 lbs`;
    if (weight <= 110.0) return `Youth (Age ${age}) ${beltDisplay} 95-110 lbs`;
    if (weight <= 125.0) return `Youth (Age ${age}) ${beltDisplay} 110-125 lbs`;
    if (weight <= 145.0) return `Youth (Age ${age}) ${beltDisplay} 125-145 lbs`;
    return `Youth (Age ${age}) ${beltDisplay} Heavyweight (145+ lbs)`;
  }
};