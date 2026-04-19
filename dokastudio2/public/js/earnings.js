// public/js/earnings.js

function earningsEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function money(value) {
    return `${(Number(value) || 0).toFixed(2)} ₽`;
}

function earningsStatus(message, isError = false) {
    const node = document.getElementById('earningsStatus');
    if (!node) return;
    node.textContent = message;
    node.className = `status-box ${isError ? 'error' : 'success'}`;
    node.style.display = 'block';
    setTimeout(() => { node.style.display = 'none'; }, 3500);
}

async function loadEarningsPage() {
    const root = document.getElementById('earningsRoot');
    if (!root) return;
    try {
        const [summary, sales, payouts] = await Promise.all([
            EarningsService.getSummary(),
            EarningsService.getSales(),
            EarningsService.getPayoutRequests(),
        ]);
        renderSummary(summary.summary);
        renderSales(sales.sales || []);
        renderPayouts(payouts.payoutRequests || []);
    } catch (error) {
        earningsStatus(error.message || 'Ошибка загрузки доходов', true);
    }
}

function renderSummary(summary) {
    const root = document.getElementById('summaryCards');
    const cards = [
        ['Продаж', summary.totalSalesCount],
        ['Оборот', money(summary.grossRevenue)],
        ['Комиссия', money(summary.totalPlatformFee)],
        ['Доход автора', money(summary.totalAuthorRevenue)],
        ['Доступно', money(summary.availableBalance)],
        ['В заявках', money(summary.pendingPayoutAmount)],
        ['Выплачено', money(summary.paidOutAmount)],
    ];
    root.innerHTML = cards.map(([label, value]) => `
        <div class="summary-card">
            <div class="summary-value">${value}</div>
            <div class="text-secondary">${label}</div>
        </div>
    `).join('');
}

function renderSales(sales) {
    const root = document.getElementById('salesTable');
    if (!sales.length) {
        root.innerHTML = '<div class="empty-state">Продаж пока нет</div>';
        return;
    }
    root.innerHTML = sales.map((sale) => `
        <div class="table-row">
            <span>${earningsEscapeHtml(sale.quizTitle)}</span>
            <span>${money(sale.pricePaid)}</span>
            <span>${money(sale.platformFee)}</span>
            <strong>${money(sale.authorRevenue)}</strong>
            <span>${new Date(sale.createdAt).toLocaleString('ru-RU')}</span>
        </div>
    `).join('');
}

function renderPayouts(payouts) {
    const root = document.getElementById('payoutList');
    if (!payouts.length) {
        root.innerHTML = '<div class="empty-state">Заявок пока нет</div>';
        return;
    }
    root.innerHTML = payouts.map((request) => `
        <div class="table-row">
            <span>${money(request.amount)}</span>
            <strong>${earningsEscapeHtml(request.status)}</strong>
            <span>${earningsEscapeHtml(request.payoutMethod)}</span>
            <span>${new Date(request.requestedAt).toLocaleString('ru-RU')}</span>
        </div>
    `).join('');
}

async function createPayoutRequest() {
    try {
        await EarningsService.createPayoutRequest({
            amount: Number(document.getElementById('payoutAmount').value || 0),
            payoutMethod: document.getElementById('payoutMethod').value,
            payoutDetails: document.getElementById('payoutDetails').value,
        });
        document.getElementById('payoutForm').reset();
        earningsStatus('Заявка создана');
        await loadEarningsPage();
    } catch (error) {
        earningsStatus(error.message || 'Ошибка создания заявки', true);
    }
}

async function loadAdminPayouts() {
    const root = document.getElementById('adminPayoutList');
    if (!root) return;
    try {
        const result = await EarningsService.getAdminPayoutRequests();
        renderAdminPayouts(result.payoutRequests || []);
    } catch (error) {
        root.innerHTML = '<div class="empty-state">Нет доступа или ошибка загрузки</div>';
        earningsStatus(error.message || 'Ошибка загрузки заявок', true);
    }
}

function renderAdminPayouts(requests) {
    const root = document.getElementById('adminPayoutList');
    if (!requests.length) {
        root.innerHTML = '<div class="empty-state">Заявок нет</div>';
        return;
    }
    root.innerHTML = requests.map((request) => `
        <article class="payout-card">
            <div class="table-row">
                <span>${earningsEscapeHtml(request.author?.name || 'Автор')}</span>
                <strong>${money(request.amount)}</strong>
                <span>${earningsEscapeHtml(request.status)}</span>
                <span>${earningsEscapeHtml(request.payoutMethod)}</span>
            </div>
            <div class="text-secondary">${earningsEscapeHtml(request.payoutDetails)}</div>
            <textarea class="input mt-2" id="note-${request.id}" rows="2" placeholder="Комментарий админа">${earningsEscapeHtml(request.adminNote || '')}</textarea>
            <div class="d-flex gap-2 mt-2">
                <button class="btn btn-primary" onclick="approvePayout('${request.id}')">Approve</button>
                <button class="btn btn-outline" onclick="rejectPayout('${request.id}')">Reject</button>
                <button class="btn btn-outline" onclick="markPayoutPaid('${request.id}')">Mark paid</button>
            </div>
        </article>
    `).join('');
}

function adminNote(id) {
    return document.getElementById(`note-${id}`)?.value || '';
}

async function approvePayout(id) {
    try {
        await EarningsService.approvePayoutRequest(id, adminNote(id));
        earningsStatus('Заявка одобрена');
        await loadAdminPayouts();
    } catch (error) {
        earningsStatus(error.message || 'Ошибка approve', true);
    }
}

async function rejectPayout(id) {
    try {
        await EarningsService.rejectPayoutRequest(id, adminNote(id));
        earningsStatus('Заявка отклонена');
        await loadAdminPayouts();
    } catch (error) {
        earningsStatus(error.message || 'Ошибка reject', true);
    }
}

async function markPayoutPaid(id) {
    try {
        await EarningsService.markPayoutPaid(id, adminNote(id));
        earningsStatus('Заявка отмечена оплаченной');
        await loadAdminPayouts();
    } catch (error) {
        earningsStatus(error.message || 'Ошибка mark paid', true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadEarningsPage();
    loadAdminPayouts();
});

window.createPayoutRequest = createPayoutRequest;
window.approvePayout = approvePayout;
window.rejectPayout = rejectPayout;
window.markPayoutPaid = markPayoutPaid;
