import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const YEAR_OPTIONS = [
  { key: '4th_year', label: '4th Year', batch: '2022 batch' },
  { key: '3rd_year', label: '3rd Year', batch: '2023 batch' },
  { key: '2nd_year', label: '2nd Year', batch: '2024 batch' },
];

const CREDIT_OPTIONS = ['4_credits', '3_credits', '2_credits'];

const formatOptionLabel = value => value.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

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

export default function CourseSelector({
  onSlotSelect,
  initialSlot,
  slotsByYear,
  layout = 'sidebar',
}) {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCredit, setSelectedCredit] = useState('');
  const [courseList, setCourseList] = useState([]);
  const isInternalNavigation = useRef(false);

  useEffect(() => {
    if (initialSlot?.selectedYear) {
      setSelectedYear(initialSlot.selectedYear);
      setSelectedCredit(initialSlot.selectedCredit || '');
      return;
    }

    if (isInternalNavigation.current) {
      isInternalNavigation.current = false;
      return;
    }

    if (!initialSlot) {
      setSelectedYear('');
      setSelectedCredit('');
    }
  }, [initialSlot]);

  useEffect(() => {
    if (selectedYear && selectedCredit && slotsByYear) {
      const yearData = slotsByYear[selectedYear];
      if (yearData) {
        const slots = yearData.slots[selectedCredit] || [];
        const slotDaysMapping = yearData.slotDays;
        setCourseList(slots.map(slot => createCourseData(slot, slotDaysMapping)));
      }
    } else {
      setCourseList([]);
    }
  }, [selectedYear, selectedCredit, slotsByYear]);

  const handleYearSelect = year => {
    setSelectedYear(year);
    setSelectedCredit('');
    onSlotSelect(null);
  };

  const handleCreditSelect = credit => {
    isInternalNavigation.current = true;
    setSelectedCredit(credit);
    onSlotSelect(null);
  };

  const panelClassName =
    layout === 'modal'
      ? 'w-full space-y-6 p-6'
      : 'w-full md:w-[280px] md:flex-shrink-0 md:border-r md:border-border-faint md:pr-6';

  const selectedYearMeta = YEAR_OPTIONS.find(year => year.key === selectedYear);

  return (
    <aside className={panelClassName}>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="eyebrow-label">Course Setup</p>
          <div className="flex items-center gap-2 text-text-primary">
            <GraduationCap size={16} className="text-accent" />
            <h2 className="text-base font-semibold">Choose your slot details</h2>
          </div>
          <p className="text-sm text-text-muted">
            Select year, credits, and slot combination to open the planner.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow-label">Year</p>
            {selectedYear ? (
              <button
                type="button"
                onClick={() => handleYearSelect('')}
                className="text-xs text-text-muted transition-colors hover:text-text-primary"
              >
                Change
              </button>
            ) : null}
          </div>

          {!selectedYear ? (
            <div className="grid gap-2">
              {YEAR_OPTIONS.map(year => (
                <button
                  key={year.key}
                  type="button"
                  onClick={() => handleYearSelect(year.key)}
                  className="rounded-lg border border-border-default bg-surface px-4 py-3 text-left text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  <div className="font-medium">{year.label}</div>
                  <div className="text-xs text-text-muted">{year.batch}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border-default bg-surface px-4 py-3">
              <div className="font-medium text-text-primary">{selectedYearMeta?.label}</div>
              <div className="text-xs text-text-muted">{selectedYearMeta?.batch}</div>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {selectedYear ? (
            <Motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="eyebrow-label">Credits</p>
                {selectedCredit ? (
                  <button
                    type="button"
                    onClick={() => handleCreditSelect('')}
                    className="text-xs text-text-muted transition-colors hover:text-text-primary"
                  >
                    Change
                  </button>
                ) : null}
              </div>

              {!selectedCredit ? (
                <div className="grid gap-2">
                  {CREDIT_OPTIONS.map(creditType => (
                    <button
                      key={creditType}
                      type="button"
                      onClick={() => handleCreditSelect(creditType)}
                      className="rounded-lg border border-border-default bg-surface px-4 py-3 text-left text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                    >
                      {formatOptionLabel(creditType)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border-default bg-surface px-4 py-3">
                  <div className="font-medium text-text-primary">
                    {formatOptionLabel(selectedCredit)}
                  </div>
                  <div className="text-xs text-text-muted">Selected credit category</div>
                </div>
              )}

              {selectedCredit ? (
                <Motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="space-y-3"
                >
                  <p className="eyebrow-label">Slot Combination</p>
                  <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {courseList.map((course, idx) => {
                      const isSelected = initialSlot?.slot === course.slot;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            onSlotSelect({
                              ...course,
                              selectedYear,
                              selectedCredit,
                            })
                          }
                          className={`rounded-lg border px-3 py-3 text-center text-sm transition-colors ${
                            isSelected
                              ? 'border-border-strong bg-elevated text-text-primary'
                              : 'border-border-default bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary'
                          }`}
                        >
                          <span className="font-mono text-sm">{course.slot}</span>
                        </button>
                      );
                    })}
                  </div>
                </Motion.div>
              ) : null}
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </aside>
  );
}
