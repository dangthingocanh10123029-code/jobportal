'use client';

import { useState } from 'react';

const MAX = 100_000_000;

/** minSalary as a slider; 0 is submitted but the search schema treats it as "no filter". */
export function SalaryRange({ defaultValue }: { defaultValue?: number }) {
  const [value, setValue] = useState(Math.min(defaultValue ?? 0, MAX));
  return (
    <label className="filter-group salary-range" htmlFor="search-min-salary">
      <span className="filter-legend">Lương tối thiểu</span>
      <output htmlFor="search-min-salary">{value ? `Từ ${new Intl.NumberFormat('vi-VN').format(value)} ₫ / tháng` : 'Mọi mức lương'}</output>
      <input id="search-min-salary" max={MAX} min="0" name="minSalary" onChange={(event) => setValue(Number(event.target.value))} step="1000000" type="range" value={value} />
    </label>
  );
}
