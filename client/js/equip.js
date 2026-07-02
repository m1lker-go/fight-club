// equip.js – Рюкзак и экипировка (локализация)

// Локальная функция цвета редкости
function getRarityColor(rarity) {
    const colors = {
        common: '#aaa',
        uncommon: '#2ecc71',
        rare: '#2e86de',
        epic: '#9b59b6',
        legendary: '#f1c40f'
    };
    return colors[rarity] || '#aaa';
}

function showUnequipConfirmModal(item, onConfirm) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = window.$t('equip:unequip_confirm_title', 'Снять предмет?');

    const stats = [];
    if (item.atk_bonus) stats.push(window.$t('common:АТК', 'АТК') + `+${item.atk_bonus}`);
    if (item.def_bonus) stats.push(window.$t('common:ЗАЩ', 'ЗАЩ') + `+${item.def_bonus}`);
    if (item.hp_bonus) stats.push(window.$t('common:ЗДОР', 'ЗДОР') + `+${item.hp_bonus}`);
    if (item.spd_bonus) stats.push(window.$t('common:СКОР', 'СКОР') + `+${item.spd_bonus}`);
    if (item.crit_bonus) stats.push(window.$t('common:КРИТ', 'КРИТ') + `+${item.crit_bonus}%`);
    if (item.crit_dmg_bonus) stats.push(window.$t('common:КР.УРОН', 'КР.УРОН') + `+${item.crit_dmg_bonus}%`);
    if (item.agi_bonus) stats.push(window.$t('common:ЛОВ', 'ЛОВ') + `+${item.agi_bonus}%`);
    if (item.int_bonus) stats.push(window.$t('common:ИНТ', 'ИНТ') + `+${item.int_bonus}%`);
    if (item.vamp_bonus) stats.push(window.$t('common:ВАМП', 'ВАМП') + `+${item.vamp_bonus}%`);
    if (item.reflect_bonus) stats.push(window.$t('common:ОТР', 'ОТР') + `+${item.reflect_bonus}%`);

    const iconPath = window.getItemIconPath ? window.getItemIconPath(item) : '';
    const rarityColors = { common: '#aaa', uncommon: '#2ecc71', rare: '#2e86de', epic: '#9b59b6', legendary: '#f1c40f' };
    const borderColor = rarityColors[item.rarity] || '#aaa';

    modalBody.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #1a1f2b; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid ${borderColor};">
                ${iconPath ? `<img src="${iconPath}" style="width: 70px; height: 70px; object-fit: contain;">` : '<div style="font-size: 64px;">📦</div>'}
            </div>
            <div style="font-weight: bold; margin-top: 10px; font-size: 18px; color: ${borderColor};">${escapeHtml(itemNameTranslations[item.name] || item.name)}</div>
            <div class="rarity-${item.rarity}" style="margin: 5px 0;">${window.$t(`common:${item.rarity}`, item.rarity)}</div>
            <div style="color: white; font-size: 14px; margin-bottom: 5px;">${window.$t('equip:class', 'Класс')} ${item.owner_class === 'warrior' ? window.$t('common:Воин', 'Воин') : (item.owner_class === 'assassin' ? window.$t('common:Ассасин', 'Ассасин') : window.$t('common:Маг', 'Маг'))}</div>
            <div style="color: white; font-size: 14px; margin-bottom: 15px;">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 24px;">${window.$t('equip:Снять', 'Снять')}</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542; border: 2px solid #aaa; color: #aaa; border-radius: 30px; padding: 8px 24px;">${window.$t('common:Отмена', 'Отмена')}</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';

    const yesBtn = modalBody.querySelector('.confirm-yes');
    const noBtn = modalBody.querySelector('.confirm-no');
    const closeX = modal.querySelector('.close');

    const closeModal = () => { modal.style.display = 'none'; };

    yesBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });

    noBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => { if (event.target === modal) closeModal(); };
}

function renderEquip() {
    if (!userData) {
        console.warn('renderEquip: userData not ready, skipping');
        return;
    }
    const content = document.getElementById('content');
    if (!content) return;
    if (!Array.isArray(inventory)) return;

    let selectedClass = localStorage.getItem('equipSelectedClass');
    if (!selectedClass || !['warrior', 'assassin', 'mage'].includes(selectedClass)) {
        selectedClass = userData.current_class;
    }

    // Карты папок и типов для иконок (нужны, если используется локальная getItemIconPath, но мы будем использовать window.getItemIconPath)
    const classFolderMap = { warrior: 'tank', assassin: 'assassin', mage: 'mage' };
    const typeFileMap = { armor: 'armor', boots: 'boots', helmet: 'helmet', weapon: 'weapon', accessory: 'ring', gloves: 'bracer' };

    // Используем глобальную функцию иконок, если она есть; иначе оставляем локальную заглушку
    const getIcon = (item) => {
        if (typeof window.getItemIconPath === 'function') {
            return window.getItemIconPath(item);
        }
        // fallback
        if (!item) return '';
        const folder = classFolderMap[item.owner_class];
        const fileType = typeFileMap[item.type];
        if (!folder || !fileType) return '';
        return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
    };

    function renderTopBar(className) {
        const classItems = inventory.filter(item => 
            item.owner_class === className && 
            (!item.class_restriction || item.class_restriction === 'any' || item.class_restriction === className)
        );
        const equipped = classItems.filter(item => item.equipped);

        const slotConfig = {
            left: [
                { type: 'helmet', icon: '/assets/helmet.png' },
                { type: 'armor', icon: '/assets/armor.png' },
                { type: 'gloves', icon: '/assets/arm.png' }
            ],
            right: [
                { type: 'weapon', icon: '/assets/weapon.png' },
                { type: 'boots', icon: '/assets/leg.png' },
                { type: 'accessory', icon: '/assets/ring.png' }
            ]
        };

        let html = `<div class="equip-top-bar"><div class="equip-column">`;
        slotConfig.left.forEach(slot => {
            const item = equipped.find(i => i.type === slot.type);
            const icon = item ? getIcon(item) : slot.icon;
            const slotBg = item ? `/assets/slot_${item.rarity}.png` : '/assets/slot.png';
            html += `
                <div class="equip-slot" data-slot="${slot.type}" data-item-id="${item ? item.id : ''}" style="background-image: url('${slotBg}'); background-size: cover;">
                    <div class="slot-icon" style="background-image: url('${icon}');"></div>
                </div>
            `;
        });
        html += `</div><div class="hero-center"><img src="/assets/${escapeHtml(userData.avatar || 'cat_heroweb.png')}" alt="hero"></div><div class="equip-column">`;
        slotConfig.right.forEach(slot => {
            const item = equipped.find(i => i.type === slot.type);
            const icon = item ? getIcon(item) : slot.icon;
            const slotBg = item ? `/assets/slot_${item.rarity}.png` : '/assets/slot.png';
            html += `
                <div class="equip-slot" data-slot="${slot.type}" data-item-id="${item ? item.id : ''}" style="background-image: url('${slotBg}'); background-size: cover;">
                    <div class="slot-icon" style="background-image: url('${icon}');"></div>
                </div>
            `;
        });
        html += `</div></div>`;
        return html;
    }

    function renderInventoryList(className) {
        const classItems = inventory.filter(item => 
            item.owner_class === className && 
            (!item.class_restriction || item.class_restriction === 'any' || item.class_restriction === className)
        );
        const unequipped = classItems.filter(item => !item.equipped && !item.in_forge && item.type !== 'scroll');
        let itemsHtml = '';
        unequipped.forEach(item => {
            const rarityClass = `rarity-${item.rarity}`;
            const stats = [];
            if (item.atk_bonus) stats.push(window.$t('common:АТК', 'АТК') + `+${item.atk_bonus}`);
            if (item.def_bonus) stats.push(window.$t('common:ЗАЩ', 'ЗАЩ') + `+${item.def_bonus}`);
            if (item.hp_bonus) stats.push(window.$t('common:ЗДОР', 'ЗДОР') + `+${item.hp_bonus}`);
            if (item.spd_bonus) stats.push(window.$t('common:СКОР', 'СКОР') + `+${item.spd_bonus}`);
            if (item.crit_bonus) stats.push(window.$t('common:КРИТ', 'КРИТ') + `+${item.crit_bonus}%`);
            if (item.crit_dmg_bonus) stats.push(window.$t('common:КР.УРОН', 'КР.УРОН') + `+${item.crit_dmg_bonus}%`);
            if (item.agi_bonus) stats.push(window.$t('common:ЛОВ', 'ЛОВ') + `+${item.agi_bonus}%`);
            if (item.int_bonus) stats.push(window.$t('common:ИНТ', 'ИНТ') + `+${item.int_bonus}%`);
            if (item.vamp_bonus) stats.push(window.$t('common:ВАМП', 'ВАМП') + `+${item.vamp_bonus}%`);
            if (item.reflect_bonus) stats.push(window.$t('common:ОТР', 'ОТР') + `+${item.reflect_bonus}%`);

            const itemIcon = getIcon(item);
            const classNameRu = item.owner_class === 'warrior' ? window.$t('common:Воин', 'Воин') : (item.owner_class === 'assassin' ? window.$t('common:Ассасин', 'Ассасин') : window.$t('common:Маг', 'Маг'));

            const isForSale = item.for_sale === true;
            let actionButtonsHtml = '';
            if (isForSale) {
                actionButtonsHtml = `
                    <button class="inv-action-btn unsell-btn" data-item-id="${item.id}" data-action="unsell">${window.$t('equip:Снять с продажи', 'Снять с продажи')}</button>
                    <button class="inv-action-btn edit-price-btn" data-item-id="${item.id}" data-action="editPrice">${window.$t('equip:change_price', 'Изменить цену')}</button>
                `;
            } else {
                actionButtonsHtml = `
                    <button class="inv-action-btn equip-btn" data-item-id="${item.id}" data-action="equip">${window.$t('equip:Снять', 'Снять')}</button>
                    <button class="inv-action-btn sell-btn" data-item-id="${item.id}" data-action="sell">${window.$t('common:Продать', 'Продать')}</button>
                `;
            }

            let iconHtml = `<div class="inv-icon-img" style="background-image: url('${itemIcon}');"></div>`;
            if (isForSale) {
                iconHtml += `<div class="sale-overlay">${window.$t('equip:on_sale', 'Продаётся')}</div>`;
            }

            itemsHtml += `
                <div class="inventory-row ${rarityClass}" data-item-id="${item.id}" data-for-sale="${item.for_sale}" data-in-forge="${item.in_forge}">
                    <div class="inv-icon">${iconHtml}</div>
                    <div class="inv-info">
                        <div class="inv-name">
                            <span class="inv-name-text" style="color: ${getRarityColor(item.rarity)};">${escapeHtml(itemNameTranslations[item.name] || item.name)}</span>
                            <span class="inv-class">(${escapeHtml(classNameRu)})</span>
                        </div>
                        <div class="inv-stats">${stats.map(s => escapeHtml(s)).join(' • ')}</div>
                    </div>
                    <div class="inv-actions">${actionButtonsHtml}</div>
                </div>
            `;
        });

        const emptyRowsCount = Math.max(0, 4 - unequipped.length);
        for (let i = 0; i < emptyRowsCount; i++) {
            itemsHtml += `<div class="inventory-row empty-row"><div class="inv-icon empty-icon"></div><div class="inv-info"></div><div class="inv-actions"></div></div>`;
        }
        return itemsHtml;
    }

    content.innerHTML = `
        <div class="equip-container">
            <div class="class-selector">
                <button class="class-btn ${selectedClass === 'warrior' ? 'active' : ''}" data-class="warrior">${window.$t('common:Воин', 'Воин')}</button>
                <button class="class-btn ${selectedClass === 'assassin' ? 'active' : ''}" data-class="assassin">${window.$t('common:Ассасин', 'Ассасин')}</button>
                <button class="class-btn ${selectedClass === 'mage' ? 'active' : ''}" data-class="mage">${window.$t('common:Маг', 'Маг')}</button>
            </div>
            <div class="equip-top">${renderTopBar(selectedClass)}</div>
            <div class="inventory-section">
                <div class="inventory-header">${window.$t('equip:Рюкзак', 'Рюкзак')}</div>
                <div class="inventory-list">${renderInventoryList(selectedClass)}</div>
            </div>
        </div>
    `;

    // Обработчики
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newClass = e.currentTarget.dataset.class;
            localStorage.setItem('equipSelectedClass', newClass);
            renderEquip();
        });
    });

    document.querySelectorAll('.equip-slot').forEach(slot => {
        slot.addEventListener('click', async (e) => {
            const itemId = slot.dataset.itemId;
            if (itemId == null) return;
            const item = inventory.find(i => i.id == Number(itemId));
            if (!item) return;
            showUnequipConfirmModal(item, async () => {
                try {
                    const res = await window.apiRequest('/inventory/unequip', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        showToast(window.$t('equip:unequip_error', 'Ошибка при снятии'), 1500);
                    }
                } catch (e) {
                    showToast(window.$t('common:Сеть недоступна', 'Сеть недоступна'), 1500);
                }
            });
        });
    });

    document.querySelectorAll('.inv-action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btnEl = e.currentTarget;
            const itemId = btnEl.dataset.itemId;
            if (itemId == null) return;
            const action = btnEl.dataset.action;

            if (action === 'equip') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                const equippedInSlot = inventory.find(i => i.equipped && i.type === item.type && i.owner_class === currentClass);
                if (equippedInSlot) {
                    if (typeof showEquipCompareModal === 'function') {
                        showEquipCompareModal(equippedInSlot, item);
                    } else {
                        showToast('Функция сравнения недоступна', 1500);
                    }
                } else {
                    const res = await window.apiRequest('/inventory/equip', {
                        method: 'POST',
                        body: JSON.stringify({ item_id: itemId, target_class: currentClass })
                    });
                    if (res.ok) {
                        await refreshData();
                        renderEquip();
                    } else {
                        const err = await res.json();
                        showToast(window.$t('equip:equip_error', 'Ошибка экипировки') + err.error, 1500);
                    }
                }
            } else if (action === 'sell') {
                const currentClass = document.querySelector('.class-btn.active').dataset.class;
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                if (item.owner_class !== currentClass) {
                    showToast(window.$t('equip:not_current_class', 'Предмет не принадлежит текущему классу!'), 1500);
                    return;
                }
                if (typeof showPriceInputModal === 'function') {
                    showPriceInputModal(null, async (price) => {
                        const res = await window.apiRequest('/inventory/sell', {
                            method: 'POST',
                            body: JSON.stringify({ item_id: itemId, price: price })
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast(window.$t('equip:item_listed', 'Предмет выставлен на маркет'), 1500);
                            await refreshData();
                            renderEquip();
                        } else {
                            showToast(window.$t('equip:sell_error', 'Ошибка продажи') + data.error, 1500);
                        }
                    });
                } else {
                    showToast('Функция ввода цены недоступна', 1500);
                }
            } else if (action === 'unsell') {
                if (typeof showConfirmModal === 'function') {
                    showConfirmModal(window.$t('equip:unsell_confirm', 'Снять предмет с продажи?'), async () => {
                        const res = await window.apiRequest('/inventory/unsell', { method: 'POST', body: JSON.stringify({ item_id: itemId }) });
                        if (res.ok) {
                            showToast(window.$t('equip:item_unlisted', 'Предмет снят с продажи'), 1500);
                            await refreshData();
                            renderEquip();
                        } else {
                            showToast(window.$t('equip:unsell_error', 'Ошибка при снятии с продажи'), 1500);
                        }
                    });
                } else {
                    showToast('Функция подтверждения недоступна', 1500);
                }
            } else if (action === 'editPrice') {
                const item = inventory.find(i => i.id == Number(itemId));
                if (!item) return;
                if (typeof showEditPriceModal === 'function') {
                    showEditPriceModal(item);
                } else {
                    showToast('Функция изменения цены недоступна', 1500);
                }
            }
        });
    });
}

// Экспорт
window.renderEquip = renderEquip;
window.showUnequipConfirmModal = showUnequipConfirmModal;
