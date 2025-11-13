/*
  app.js - Billing UI logic
  - add / edit / delete items
  - live totals with tax & discount
  - PDF export using html2canvas + jsPDF
*/

const billItems = [];

function formatCurrency(v) {
  return Number(v).toFixed(2);
}

function addItemFromForm() {
  const nameEl = document.getElementById('itemName');
  const qtyEl = document.getElementById('itemQty');
  const priceEl = document.getElementById('itemPrice');

  const itemName = nameEl.value.trim();
  const itemQty = parseInt(qtyEl.value, 10) || 0;
  const itemPrice = parseFloat(priceEl.value) || 0;

  if (!itemName) return alert('Please enter item name');
  if (itemQty <= 0) return alert('Quantity should be at least 1');
  if (itemPrice < 0) return alert('Price should be >= 0');

  billItems.push({ itemName, itemQty, itemPrice, itemTotal: itemQty * itemPrice });

  nameEl.value = '';
  qtyEl.value = 1;
  priceEl.value = '';

  renderTable();
}

function renderTable() {
  const tbody = document.querySelector('#billTable tbody');
  tbody.innerHTML = '';

  billItems.forEach((item, index) => {
    const tr = document.createElement('tr');

    // Item name
    const tdName = document.createElement('td');
    tdName.textContent = item.itemName;
    tr.appendChild(tdName);

    // Qty (editable)
    const tdQty = document.createElement('td');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = item.itemQty;
    qtyInput.className = 'form-control form-control-sm';
    qtyInput.addEventListener('change', () => updateItem(index, 'itemQty', parseInt(qtyInput.value) || 1));
    tdQty.appendChild(qtyInput);
    tr.appendChild(tdQty);

    // Price (editable)
    const tdPrice = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = item.itemPrice;
    priceInput.className = 'form-control form-control-sm';
    priceInput.addEventListener('change', () => updateItem(index, 'itemPrice', parseFloat(priceInput.value) || 0));
    tdPrice.appendChild(priceInput);
    tr.appendChild(tdPrice);

    // Total
    const tdTotal = document.createElement('td');
    tdTotal.textContent = formatCurrency(item.itemTotal);
    tr.appendChild(tdTotal);

    // Actions
    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteItem(index));
    tdAction.appendChild(delBtn);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });

  calculateTotals();
}

function updateItem(index, field, value) {
  const item = billItems[index];
  if (!item) return;
  if (field === 'itemQty') item.itemQty = value;
  if (field === 'itemPrice') item.itemPrice = value;
  item.itemTotal = item.itemQty * item.itemPrice;
  renderTable();
}

function deleteItem(index) {
  billItems.splice(index, 1);
  renderTable();
}

function calculateTotals() {
  const sub = billItems.reduce((s, it) => s + it.itemTotal, 0);
  const tax = Math.max(0, parseFloat(document.getElementById('taxPercent').value) || 0);
  const discount = Math.max(0, parseFloat(document.getElementById('discountPercent').value) || 0);

  const taxAmount = (sub * tax) / 100;
  const discountAmount = (sub * discount) / 100;
  const grand = sub + taxAmount - discountAmount;
  document.getElementsById('taxPercent').textcontent =formatCurrency(tax);

  document.getElementById('subTotal').textContent = formatCurrency(sub);
  document.getElementById('grandTotal').textContent = formatCurrency(grand >= 0 ? grand : 0);
}

function clearAll() {
  if (!confirm('Clear all items and fields?')) return;
  billItems.length = 0;
  document.getElementById('customerName').value = '';
  document.getElementById('customerContact').value = '';
  document.getElementById('taxPercent').value = 0;
  document.getElementById('discountPercent').value = 0;
  renderTable();
}

async function savePdf() {
  // capture the bill area and use jsPDF
  const bill = document.getElementById('billArea');
  if (!bill) return;

  // show a small UI hint
  const saveBtn = document.getElementById('savePdfBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const canvas = await html2canvas(bill, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidthMm = pageWidth - 20; // 10mm margin each side
    const imgHeightMm = (imgProps.height * imgWidthMm) / imgProps.width;

    let top = 10;
    pdf.addImage(imgData, 'PNG', 10, top, imgWidthMm, imgHeightMm);

    const customer = document.getElementById('customerName').value || 'customer';
    const filename = `bill_${customer.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`;
    pdf.save(filename);
  } catch (err) {
    console.error(err);
    alert('Failed to generate PDF: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save PDF';
  }
}

// wire up events
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addItemBtn').addEventListener('click', addItemFromForm);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('savePdfBtn').addEventListener('click', savePdf);

  document.getElementById('taxPercent').addEventListener('change', calculateTotals);
  document.getElementById('discountPercent').addEventListener('change', calculateTotals);

  // press Enter on price input to add item
  document.getElementById('itemPrice').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItemFromForm();
  });

  // set current date
  document.getElementById('currentDate').textContent = new Date().toLocaleString();

  renderTable();
});