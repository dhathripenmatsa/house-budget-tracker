/* ---------- GLOBALS ---------- */
let chart;   // reference to the Chart.js pie/doughnut chart

/* ---------- MAIN CALCULATION ---------- */
function calculate() {
  // 1. Remove previous error states
  document.querySelectorAll("input[type='number']").forEach(inp => inp.classList.remove("error"));

  // 2. Gather nodes
  const incomeEls  = [...document.querySelectorAll(".income input")];
  const expenseEls = [...document.querySelectorAll(".expense input")];

  // 3. Validation
  let valid = true;
  [...incomeEls, ...expenseEls].forEach(input => {
    const v = input.value.trim();
    if (v === "" || isNaN(v) || +v < 0) {
      input.classList.add("error");
      valid = false;
    }
  });

  if (!valid) {
    alert("❌ Please fill all fields with valid non-negative numbers.");
    return;
  }

  // 4. Totals
  const incomes  = incomeEls.map(i => +i.value);
  const expenses = expenseEls.map(e => +e.value);
  const totalIncome   = incomes.reduce((a,b)=>a+b,0);
  const totalExpenses = expenses.reduce((a,b)=>a+b,0);
  const balance       = totalIncome - totalExpenses;

  // 5. Warnings
  if (balance < 0) alert("⚠️ Warning: expenses exceed income!");

  // 6. Update DOM
  document.getElementById("totalIncome").textContent   = totalIncome.toLocaleString("en-IN");
  document.getElementById("totalExpenses").textContent = totalExpenses.toLocaleString("en-IN");
  document.getElementById("balance").textContent       = balance.toLocaleString("en-IN");

  // 7. Progress bar width & color
  const goal      = +document.getElementById("goal").textContent || 0;
  const progress  = goal ? Math.min((balance / goal) * 100, 100) : 0;
  const pBar      = document.getElementById("progressBar");
  pBar.style.width = `${progress}%`;

  // color thresholds
  if (progress < 40)       pBar.style.backgroundColor = "#f44336"; // red
  else if (progress < 80)  pBar.style.backgroundColor = "#ff9800"; // orange
  else                     pBar.style.backgroundColor = "#4caf50"; // green
  pBar.title = `You're ${Math.round(progress)}% towards your goal`;

  // 8. Update chart
  updateChart(expenses);

  // 9. Save data for current month
  saveMonthData();
}

/* ---------- GOAL INPUT ---------- */
function updateGoal() {
  const val = +document.getElementById("goalInput").value || 0;
  document.getElementById("goal").textContent = val;
  calculate();  // recalc progress bar
}

/* ---------- CHART LOGIC ---------- */
function updateChart(expenseData) {
  const labels = [
    "Rent/Mortgage", "Groceries", "Utilities", "Internet/Mobile",
    "Education", "Health", "Entertainment", "Others"
  ];
  const ctx = document.getElementById("expenseChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: expenseData,
        backgroundColor: [
          "#ff6384","#36a2eb","#ffcd56","#4bc0c0",
          "#9966ff","#ff9f40","#c45850","#8bc34a"
        ],
        borderWidth:1
      }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}

/* ---------- RESET ---------- */
function resetForm() {
  document.querySelectorAll("input[type='number']").forEach(inp => inp.value = "");
  document.getElementById("goalInput").value = "";
  document.getElementById("goal").textContent = 0;
  calculate();  // will also refresh display & chart
}

/* ---------- MONTHLY STORAGE ---------- */
function monthKey() {
  return document.getElementById("monthSelect").value; // e.g. "2025-06"
}

function saveMonthData() {
  const data = {
    incomes:  [...document.querySelectorAll('.income  input')].map(i=>i.value),
    expenses: [...document.querySelectorAll('.expense input')].map(e=>e.value),
    goal: document.getElementById("goal").textContent
  };
  localStorage.setItem(`budget-${monthKey()}`, JSON.stringify(data));
}

function loadMonthData() {
  const stored = JSON.parse(localStorage.getItem(`budget-${monthKey()}`));
  const incomeEls  = [...document.querySelectorAll(".income  input")];
  const expenseEls = [...document.querySelectorAll(".expense input")];

  if (stored) {
    incomeEls .forEach((el,i)=> el.value = stored.incomes [i] || "");
    expenseEls.forEach((el,i)=> el.value = stored.expenses[i] || "");
    document.getElementById("goal").textContent      = stored.goal || 0;
    document.getElementById("goalInput").value       = stored.goal || "";
  } else {
    [...incomeEls, ...expenseEls].forEach(el=> el.value="");
    document.getElementById("goal").textContent = 0;
    document.getElementById("goalInput").value  = "";
  }
  calculate(); // refresh UI & chart
}

/* ---------- INITIAL LOAD ---------- */
window.onload = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const sel = document.getElementById("monthSelect");
  if ([...sel.options].some(o => o.value === currentMonth)) sel.value = currentMonth;

  // 🔄 Load saved dark mode
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeToggle").checked = true;
  }

  loadMonthData();
};
function exportToCSV() {
  const month = monthKey();
  const incomeLabels = ["Primary Income", "Secondary Income", "Other Income"];
  const expenseLabels = [
    "Rent/Mortgage", "Groceries", "Utilities", "Internet/Mobile",
    "Education", "Health", "Entertainment", "Others"
  ];

  const incomeValues  = [...document.querySelectorAll(".income input")].map(i => i.value || 0);
  const expenseValues = [...document.querySelectorAll(".expense input")].map(e => e.value || 0);

  const totalIncome   = incomeValues.reduce((a,b)=>+a + +b, 0);
  const totalExpenses = expenseValues.reduce((a,b)=>+a + +b, 0);
  const balance       = totalIncome - totalExpenses;
  const goal          = document.getElementById("goal").textContent;

  let csv = `Month,${month}\n\nIncomes\n`;
  incomeLabels.forEach((label, i) => {
    csv += `${label},${incomeValues[i]}\n`;
  });

  csv += `Total Income,${totalIncome}\n\nExpenses\n`;
  expenseLabels.forEach((label, i) => {
    csv += `${label},${expenseValues[i]}\n`;
  });

  csv += `Total Expenses,${totalExpenses}\n\n`;
  csv += `Savings Goal,${goal}\nRemaining Balance,${balance}\n`;

  // Download as file
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `budget-${month}.csv`;
  link.click();
}
function toggleDarkMode() {
  const body = document.body;
  const isDark = body.classList.toggle("dark-mode");

  localStorage.setItem("darkMode", isDark); // Save preference
}



