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
        // YOUTH LOGIC STRUCTURE
        if (age >= 16) return `Juvenile (16-17) ${beltDisplay} - Exact weight mapping coming soon`;
        if (age >= 13) return `Teen (13-15) ${beltDisplay} - Exact weight mapping coming soon`;
        if (age >= 10) return `Junior (10-12) ${beltDisplay} - Exact weight mapping coming soon`;
        return `Pee Wee / Mighty Mite ${beltDisplay} - Exact weight mapping coming soon`;
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
        return `ADCC Youth ${beltDisplay} - Exact weight mapping coming soon`;
      }
    }
  
    if (federation === 'JJWL') {
       return `JJWL ${age >= 18 ? 'Adult' : 'Youth'} ${beltDisplay} - Exact weight mapping coming soon`;
    }
  
    return "Division data not yet mapped for this federation/age.";
  };