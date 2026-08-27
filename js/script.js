/* ================================================================
   Balcão da Batata & Açaí — Sistema de Vendas
   Armazenamento local: os dados ficam salvos no localStorage do
   navegador (por computador/navegador, não em nuvem).
   ================================================================ */

const storage = {
  async get(key, shared){
    const raw = localStorage.getItem(key);
    if(raw === null) throw new Error('chave não encontrada: ' + key);
    return { key, value: raw, shared: !!shared };
  },
  async set(key, value, shared){
    localStorage.setItem(key, value);
    return { key, value, shared: !!shared };
  },
  async delete(key, shared){
    localStorage.removeItem(key);
    return { key, deleted: true, shared: !!shared };
  },
  async list(prefix, shared){
    const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
    return { keys, prefix, shared: !!shared };
  }
};
window.storage = storage;


const DEFAULT_PRODUCTS = [
  { id:'batata',   name:'Batata Frita',   price:13, group:'batata' },
  { id:'acai250',  name:'Açaí 250 ml',    price:12, group:'acai'   },
  { id:'acai300',  name:'Açaí 300 ml',    price:16, group:'acai'   },
  { id:'acai500',  name:'Açaí 500 ml',    price:24, group:'acai'   },
  { id:'acai700',  name:'Açaí 700 ml',    price:27, group:'acai'   },
];
const METHODS = ["Pix","Cartão","Dinheiro","Fiado"];
const METHOD_CLASS = { "Pix":"pix", "Cartão":"cartao", "Dinheiro":"dinheiro", "Fiado":"fiado" };

let products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
let sales = [];
let currentDate = todayStr();
let currentMonth = todayMonthStr();
let currentUser = null;
let cart = []; // [{ productId, quantity }]
let selectedMethods = []; // up to 2 method names, e.g. ["Pix","Dinheiro"]

function todayMonthStr(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0');
}
function fmtMonthLabel(monthStr){
  const [y,m] = monthStr.split('-').map(Number);
  const dt = new Date(y, m-1, 1);
  let label = dt.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return monthStr === todayMonthStr() ? label + " (este mês)" : label;
}
function shiftMonth(delta){
  const [y,m] = currentMonth.split('-').map(Number);
  const dt = new Date(y, m-1 + delta, 1);
  currentMonth = dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,'0');
  renderMonthSummary();
}
function todayStr(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0');
}
function fmtDateLabel(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  const isToday = dateStr === todayStr();
  const label = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
  return isToday ? label + " (hoje)" : label;
}
function fmtMoney(v){ return v.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function fmtTime(iso){ return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }
function shiftDate(days){
  const [y,m,d] = currentDate.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  dt.setDate(dt.getDate() + days);
  currentDate = dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,'0') + "-" + String(dt.getDate()).padStart(2,'0');
  render();
}
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function showToast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? 'var(--danger)' : 'var(--success)';
  t.style.color = isError ? '#fff' : '#08201a';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- auth ---------- */
async function getAuth(){
  try{
    const res = await window.storage.get('auth-batata-acai', false);
    return res && res.value ? JSON.parse(res.value) : null;
  }catch(e){ return null; }
}
async function setAuth(obj){
  try{ await window.storage.set('auth-batata-acai', JSON.stringify(obj), false); }
  catch(e){ showToast('Erro ao salvar credenciais.', true); }
}
async function clearAuth(){
  try{ await window.storage.delete('auth-batata-acai', false); }catch(e){}
}
async function initAuthScreen(){
  const auth = await getAuth();
  if(auth){
    document.getElementById('loginBlock').classList.remove('hidden');
    document.getElementById('signupBlock').classList.add('hidden');
  } else {
    document.getElementById('loginBlock').classList.add('hidden');
    document.getElementById('signupBlock').classList.remove('hidden');
  }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errBox = document.getElementById('loginError');
  errBox.classList.remove('show');
  if(!user || !pass){
    errBox.textContent = 'Preencha usuário e senha.';
    errBox.classList.add('show');
    return;
  }
  const auth = await getAuth();
  const hash = await sha256(pass);
  if(!auth || auth.username.toLowerCase() !== user.toLowerCase() || auth.hash !== hash){
    errBox.textContent = 'Usuário ou senha incorretos.';
    errBox.classList.add('show');
    return;
  }
  currentUser = auth.username;
  enterApp();
});

document.getElementById('signupBtn').addEventListener('click', async () => {
  const user = document.getElementById('suUser').value.trim();
  const pass = document.getElementById('suPass').value;
  const pass2 = document.getElementById('suPass2').value;
  const errBox = document.getElementById('signupError');
  errBox.classList.remove('show');
  if(!user || !pass || !pass2){
    errBox.textContent = 'Preencha todos os campos.';
    errBox.classList.add('show');
    return;
  }
  if(pass.length < 4){
    errBox.textContent = 'A senha deve ter pelo menos 4 caracteres.';
    errBox.classList.add('show');
    return;
  }
  if(pass !== pass2){
    errBox.textContent = 'As senhas não coincidem.';
    errBox.classList.add('show');
    return;
  }
  const hash = await sha256(pass);
  await setAuth({ username: user, hash: hash });
  currentUser = user;
  showToast('Acesso criado com sucesso.');
  enterApp();
});

document.getElementById('resetLink').addEventListener('click', async () => {
  if(confirm('Isso vai apagar o usuário e a senha atuais (as vendas registradas serão mantidas). Deseja continuar?')){
    await clearAuth();
    initAuthScreen();
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  initAuthScreen();
});

function enterApp(){
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('userName').textContent = currentUser;
  document.getElementById('userInitial').textContent = currentUser.charAt(0).toUpperCase();
  loadAppData();
}

/* ---------- app data ---------- */
function migrateLegacySales(raw){
  // Old format: flat array of item rows, each with its own `method`.
  // New format: array of sale groups, each with `items` + `payments`.
  if(!Array.isArray(raw) || raw.length === 0) return [];
  if(raw[0] && Array.isArray(raw[0].items)) return raw; // already new format

  const groups = [];
  const map = {};
  raw.forEach(s => {
    const key = s.saleId || s.id;
    if(!map[key]){
      map[key] = {
        id: key,
        date: s.date,
        timestamp: s.timestamp,
        items: [],
        payments: []
      };
      groups.push(map[key]);
    }
    map[key].items.push({
      productId: s.productId,
      productName: s.productName,
      quantity: s.quantity || 1,
      unitPrice: s.unitPrice || s.value,
      value: s.value
    });
  });
  groups.forEach(g => {
    const total = g.items.reduce((sum,i) => sum + i.value, 0);
    const method = raw.find(s => (s.saleId || s.id) === g.id).method;
    g.payments = [{ method: method, amount: total }];
  });
  return groups;
}

async function loadAppData(){
  try{
    const res = await window.storage.get('vendas-batata-acai', false);
    const raw = res && res.value ? JSON.parse(res.value) : [];
    sales = migrateLegacySales(raw);
  }catch(e){ sales = []; }
  try{
    const resProd = await window.storage.get('produtos-batata-acai', false);
    if(resProd && resProd.value){
      const saved = JSON.parse(resProd.value);
      products = DEFAULT_PRODUCTS.map(dp => {
        const match = saved.find(s => s.id === dp.id);
        return match ? { ...dp, price: match.price } : dp;
      });
    }
  }catch(e){ /* keep defaults */ }
  renderProductGrid();
  renderPricePanel();
  renderCart();
  render();
  renderMonthSummary();
}
async function saveSales(){
  try{ await window.storage.set('vendas-batata-acai', JSON.stringify(sales), false); }
  catch(e){ showToast('Erro ao salvar. Tente novamente.', true); }
}
async function saveProducts(){
  try{ await window.storage.set('produtos-batata-acai', JSON.stringify(products), false); }
  catch(e){ showToast('Erro ao salvar preços.', true); }
}

/* ---------- product grid ---------- */
function renderProductGrid(){
  const grid = document.getElementById('productGrid');
  grid.innerHTML = products.map(p => {
    const inCart = cart.find(c => c.productId === p.id);
    return `
    <button class="product-btn ${p.group} ${inCart ? 'in-cart' : ''}" data-id="${p.id}">
      ${inCart ? `<span class="p-cart-badge">${inCart.quantity}</span>` : ''}
      ${p.group === 'acai' ? '<span class="p-tag">Açaí</span>' : ''}
      ${p.name}
      <span class="p-price">R$ ${fmtMoney(p.price)}</span>
      <span class="p-hint">toque para adicionar</span>
    </button>
  `;
  }).join('');
  grid.querySelectorAll('.product-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
}

/* ---------- cart ---------- */
function addToCart(productId){
  const existing = cart.find(c => c.productId === productId);
  if(existing){ existing.quantity++; }
  else{ cart.push({ productId, quantity: 1 }); }
  renderProductGrid();
  renderCart();
}
function changeCartQty(productId, delta){
  const item = cart.find(c => c.productId === productId);
  if(!item) return;
  item.quantity += delta;
  if(item.quantity <= 0){
    cart = cart.filter(c => c.productId !== productId);
  }
  renderProductGrid();
  renderCart();
}
function removeFromCart(productId){
  cart = cart.filter(c => c.productId !== productId);
  renderProductGrid();
  renderCart();
}
function cartTotal(){
  return cart.reduce((sum, c) => {
    const p = products.find(x => x.id === c.productId);
    return sum + (p ? p.price * c.quantity : 0);
  }, 0);
}
function renderCart(){
  const box = document.getElementById('cartBox');
  const clearBtn = document.getElementById('cartClearAll');
  const payBtns = document.querySelectorAll('.pay-btn');

  if(cart.length === 0){
    box.innerHTML = `<div class="cart-empty">Toque nos produtos acima para adicionar ao carrinho.</div>`;
    clearBtn.classList.add('hidden');
    payBtns.forEach(b => b.disabled = true);
    selectedMethods = [];
    splitAmounts = {};
    updatePaymentUI();
    return;
  }

  let rows = '';
  cart.forEach(c => {
    const p = products.find(x => x.id === c.productId);
    if(!p) return;
    const subtotal = p.price * c.quantity;
    rows += `<div class="cart-row">
      <div>
        <span class="cart-name">${p.name}</span>
        <span class="cart-unit">R$ ${fmtMoney(p.price)} cada</span>
      </div>
      <div class="cart-stepper">
        <button data-action="minus" data-id="${p.id}" type="button">−</button>
        <span class="cart-qty">${c.quantity}</span>
        <button data-action="plus" data-id="${p.id}" type="button">+</button>
      </div>
      <span class="cart-subtotal">R$ ${fmtMoney(subtotal)}</span>
      <span></span>
      <button class="cart-remove" data-action="remove" data-id="${p.id}" title="Remover">✕</button>
    </div>`;
  });

  const total = cartTotal();
  const itemCount = cart.reduce((s,c) => s + c.quantity, 0);

  box.innerHTML = rows + `<div class="cart-footer">
      <span>${itemCount} ite${itemCount===1?'m':'ns'} no carrinho</span>
      <span class="ct-total">R$ ${fmtMoney(total)}</span>
    </div>`;

  box.querySelectorAll('[data-action="minus"]').forEach(b => b.addEventListener('click', () => changeCartQty(b.dataset.id, -1)));
  box.querySelectorAll('[data-action="plus"]').forEach(b => b.addEventListener('click', () => changeCartQty(b.dataset.id, 1)));
  box.querySelectorAll('[data-action="remove"]').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.id)));

  clearBtn.classList.remove('hidden');
  payBtns.forEach(b => b.disabled = false);
  updatePaymentUI();
}
document.getElementById('cartClearAll').addEventListener('click', () => {
  cart = [];
  selectedMethods = [];
  splitAmounts = {};
  renderProductGrid();
  renderCart();
});

/* ---------- price editing ---------- */
document.getElementById('pricesToggle').addEventListener('click', () => {
  document.getElementById('pricePanel').classList.toggle('hidden');
});
function renderPricePanel(){
  const grid = document.getElementById('priceGrid');
  grid.innerHTML = products.map(p => `
    <div class="price-field">
      <label>${p.name}</label>
      <div class="inputrow">
        <span>R$</span>
        <input type="number" step="0.5" min="0" value="${p.price}" data-id="${p.id}">
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', async (e) => {
      const v = parseFloat(e.target.value);
      const prod = products.find(p => p.id === e.target.dataset.id);
      prod.price = isNaN(v) || v <= 0 ? prod.price : v;
      e.target.value = prod.price;
      await saveProducts();
      renderProductGrid();
      renderCart();
      showToast(prod.name + ' atualizado para R$ ' + fmtMoney(prod.price));
    });
  });
}

/* ---------- payment method selection (1 or 2, with split) ---------- */
function togglePaymentMethod(method){
  if(cart.length === 0) return;
  const idx = selectedMethods.indexOf(method);
  if(idx >= 0){
    selectedMethods.splice(idx, 1);
  } else {
    if(selectedMethods.length >= 2){
      showToast('Escolha no máximo 2 formas de pagamento por venda.', true);
      return;
    }
    selectedMethods.push(method);
  }
  updatePaymentUI();
}
document.querySelectorAll('.pay-btn').forEach(btn => {
  btn.addEventListener('click', () => togglePaymentMethod(btn.dataset.method));
});

function updatePaymentUI(){
  document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.classList.toggle('selected', selectedMethods.includes(btn.dataset.method));
  });

  const hint = document.getElementById('payHint');
  const splitPanel = document.getElementById('splitPanel');
  const singlePanel = document.getElementById('singlePanel');
  const total = cartTotal();

  if(selectedMethods.length === 0){
    hint.classList.remove('hidden');
    hint.textContent = 'Toque em 1 ou 2 formas de pagamento (é possível dividir o valor entre duas).';
    splitPanel.classList.add('hidden');
    singlePanel.classList.add('hidden');
    return;
  }

  if(selectedMethods.length === 1){
    hint.classList.add('hidden');
    splitPanel.classList.add('hidden');
    singlePanel.classList.remove('hidden');
    document.getElementById('finalizeSingleBtn').textContent =
      'Finalizar venda • ' + selectedMethods[0] + ' — R$ ' + fmtMoney(total);
    return;
  }

  // two methods selected -> render split inputs
  hint.classList.add('hidden');
  singlePanel.classList.add('hidden');
  splitPanel.classList.remove('hidden');
  renderSplitRows();
}

function renderSplitRows(){
  const rowsBox = document.getElementById('splitRows');
  const total = cartTotal();
  const half = Math.round((total / 2) * 100) / 100;
  const firstAmount = splitAmounts[selectedMethods[0]] !== undefined ? splitAmounts[selectedMethods[0]] : half;
  const secondAmount = splitAmounts[selectedMethods[1]] !== undefined ? splitAmounts[selectedMethods[1]] : Math.round((total - firstAmount) * 100) / 100;

  rowsBox.innerHTML = selectedMethods.map((m, i) => `
    <div class="split-row">
      <span class="sr-method">${m}</span>
      <div class="sr-input">
        <span>R$</span>
        <input type="number" step="0.5" min="0" data-method="${m}" value="${i === 0 ? firstAmount : secondAmount}">
      </div>
    </div>
  `).join('');

  rowsBox.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      splitAmounts[e.target.dataset.method] = isNaN(v) ? 0 : v;
      updateSplitStatus();
    });
  });

  splitAmounts[selectedMethods[0]] = firstAmount;
  splitAmounts[selectedMethods[1]] = secondAmount;
  updateSplitStatus();
}

function updateSplitStatus(){
  const total = cartTotal();
  const sum = selectedMethods.reduce((s,m) => s + (splitAmounts[m] || 0), 0);
  const diff = Math.round((total - sum) * 100) / 100;
  const statusEl = document.getElementById('splitStatus');
  const finalizeBtn = document.getElementById('finalizeSplitBtn');

  if(Math.abs(diff) < 0.01){
    statusEl.textContent = 'Os valores conferem com o total do carrinho (R$ ' + fmtMoney(total) + ').';
    statusEl.className = 'split-status ok';
    finalizeBtn.disabled = false;
  } else if(diff > 0){
    statusEl.textContent = 'Falta alocar R$ ' + fmtMoney(diff) + ' para completar o total.';
    statusEl.className = 'split-status pending';
    finalizeBtn.disabled = true;
  } else {
    statusEl.textContent = 'O valor somado ultrapassa o total em R$ ' + fmtMoney(Math.abs(diff)) + '.';
    statusEl.className = 'split-status error';
    finalizeBtn.disabled = true;
  }
}

document.getElementById('splitEven').addEventListener('click', () => {
  const total = cartTotal();
  const half = Math.round((total / 2) * 100) / 100;
  splitAmounts[selectedMethods[0]] = half;
  splitAmounts[selectedMethods[1]] = Math.round((total - half) * 100) / 100;
  renderSplitRows();
});

let splitAmounts = {};

document.getElementById('finalizeSingleBtn').addEventListener('click', () => {
  if(selectedMethods.length !== 1) return;
  finalizeSale([{ method: selectedMethods[0], amount: cartTotal() }]);
});
document.getElementById('finalizeSplitBtn').addEventListener('click', () => {
  if(selectedMethods.length !== 2) return;
  const payments = selectedMethods.map(m => ({ method: m, amount: splitAmounts[m] || 0 }));
  finalizeSale(payments);
});

/* ---------- checkout (finalize sale with one or two payment methods) ---------- */
async function finalizeSale(payments){
  if(cart.length === 0) return;
  const now = new Date().toISOString();
  const saleId = Date.now() + '-' + Math.random().toString(36).slice(2,7);
  const dateForEntry = currentDate === todayStr() ? todayStr() : currentDate;

  const items = cart.map(c => {
    const p = products.find(x => x.id === c.productId);
    return p ? {
      productId: p.id,
      productName: p.name,
      quantity: c.quantity,
      unitPrice: p.price,
      value: p.price * c.quantity
    } : null;
  }).filter(Boolean);

  sales.push({ id: saleId, date: dateForEntry, timestamp: now, items, payments });

  const total = cartTotal();
  const itemCount = cart.reduce((s,c) => s + c.quantity, 0);
  const methodLabel = payments.map(p => p.method + ' R$ ' + fmtMoney(p.amount)).join(' + ');

  cart = [];
  selectedMethods = [];
  splitAmounts = {};
  renderProductGrid();
  renderCart();
  render();
  await saveSales();
  showToast(itemCount + ' ite' + (itemCount===1?'m':'ns') + ' • ' + methodLabel);
}

document.getElementById('prevDay').addEventListener('click', () => shiftDate(-1));
document.getElementById('nextDay').addEventListener('click', () => shiftDate(1));
document.getElementById('todayBtn').addEventListener('click', () => { currentDate = todayStr(); render(); });

async function deleteSale(id){
  sales = sales.filter(s => s.id !== id);
  render();
  await saveSales();
}

/* ---------- render ---------- */
function render(){
  document.getElementById('dateLabel').textContent = fmtDateLabel(currentDate);
  const daySales = sales.filter(s => s.date === currentDate).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

  // totals by payment method — sums the payment amount allocated to each
  // method (a split sale contributes to two methods at once).
  const totalsGrid = document.getElementById('totalsGrid');
  let grandTx = 0, grandValue = 0, html = '';
  METHODS.forEach(m => {
    let value = 0, tx = 0;
    daySales.forEach(s => {
      (s.payments || []).forEach(p => {
        if(p.method === m){ value += p.amount; tx++; }
      });
    });
    grandValue += value;
    html += `<div class="total-card">
      <div class="label">${m}</div>
      <div class="count">${tx} venda${tx===1?'':'s'}</div>
      <div class="value">R$ ${fmtMoney(value)}</div>
    </div>`;
  });
  daySales.forEach(s => grandTx++);
  html += `<div class="total-card grand">
    <div class="label">Total do dia</div>
    <div class="count">${grandTx} venda${grandTx===1?'':'s'}</div>
    <div class="value">R$ ${fmtMoney(grandValue)}</div>
  </div>`;
  totalsGrid.innerHTML = html;

  // totals by product (independent of how payment was split)
  const ptBox = document.getElementById('productTotalsBox');
  const allItems = daySales.flatMap(s => s.items || []);
  if(allItems.length === 0){
    ptBox.innerHTML = `<div class="pt-empty">nenhuma venda ainda</div>`;
  } else {
    let ptRows = `<div class="pt-row head"><span>Produto</span><span>Qtd.</span><span>Valor</span></div>`;
    products.forEach(p => {
      const items = allItems.filter(i => i.productId === p.id);
      if(items.length === 0) return;
      const qty = items.reduce((sum,i) => sum + (i.quantity || 1), 0);
      const value = items.reduce((sum,i) => sum + i.value, 0);
      ptRows += `<div class="pt-row">
        <span class="pt-name">${p.name}</span>
        <span class="pt-count">${qty}</span>
        <span class="pt-value">R$ ${fmtMoney(value)}</span>
      </div>`;
    });
    ptBox.innerHTML = ptRows;
  }

  // receipt — one block per sale (checkout event), showing items and the
  // one or two payment methods used
  const box = document.getElementById('receiptBox');
  if(daySales.length === 0){
    box.innerHTML = `<div class="receipt-empty">nenhuma venda registrada neste dia</div>`;
    renderMonthSummary();
    return;
  }

  let html2 = `<div class="receipt-head"><span>Produto</span><span>Horário</span><span>Valor</span><span></span></div>`;
  daySales.forEach(g => {
    const groupTotal = (g.items || []).reduce((sum,i) => sum + i.value, 0);
    const payments = g.payments || [];
    const methodBadges = payments.map(p => {
      const cls = payments.length > 1 ? 'split' : (METHOD_CLASS[p.method] || '');
      const label = payments.length > 1 ? `${p.method} R$ ${fmtMoney(p.amount)}` : p.method;
      return `<span class="sg-method ${cls}">${label}</span>`;
    }).join(' ');

    html2 += `<div class="sale-group">
      <div class="sale-group-head">
        <span style="display:flex; gap:6px; flex-wrap:wrap;">${methodBadges}</span>
        <button class="r-del" data-group="${g.id}" title="Remover venda inteira">✕</button>
      </div>`;
    (g.items || []).forEach(i => {
      const qty = i.quantity || 1;
      html2 += `<div class="receipt-row">
        <span class="r-product">${qty > 1 ? qty + 'x ' : ''}${i.productName}</span>
        <span class="r-time">${fmtTime(g.timestamp)}</span>
        <span class="r-value">R$ ${fmtMoney(i.value)}</span>
        <span></span>
      </div>`;
    });
    html2 += `<div class="sale-group-total">Total da venda: R$ ${fmtMoney(groupTotal)}</div></div>`;
  });

  box.innerHTML = html2;
  box.querySelectorAll('[data-group]').forEach(btn => btn.addEventListener('click', () => deleteSale(btn.dataset.group)));

  renderMonthSummary();
}

/* ---------- monthly summary ---------- */
function renderMonthSummary(){
  document.getElementById('monthLabel').textContent = fmtMonthLabel(currentMonth);
  const monthSales = sales.filter(s => (s.date || '').startsWith(currentMonth));

  const grid = document.getElementById('monthTotalsGrid');
  let grandTx = monthSales.length, grandValue = 0, html = '';
  METHODS.forEach(m => {
    let value = 0, tx = 0;
    monthSales.forEach(s => {
      (s.payments || []).forEach(p => {
        if(p.method === m){ value += p.amount; tx++; }
      });
    });
    grandValue += value;
    html += `<div class="total-card">
      <div class="label">${m}</div>
      <div class="count">${tx} venda${tx===1?'':'s'}</div>
      <div class="value">R$ ${fmtMoney(value)}</div>
    </div>`;
  });
  html += `<div class="total-card grand">
    <div class="label">Total do mês</div>
    <div class="count">${grandTx} venda${grandTx===1?'':'s'}</div>
    <div class="value">R$ ${fmtMoney(grandValue)}</div>
  </div>`;
  grid.innerHTML = html;

  const ptBox = document.getElementById('monthProductTotalsBox');
  const allItems = monthSales.flatMap(s => s.items || []);
  if(allItems.length === 0){
    ptBox.innerHTML = `<div class="pt-empty">nenhuma venda registrada neste mês</div>`;
  } else {
    let ptRows = `<div class="pt-row head"><span>Produto</span><span>Qtd.</span><span>Valor</span></div>`;
    products.forEach(p => {
      const items = allItems.filter(i => i.productId === p.id);
      if(items.length === 0) return;
      const qty = items.reduce((sum,i) => sum + (i.quantity || 1), 0);
      const value = items.reduce((sum,i) => sum + i.value, 0);
      ptRows += `<div class="pt-row">
        <span class="pt-name">${p.name}</span>
        <span class="pt-count">${qty}</span>
        <span class="pt-value">R$ ${fmtMoney(value)}</span>
      </div>`;
    });
    ptBox.innerHTML = ptRows;
  }

  renderProductDayTable(monthSales);
}

function renderProductDayTable(monthSales){
  const box = document.getElementById('productDayTableBox');
  if(monthSales.length === 0){
    box.innerHTML = `<div class="pdt-empty">nenhuma venda registrada neste mês</div>`;
    return;
  }

  const dates = Array.from(new Set(monthSales.map(s => s.date))).sort();
  const productTotals = {};
  products.forEach(p => productTotals[p.id] = 0);
  let grandValue = 0;

  let thead = `<tr><th class="pdt-day">Dia</th>` +
    products.map(p => `<th>${p.name}</th>`).join('') +
    `<th class="pdt-total">Total do dia</th></tr>`;

  let bodyRows = '';
  dates.forEach(dateStr => {
    const items = monthSales.filter(s => s.date === dateStr).flatMap(s => s.items || []);
    const dayValue = items.reduce((sum,i) => sum + i.value, 0);
    grandValue += dayValue;
    const [, m, d] = dateStr.split('-');
    bodyRows += `<tr><td class="pdt-day">${d}/${m}</td>` +
      products.map(p => {
        const qty = items.filter(i => i.productId === p.id).reduce((s,i) => s + (i.quantity || 1), 0);
        productTotals[p.id] += qty;
        return `<td>${qty > 0 ? qty : '—'}</td>`;
      }).join('') +
      `<td class="pdt-total">R$ ${fmtMoney(dayValue)}</td></tr>`;
  });

  const footRow = `<tr class="pdt-foot"><td class="pdt-day">Total do mês</td>` +
    products.map(p => `<td>${productTotals[p.id]}</td>`).join('') +
    `<td class="pdt-total">R$ ${fmtMoney(grandValue)}</td></tr>`;

  box.innerHTML = `<div class="table-scroll"><table class="pdt-table"><thead>${thead}</thead><tbody>${bodyRows}${footRow}</tbody></table></div>`;
}
document.getElementById('prevMonth').addEventListener('click', () => shiftMonth(-1));
document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
document.getElementById('thisMonthBtn').addEventListener('click', () => { currentMonth = todayMonthStr(); renderMonthSummary(); });

initAuthScreen();
