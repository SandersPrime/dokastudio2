(function () {
    const api = window.EquipmentService;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function money(value) {
        const amount = Number(value || 0);
        return amount ? `${amount.toLocaleString('ru-RU')} ₽` : 'по запросу';
    }

    function formatDate(value) {
        if (!value) return '—';
        return new Date(value).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function imageStyle(url) {
        const safeUrl = String(url || '').trim();
        return safeUrl ? `background-image: url('${escapeHtml(safeUrl)}')` : '';
    }

    function setStatus(target, message, type = 'info') {
        if (!target) return;
        target.textContent = message || '';
        target.className = `equipment-status equipment-status-${type}`;
    }

    function getFormData(form) {
        const data = Object.fromEntries(new FormData(form).entries());
        form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            data[input.name] = input.checked;
        });
        return data;
    }

    function compactQuery(data) {
        return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    }

    function renderProductCard(product, { admin = false } = {}) {
        const badges = [product.category, product.scenarioType].filter(Boolean);
        return `
            <article class="equipment-card" data-product-id="${escapeHtml(product.id)}" data-slug="${escapeHtml(product.slug)}">
                <div class="equipment-card-image" style="${imageStyle(product.imageUrl)}"></div>
                <div class="equipment-card-body">
                    <div class="equipment-card-meta">
                        ${badges.map((badge) => `<span class="badge badge-primary">${escapeHtml(badge)}</span>`).join('')}
                        ${admin ? `<span class="badge ${product.isPublished ? 'badge-success' : 'badge-warning'}">${product.isPublished ? 'Опубликован' : 'Черновик'}</span>` : ''}
                    </div>
                    <h3>${escapeHtml(product.title)}</h3>
                    <p>${escapeHtml(product.shortDescription || product.description || 'Описание пока не добавлено.')}</p>
                    <div class="equipment-price-row">
                        <span>Продажа: <strong>${money(product.price)}</strong></span>
                        <span>Аренда: <strong>${money(product.rentalPriceDay)}/день</strong></span>
                    </div>
                    <div class="equipment-actions">
                        ${admin
                            ? `<button class="btn btn-secondary btn-sm" data-action="edit-product">Редактировать</button>
                               <button class="btn btn-danger btn-sm" data-action="delete-product">Удалить</button>`
                            : `<button class="btn btn-primary btn-sm" data-action="open-product">Открыть</button>
                               <button class="btn btn-secondary btn-sm" data-action="request-product">Оставить заявку</button>`}
                    </div>
                </div>
            </article>`;
    }

    function initPublicPage() {
        const page = document.getElementById('equipmentPage');
        if (!page) return;

        const filterForm = document.getElementById('equipmentFilters');
        const grid = document.getElementById('equipmentGrid');
        const details = document.getElementById('equipmentDetails');
        const requestForm = document.getElementById('equipmentRequestForm');
        const status = document.getElementById('equipmentStatus');
        const requestProductId = document.getElementById('requestProductId');
        const requestTitle = document.getElementById('requestTitle');
        let products = [];

        async function loadProducts() {
            setStatus(status, 'Загружаем оборудование...');
            const filters = compactQuery(getFormData(filterForm));
            const result = await api.getAll(filters);
            products = result.products || [];
            grid.innerHTML = products.length
                ? products.map((product) => renderProductCard(product)).join('')
                : '<div class="card empty-state">Ничего не найдено. Попробуйте изменить фильтры.</div>';
            setStatus(status, products.length ? `Найдено позиций: ${products.length}` : '');
        }

        function showProduct(product) {
            const gallery = Array.isArray(product.gallery) ? product.gallery : [];
            details.hidden = false;
            details.innerHTML = `
                <div class="equipment-detail-cover" style="${imageStyle(product.imageUrl)}"></div>
                <div class="equipment-detail-body">
                    <div class="equipment-card-meta">
                        ${product.category ? `<span class="badge badge-primary">${escapeHtml(product.category)}</span>` : ''}
                        ${product.scenarioType ? `<span class="badge">${escapeHtml(product.scenarioType)}</span>` : ''}
                    </div>
                    <h2>${escapeHtml(product.title)}</h2>
                    <p>${escapeHtml(product.description || product.shortDescription || '')}</p>
                    <div class="equipment-specs">
                        <span>В наличии: <strong>${Number(product.stockQty || 0)}</strong></span>
                        <span>Покупка: <strong>${money(product.price)}</strong></span>
                        <span>Аренда: <strong>${money(product.rentalPriceDay)}/день</strong></span>
                        <span>Депозит: <strong>${money(product.depositAmount)}</strong></span>
                    </div>
                    ${gallery.length ? `<div class="equipment-gallery">${gallery.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.title)}">`).join('')}</div>` : ''}
                    <button class="btn btn-primary" data-action="request-detail" data-product-id="${escapeHtml(product.id)}">Оставить заявку</button>
                </div>`;
            details.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function selectProductForRequest(product) {
            requestProductId.value = product?.id || '';
            requestTitle.textContent = product ? `Заявка по позиции: ${product.title}` : 'Заявка на подбор комплекта';
            requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        filterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            try {
                await loadProducts();
            } catch (error) {
                setStatus(status, error.message, 'error');
            }
        });

        grid.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const card = button.closest('[data-product-id]');
            const product = products.find((item) => item.id === card?.dataset.productId);
            if (!product) return;
            if (button.dataset.action === 'open-product') {
                try {
                    const result = await api.getBySlug(product.slug);
                    showProduct(result.product);
                } catch (error) {
                    setStatus(status, error.message, 'error');
                }
            }
            if (button.dataset.action === 'request-product') selectProductForRequest(product);
        });

        details.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action="request-detail"]');
            if (!button) return;
            const product = products.find((item) => item.id === button.dataset.productId);
            selectProductForRequest(product);
        });

        requestForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = requestForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            try {
                const data = compactQuery(getFormData(requestForm));
                const result = await api.createRequest(data);
                requestForm.reset();
                requestProductId.value = '';
                requestTitle.textContent = 'Заявка на оборудование';
                setStatus(status, `Заявка #${result.request.id.slice(0, 8)} создана. Мы свяжемся с вами.`, 'success');
            } catch (error) {
                setStatus(status, error.message, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });

        loadProducts().catch((error) => setStatus(status, error.message, 'error'));
    }

    function initAdminProductsPage() {
        const page = document.getElementById('adminEquipmentPage');
        if (!page) return;

        const form = document.getElementById('equipmentProductForm');
        const grid = document.getElementById('adminEquipmentGrid');
        const status = document.getElementById('adminEquipmentStatus');
        const resetButton = document.getElementById('resetProductForm');
        let products = [];
        let editingId = null;

        async function loadProducts() {
            setStatus(status, 'Загружаем товары...');
            const result = await api.adminGetProducts();
            products = result.products || [];
            grid.innerHTML = products.length
                ? products.map((product) => renderProductCard(product, { admin: true })).join('')
                : '<div class="card empty-state">Товаров пока нет. Создайте первую карточку.</div>';
            setStatus(status, `Карточек: ${products.length}`);
        }

        function fillForm(product) {
            editingId = product.id;
            form.title.value = product.title || '';
            form.slug.value = product.slug || '';
            form.shortDescription.value = product.shortDescription || '';
            form.description.value = product.description || '';
            form.imageUrl.value = product.imageUrl || '';
            form.galleryJson.value = JSON.stringify(product.gallery || [], null, 2);
            form.category.value = product.category || '';
            form.scenarioType.value = product.scenarioType || '';
            form.price.value = product.price || 0;
            form.rentalPriceDay.value = product.rentalPriceDay || 0;
            form.depositAmount.value = product.depositAmount || 0;
            form.stockQty.value = product.stockQty || 0;
            form.availableForSale.checked = Boolean(product.availableForSale);
            form.availableForRent.checked = Boolean(product.availableForRent);
            form.isPublished.checked = Boolean(product.isPublished);
            document.getElementById('productFormTitle').textContent = 'Редактирование товара';
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function resetForm() {
            editingId = null;
            form.reset();
            form.availableForSale.checked = true;
            form.availableForRent.checked = true;
            form.galleryJson.value = '[]';
            document.getElementById('productFormTitle').textContent = 'Новая карточка товара';
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            try {
                const payload = getFormData(form);
                const result = editingId
                    ? await api.adminUpdateProduct(editingId, payload)
                    : await api.adminCreateProduct(payload);
                setStatus(status, `Карточка «${result.product.title}» сохранена`, 'success');
                resetForm();
                await loadProducts();
            } catch (error) {
                setStatus(status, error.message, 'error');
            } finally {
                submitButton.disabled = false;
            }
        });

        resetButton.addEventListener('click', resetForm);

        grid.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const productId = button.closest('[data-product-id]')?.dataset.productId;
            const product = products.find((item) => item.id === productId);
            if (!product) return;
            if (button.dataset.action === 'edit-product') fillForm(product);
            if (button.dataset.action === 'delete-product') {
                if (!window.confirm(`Удалить «${product.title}»? Заявки по нему сохранятся без привязки.`)) return;
                try {
                    await api.adminDeleteProduct(product.id);
                    setStatus(status, 'Карточка удалена', 'success');
                    await loadProducts();
                } catch (error) {
                    setStatus(status, error.message, 'error');
                }
            }
        });

        resetForm();
        loadProducts().catch((error) => setStatus(status, error.message, 'error'));
    }

    function initAdminRequestsPage() {
        const page = document.getElementById('adminEquipmentRequestsPage');
        if (!page) return;

        const statusFilter = document.getElementById('requestStatusFilter');
        const list = document.getElementById('equipmentRequestsList');
        const status = document.getElementById('adminRequestsStatus');
        const statuses = ['NEW', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED'];
        let requests = [];

        async function loadRequests() {
            setStatus(status, 'Загружаем заявки...');
            const result = await api.adminGetRequests(compactQuery({ status: statusFilter.value }));
            requests = result.requests || [];
            list.innerHTML = requests.length ? requests.map((request) => `
                <article class="request-card" data-request-id="${escapeHtml(request.id)}">
                    <div>
                        <span class="badge badge-primary">${escapeHtml(request.type)}</span>
                        <span class="badge">${escapeHtml(request.status)}</span>
                    </div>
                    <h3>${escapeHtml(request.customerName)}</h3>
                    <p>${escapeHtml(request.product?.title || 'Пакетная/общая заявка')}</p>
                    <div class="equipment-specs">
                        <span>Email: <strong>${escapeHtml(request.customerEmail)}</strong></span>
                        <span>Телефон: <strong>${escapeHtml(request.customerPhone || '—')}</strong></span>
                        <span>Дата: <strong>${formatDate(request.eventDate)}</strong></span>
                        <span>Дней: <strong>${request.rentalDays || '—'}</strong></span>
                        <span>Кол-во: <strong>${request.quantity}</strong></span>
                        <span>Создана: <strong>${formatDate(request.createdAt)}</strong></span>
                    </div>
                    ${request.companyName ? `<p>Компания: ${escapeHtml(request.companyName)}</p>` : ''}
                    ${request.message ? `<p>${escapeHtml(request.message)}</p>` : ''}
                    <div class="request-admin-row">
                        <select class="input" data-field="status">
                            ${statuses.map((item) => `<option value="${item}" ${item === request.status ? 'selected' : ''}>${item}</option>`).join('')}
                        </select>
                        <textarea class="input" data-field="adminNote" placeholder="Заметка администратора">${escapeHtml(request.adminNote || '')}</textarea>
                        <button class="btn btn-primary btn-sm" data-action="save-request">Сохранить</button>
                    </div>
                </article>`).join('') : '<div class="card empty-state">Заявок по этому фильтру нет.</div>';
            setStatus(status, `Заявок: ${requests.length}`);
        }

        statusFilter.addEventListener('change', () => loadRequests().catch((error) => setStatus(status, error.message, 'error')));

        list.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action="save-request"]');
            if (!button) return;
            const card = button.closest('[data-request-id]');
            button.disabled = true;
            try {
                await api.adminUpdateRequest(card.dataset.requestId, {
                    status: card.querySelector('[data-field="status"]').value,
                    adminNote: card.querySelector('[data-field="adminNote"]').value,
                });
                setStatus(status, 'Заявка обновлена', 'success');
                await loadRequests();
            } catch (error) {
                setStatus(status, error.message, 'error');
            } finally {
                button.disabled = false;
            }
        });

        loadRequests().catch((error) => setStatus(status, error.message, 'error'));
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!api) return;
        initPublicPage();
        initAdminProductsPage();
        initAdminRequestsPage();
    });
})();
