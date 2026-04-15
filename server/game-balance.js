// game-balance.js (сервер)
// Единый источник игровых констант и лимитов

const baseStats = {
    warrior: { hp: 35, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 20, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 20, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

const rolePassives = {
    guardian: { damageReduction: 10, blockChance: 20 },
    berserker: { rage: true },
    knight: { reflect: 20 },
    assassin: { critMultiplier: 2.0 },
    venom_blade: { poison: true },
    blood_hunter: { vamp: 20 },
    pyromancer: { burn: true },
    cryomancer: { freezeChance: 25, physReduction: 30 },
    illusionist: { mirageGuaranteed: true },
    mouse_necromancer: { revive: true },
    mouse_blade: { doubleAttack: true, ultimateIgnoreDef: true, ultimateVamp: 100 },
    mouse_antimag: { manaSteal: 5, ultimateManaDependent: true },
    mouse_paladin: { damageReduction: 50, invincible: true },
    mouse_alchemist: { poisonOnHit: true, poisonDamagePercent: 50, ultimatePoison: true },
    mouse_shadow: { dodgeChance: 90, invisibility: true }
};

const subclassOptions = {
    warrior: ['guardian', 'berserker', 'knight'],
    assassin: ['assassin', 'venom_blade', 'blood_hunter'],
    mage: ['pyromancer', 'cryomancer', 'illusionist']
};

const roleNames = {
    warrior: { guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь' },
    assassin: { assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник' },
    mage: { pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист' }
};

const importance = {
    warrior: { hp: 2.0, atk: 2.0, def: 2.0, crit: 1.5, reflect: 1.5, critDmg: 1.5, agi: 1.0, int: 1.0, spd: 1.0, vamp: 0.5 },
    assassin: { atk: 2.0, agi: 2.0, vamp: 2.0, hp: 1.5, crit: 1.5, critDmg: 1.5, def: 1.0, int: 1.0, spd: 1.0, reflect: 1.0 },
    mage: { atk: 2.0, int: 2.0, agi: 2.0, hp: 1.5, crit: 1.5, critDmg: 1.5, def: 1.0, spd: 1.0, vamp: 0.5, reflect: 0.5 }
};

const GAME_LIMITS = {
    crit: { min: 0, max: 100 },
    def: { min: 0, max: 70 },
    agi: { min: 0, max: 70 },
    critDmg: { min: 1.5, max: 4.5 },
    energy: { max: 20, regenMinutes: 15 },
    mana: { max: 100, baseRegen: 15 }
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

module.exports = { baseStats, rolePassives, subclassOptions, roleNames, importance, GAME_LIMITS, clamp };
