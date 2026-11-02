export const calculateWeightClass = (federation, age, gender, weightLbs, belt) => {
    const weight = parseFloat(weightLbs);
    const beltDisplay = belt ? `${belt} Belt` : '';
    
    if (federation === 'IBJJF') {
      if (age >= 18) {
        if (gender === 'Male') {
          if (weight <= 127.0) return `Adult ${beltDisplay} - Rooster (127.0 lbs)`;
          if (weight <= 141.5) return `Adult ${beltDisplay} - Light Feather (141.5 lbs)`;
          if (weight <= 154.5) return `Adult ${beltDisplay} - Feather (154.5 lbs)`;
          if (weight <= 168.0) return `Adult ${beltDisplay} - Light (168.0 lbs)`;
          if (weight <= 181.5) return `Adult ${beltDisplay} - Middle (181.5 lbs)`;
          if (weight <= 195.0) return `Adult ${beltDisplay} - Medium Heavy (195.0 lbs)`;
          if (weight <= 208.0) return `Adult ${beltDisplay} - Heavy (208.0 lbs)`;
          if (weight <= 222.0) return `Adult ${beltDisplay} - Super Heavy (222.0 lbs)`;
          return `Adult ${beltDisplay} - Ultra Heavy (No Maximum)`;
        }
        if (gender === 'Female') {
          if (weight <= 107.0) return `Adult ${beltDisplay} - Rooster (107.0 lbs)`;
          if (weight <= 118.0) return `Adult ${beltDisplay} - Light Feather (118.0 lbs)`;
          if (weight <= 129.0) return `Adult ${beltDisplay} - Feather (129.0 lbs)`;
          if (weight <= 141.5) return `Adult ${beltDisplay} - Light (141.5 lbs)`;
          if (weight <= 152.5) return `Adult ${beltDisplay} - Middle (152.5 lbs)`;
          if (weight <= 163.5) return `Adult ${beltDisplay} - Medium Heavy (163.5 lbs)`;
          if (weight <= 175.0) return `Adult ${beltDisplay} - Heavy (175.0 lbs)`;
          return `Adult ${beltDisplay} - Super Heavy (No Maximum)`;
        }
      } else {
        // YOUTH LOGIC STRUCTURE (Gi Weights)
        if (age >= 16) {
          if (gender === 'Male') {
            if (weight <= 118.0) return `Juvenile ${beltDisplay} - Rooster (118.0 lbs)`;
            if (weight <= 129.0) return `Juvenile ${beltDisplay} - Light Feather (129.0 lbs)`;
            if (weight <= 141.5) return `Juvenile ${beltDisplay} - Feather (141.5 lbs)`;
            if (weight <= 152.5) return `Juvenile ${beltDisplay} - Light (152.5 lbs)`;
            if (weight <= 163.5) return `Juvenile ${beltDisplay} - Middle (163.5 lbs)`;
            if (weight <= 175.0) return `Juvenile ${beltDisplay} - Medium Heavy (175.0 lbs)`;
            if (weight <= 186.0) return `Juvenile ${beltDisplay} - Heavy (186.0 lbs)`;
            if (weight <= 197.0) return `Juvenile ${beltDisplay} - Super Heavy (197.0 lbs)`;
            return `Juvenile ${beltDisplay} - Ultra Heavy (No Maximum)`;
          } else {
            if (weight <= 103.5) return `Juvenile ${beltDisplay} - Rooster (103.5 lbs)`;
            if (weight <= 114.5) return `Juvenile ${beltDisplay} - Light Feather (114.5 lbs)`;
            if (weight <= 125.5) return `Juvenile ${beltDisplay} - Feather (125.5 lbs)`;
            if (weight <= 136.5) return `Juvenile ${beltDisplay} - Light (136.5 lbs)`;
            if (weight <= 148.0) return `Juvenile ${beltDisplay} - Middle (148.0 lbs)`;
            if (weight <= 159.0) return `Juvenile ${beltDisplay} - Medium Heavy (159.0 lbs)`;
            if (weight <= 170.0) return `Juvenile ${beltDisplay} - Heavy (170.0 lbs)`;
            return `Juvenile ${beltDisplay} - Super Heavy (No Maximum)`;
          }
        }
        if (age >= 13) {
          if (weight <= 95.5) return `Teen (13-15) ${beltDisplay} - Rooster (95.5 lbs)`;
          if (weight <= 106.5) return `Teen (13-15) ${beltDisplay} - Light Feather (106.5 lbs)`;
          if (weight <= 117.5) return `Teen (13-15) ${beltDisplay} - Feather (117.5 lbs)`;
          if (weight <= 129.0) return `Teen (13-15) ${beltDisplay} - Light (129.0 lbs)`;
          if (weight <= 140.0) return `Teen (13-15) ${beltDisplay} - Middle (140.0 lbs)`;
          if (weight <= 151.0) return `Teen (13-15) ${beltDisplay} - Medium Heavy (151.0 lbs)`;
          if (weight <= 162.0) return `Teen (13-15) ${beltDisplay} - Heavy (162.0 lbs)`;
          if (weight <= 173.0) return `Teen (13-15) ${beltDisplay} - Super Heavy (173.0 lbs)`;
          return `Teen (13-15) ${beltDisplay} - Ultra Heavy (No Maximum)`;
        }
        if (age >= 10) {
          if (weight <= 66.5) return `Junior (10-12) ${beltDisplay} - Rooster (66.5 lbs)`;
          if (weight <= 75.5) return `Junior (10-12) ${beltDisplay} - Light Feather (75.5 lbs)`;
          if (weight <= 84.0) return `Junior (10-12) ${beltDisplay} - Feather (84.0 lbs)`;
          if (weight <= 93.5) return `Junior (10-12) ${beltDisplay} - Light (93.5 lbs)`;
          if (weight <= 102.0) return `Junior (10-12) ${beltDisplay} - Middle (102.0 lbs)`;
          if (weight <= 111.0) return `Junior (10-12) ${beltDisplay} - Medium Heavy (111.0 lbs)`;
          if (weight <= 120.0) return `Junior (10-12) ${beltDisplay} - Heavy (120.0 lbs)`;
          if (weight <= 129.0) return `Junior (10-12) ${beltDisplay} - Super Heavy (129.0 lbs)`;
          return `Junior (10-12) ${beltDisplay} - Ultra Heavy (No Maximum)`;
        }
        // 9 and under
        if (weight <= 48.5) return `Mighty Mite/Pee Wee ${beltDisplay} - Rooster (48.5 lbs)`;
        if (weight <= 57.0) return `Mighty Mite/Pee Wee ${beltDisplay} - Light Feather (57.0 lbs)`;
        if (weight <= 66.5) return `Mighty Mite/Pee Wee ${beltDisplay} - Feather (66.5 lbs)`;
        if (weight <= 75.5) return `Mighty Mite/Pee Wee ${beltDisplay} - Light (75.5 lbs)`;
        if (weight <= 84.0) return `Mighty Mite/Pee Wee ${beltDisplay} - Middle (84.0 lbs)`;
        if (weight <= 93.5) return `Mighty Mite/Pee Wee ${beltDisplay} - Medium Heavy (93.5 lbs)`;
        return `Mighty Mite/Pee Wee ${beltDisplay} - Heavy (No Maximum)`;
      }
    }
  
    if (federation === 'ADCC' || federation === 'Super Fight') {
      if (age >= 18) {
        if (gender === 'Male') {
          if (weight <= 145.5) return `Adult - Under 66kg (145.5 lbs)`;
          if (weight <= 169.7) return `Adult - Under 77kg (169.7 lbs)`;
          if (weight <= 194.0) return `Adult - Under 88kg (194.0 lbs)`;
          if (weight <= 218.2) return `Adult - Under 99kg (218.2 lbs)`;
          return `Adult - Over 99kg (+218.2 lbs)`;
        }
        if (gender === 'Female') {
          if (weight <= 132.2) return `Adult - Under 60kg (132.2 lbs)`;
          return `Adult - Over 60kg (+132.2 lbs)`;
        }
      } else {
        return `ADCC Youth ${beltDisplay} - Check event registration for specific age/weight brackets`;
      }
    }
  
    if (federation === 'JJWL') {
       return `JJWL ${age >= 18 ? 'Adult' : 'Youth'} ${beltDisplay} - Check JJWL site for dynamic divisions`;
    }
  
    return "Division data not yet mapped for this federation/age.";
  };