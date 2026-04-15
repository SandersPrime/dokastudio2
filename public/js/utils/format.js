(function () {
    const FormatUtils = {
        date(value) {
            return value ? new Date(value).toLocaleString('ru-RU') : '—';
        },
        money(value) {
            const amount = Number(value || 0);
            return amount ? `${amount.toLocaleString('ru-RU')} ₽` : '0 ₽';
        },
        percent(value) {
            return `${Number(value || 0).toLocaleString('ru-RU')}%`;
        },
    };
    window.FormatUtils = FormatUtils;
})();
