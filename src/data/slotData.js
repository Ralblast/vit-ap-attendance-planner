const individualSlotDays = {
  A1: [2, 6], B1: [2, 3], C1: [2, 6], D1: [2, 3], E1: [3, 6], F1: [3, 5], G1: [5, 6],
  A2: [2, 6], B2: [3, 4], C2: [2, 5], D2: [3, 6], E2: [2, 3], F2: [3, 4], G2: [2, 5],
  TA1: [4], TB1: [5], TC1: [4], TD1: [4], TE1: [5], TF1: [4], TG1: [3],
  TAA1: [5], TBB1: [6], TCC1: [5], TDD1: [6], TEE1: [2], TFF1: [4],
  TA2: [4], TB2: [5], TC2: [6], TD2: [4], TE2: [5], TF2: [5], TG2: [6],
  TBB2: [2], TCC2: [3], TDD2: [2], TEE2: [4]
};

const createCourseData = (slotString) => {
  const parts = slotString.split('+');
  const combinedDays = new Set();
  parts.forEach(part => {
    const primaryPart = part.split('/')[0];
    if (individualSlotDays[primaryPart]) {
      individualSlotDays[primaryPart].forEach(day => combinedDays.add(day));
    }
  });
  return { slot: slotString, days: Array.from(combinedDays).sort() };
};

export const theorySlots = {
  "4_credits": ["A1+TA1+TAA1", "B1+TB1+TBB1", "C1+TC1+TCC1", "C1+SC1+TC1", "D1+TD1+TDD1", "D1+TD1+SD1", "E1+TE1+TEE1", "E1+SE1+TE1", "F1+SF1+TFF1", "A2+TA2+TAA2", "B2+TB2+TBB2", "C2+TC2+TCC2", "D2+TD2+TDD2", "E2+TE2+TEE2"].map(createCourseData),
  "3_credits": ["A1+TA1", "F1+TFF1", "B1+TB1", "G1+TG1", "C1+TC1", "D1+TD1", "E1+TE1", "F1+TF1", "A2+TA2", "F2+TF2", "B2+TB2", "F2+SF1", "C2+TC2", "G2+TG2", "D2+TD2", "E2+TE2"].map(createCourseData),
  "2_credits": ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "A2", "B2", "C2", "D2", "E2", "F2", "G2"].map(createCourseData),
};
