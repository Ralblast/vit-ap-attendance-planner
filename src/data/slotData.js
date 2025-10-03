// slotData.js

// ================================================================================================
// Batch slot-to-day mappings all set to the same detailed data provided
const batch2022SlotDays = {
  A1: [2, 6], A2: [2, 4], B1: [2, 3], B2: [2, 3], C1: [4, 6], C2: [4, 5],
  D1: [2, 3], D2: [3, 6], E1: [3, 6], E2: [3, 6], F1: [3, 5], F2: [2, 3, 5],
  G1: [2, 6], G2: [2, 3], SC1: [3], SC2: [3], SD1: [6], SD2: [5], SE1: [4], SE2: [6],
  TA1: [5], TA2: [5], TAA1: [4], TAA2: [6], TB1: [5], TB2: [5], TBB1: [4], TBB2: [6],
  TC1: [2], TC2: [2], TCC1: [5], TCC2: [3], TD1: [4], TD2: [4], TDD1: [6], TDD2: [2],
  TE1: [5], TE2: [4], TEE1: [4], TEE2: [5], TF1: [6], TF2: [3], TFF1: [2], TFF2: [6],
  TG1: [4], TG2: [4], TGG1: [3], TGG2: [4]
};

const batch2022Slots = {
  "4_credits": [
    "A1+TA1+TAA1", "B1+TB1+TBB1", "C1+TC1+TCC1", "C1+SC1+TC1", "D1+TD1+TDD1",
    "D1+TD1+SD1", "A2+TA2+TAA2", "B2+TB2+TBB2", "C2+TC2+TCC2", "C2+SC2+TC2",
    "D2+TD2+TDD2", "D2+SD2+TD2", "E1+TE1+TEE1", "E1+SE1+TE1", "F1+TF1+TFF1",
    "F1+TF1+TBB2", "G1+TG1+TGG1", "E2+TE2+TEE2", "E2+SE2+TE2", "F2+TF2+TFF2",
    "F2+TF2+TBB1"
  ],
  "3_credits": [
     "A1+TA1","B1+TB1", "C1+TC1", "C1+TCC1", "D1+TD1", "D1+TDD1","E1+TEE1", "E1+TE1",
    "F1+TF1", "F1+TFF1", "G1+TG1", "G1+TGG1", "A2+TA2", "B2+TB2", "C2+TC2", 
     "C2+TCC2", "D2+TD2", "D2+TDD2", "E2+TE2", "E2+TEE2", "F2+TF2",
    "F2+TFF2", "G2+TG2", "G2+TGG2"
  ],
  "2_credits": [
    "A1", "B1", "C1", "D1", "E1", "F1", "G1",
    "A2", "B2", "C2", "D2", "E2", "F2", "G2"
  ]
};

const deepClone = obj => JSON.parse(JSON.stringify(obj));
const batch2023SlotDays = deepClone(batch2022SlotDays);
const batch2023Slots = deepClone(batch2022Slots);
const batch2024SlotDays = deepClone(batch2022SlotDays);
const batch2024Slots = deepClone(batch2022Slots);

const createCourseData = (slotString, slotDaysMapping) => {
  const parts = slotString.split('+');
  const combinedDays = new Set();
  parts.forEach(part => {
    const primaryPart = part.split('/')[0];
    if (slotDaysMapping[primaryPart]) {
      slotDaysMapping[primaryPart].forEach(day => combinedDays.add(day));
    }
  });
  return { slot: slotString, days: Array.from(combinedDays).sort() };
};

const getSlotDaysForBatch = (year) => {
  switch (year) {
    case '4th_year': return batch2022SlotDays;
    case '3rd_year': return batch2023SlotDays;
    case '2nd_year': return batch2024SlotDays;
    default: return batch2022SlotDays;
  }
};

export const slotsByYear = {
  '2nd_year': batch2024Slots,
  '3rd_year': batch2023Slots,
  '4th_year': batch2022Slots,
};

export const getSlotsForYear = (year) => slotsByYear[year] || {};

export const createSlotData = (year, creditType) => {
  const yearSlots = getSlotsForYear(year);
  const slots = yearSlots[creditType] || [];
  const slotDaysMapping = getSlotDaysForBatch(year);
  return slots.map(slot => createCourseData(slot, slotDaysMapping));
};

export const theorySlots = batch2022Slots;

export const slotDaysByYear = {
  '2nd_year': batch2024SlotDays,
  '3rd_year': batch2023SlotDays,
  '4th_year': batch2022SlotDays
};
