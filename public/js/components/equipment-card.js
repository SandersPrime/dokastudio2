(function () {
    function renderEquipmentCard(product) {
        const escape = window.DomUtils?.escapeHtml || ((value) => String(value ?? ''));
        const money = window.FormatUtils?.money || ((value) => `${Number(value || 0)} ₽`);
        return `
            <article class="equipment-card" data-product-id="${escape(product.id)}" data-slug="${escape(product.slug)}">
                <div class="equipment-card-body">
                    <h3>${escape(product.title)}</h3>
                    <p>${escape(product.shortDescription || product.description || '')}</p>
                    <span class="badge badge-primary">${money(product.price)}</span>
                </div>
            </article>`;
    }
    window.EquipmentCardComponent = window.EquipmentCardComponent || { render: renderEquipmentCard };
})();
