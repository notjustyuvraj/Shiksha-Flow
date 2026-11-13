// Focused logic test mirroring the pure functions in index.html (no DOM).
function today(){return '2026-10-31';}
function shiftDate(dateStr,days){const d=new Date(dateStr+'T12:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function countsFor(students,map){let present=0,absent=0;students.forEach(s=>{const st=map[s.id];if(st==='present')present++;else if(st==='absent')absent++;});return {total:students.length,present,absent,pending:students.length-present-absent};}

const students=[{id:'ST-001'},{id:'ST-002'},{id:'ST-003'}];
let fail=0;const ok=(name,cond)=>{console.log((cond?'PASS':'FAIL')+' · '+name);if(!cond)fail++;};

// 1. Date math across month boundary
ok('shiftDate -6 from 2026-10-31 = 2026-10-25', shiftDate('2026-10-31',-6)==='2026-10-25');
ok('shiftDate +1 from 2026-10-31 = 2026-11-01 (month rollover)', shiftDate('2026-10-31',1)==='2026-11-01');
ok('shiftDate -1 from 2026-03-01 = 2026-02-28', shiftDate('2026-03-01',-1)==='2026-02-28');

// 2. Date-wise attendance stored per date
const attendance={};
attendance['2026-10-30']={'ST-001':'present','ST-002':'absent'};
attendance['2026-10-31']={'ST-001':'absent'};
ok('two distinct attendance days stored', Object.keys(attendance).length===2);
ok('counts for 30th: 1 present 1 absent 1 pending', JSON.stringify(countsFor(students,attendance['2026-10-30']))==='{"total":3,"present":1,"absent":1,"pending":1}');
ok('counts for 31st independent of 30th', countsFor(students,attendance['2026-10-31']).absent===1);

// 3. No double counting in Teach-Time (keyed by date)
const MIN_ATT=5, MIN_MEAL=3;
const meals=[{date:'2026-10-31',qty:120}];
// Simulate saving attendance for 31st twice -> still one key
attendance['2026-10-31']={'ST-001':'present'};
const savedMinutes=()=>Object.keys(attendance).length*MIN_ATT+meals.length*MIN_MEAL;
ok('teach-time = 2 att days*5 + 1 meal*3 = 13', savedMinutes()===13);
// save same date again
attendance['2026-10-31']={'ST-001':'absent'};
ok('re-saving same date does NOT inflate teach-time', savedMinutes()===13);

// 4. Report range filtering uses real attendance
function attendanceInRange(start,end){return Object.keys(attendance).filter(d=>d>=start&&d<=end).sort();}
ok('range 2026-10-30..2026-10-31 returns both days', JSON.stringify(attendanceInRange('2026-10-30','2026-10-31'))==='["2026-10-30","2026-10-31"]');
ok('range excludes out-of-range day', attendanceInRange('2026-10-31','2026-10-31').length===1);

// 5. Meal dedup on save (filter then push)
function saveMeal(arr,rec){arr=arr.filter(x=>x.date!==rec.date);arr.push(rec);return arr;}
let m=[{date:'2026-10-31',qty:100}];
m=saveMeal(m,{date:'2026-10-31',qty:150});
ok('meal save overwrites same date (no duplicate)', m.length===1 && m[0].qty===150);

// 6. Meal weekly summary average excludes missing days
const weekMeals=[{date:'2026-10-31',qty:120},{date:'2026-10-29',qty:100}];
const sum=weekMeals.reduce((a,x)=>a+x.qty,0);
ok('daily average over 2 recorded days = 110', Math.round(sum/weekMeals.length)===110);

console.log(fail===0?'\nALL TESTS PASSED':`\n${fail} TEST(S) FAILED`);
process.exit(fail?1:0);
