/**
 * 轮盘选择器 - 用于叫牌选择花色和点数
 * 支持鼠标点击和触摸滑动操作
 */

class WheelSelector {
    constructor(options = {}) {
        this.onConfirm = options.onConfirm || (() => {});
        this.onCancel = options.onCancel || (() => {});
        this.selectedSuit = null;
        this.selectedRank = null;
        this.phase = 'suit'; // 'suit' or 'rank'
        this.allowNT = options.allowNT || false;
        this.possibleRanks = options.possibleRanks || ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        this.container = null;
        this.suitWheel = null;
        this.rankWheel = null;
        this.startAngle = 0;
        this.currentRotation = 0;

        this.init();
    }

    init() {
        this.createContainer();
        this.bindEvents();
    }

    createContainer() {
        // 创建主容器
        this.container = document.createElement('div');
        this.container.className = 'wheel-selector-container';

        const selector = document.createElement('div');
        selector.className = 'wheel-selector';

        // 标题
        const title = document.createElement('h2');
        title.id = 'wheel-title';
        title.textContent = '选择花色';
        selector.appendChild(title);

        // 创建花色轮盘
        this.suitWheel = this.createSuitWheel();
        selector.appendChild(this.suitWheel);

        // 创建点数轮盘（初始隐藏）
        this.rankWheel = this.createRankWheel();
        this.rankWheel.style.display = 'none';
        selector.appendChild(this.rankWheel);

        // 选择预览
        const preview = document.createElement('div');
        preview.className = 'selection-preview';
        preview.id = 'selection-preview';
        preview.innerHTML = '请选择<span class="selected-suit">花色</span>';
        selector.appendChild(preview);

        // 按钮组
        const actions = document.createElement('div');
        actions.className = 'wheel-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'wheel-btn wheel-btn-cancel';
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = () => this.cancel();

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'wheel-btn wheel-btn-confirm';
        confirmBtn.textContent = '确认';
        confirmBtn.id = 'confirm-btn';
        confirmBtn.disabled = true;
        confirmBtn.onclick = () => this.confirm();

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        selector.appendChild(actions);

        this.container.appendChild(selector);
        document.body.appendChild(this.container);
    }

    createSuitWheel() {
        const wheel = document.createElement('div');
        wheel.className = 'suit-wheel';

        // 内圈
        const inner = document.createElement('div');
        inner.className = 'suit-wheel-inner';
        inner.innerHTML = '<span style="font-size: 24px; color: #ffd700;">花色</span>';
        wheel.appendChild(inner);

        // 花色选项
        const suits = [
            { name: 'spades', symbol: '♠', label: '黑桃' },
            { name: 'hearts', symbol: '♥', label: '红桃' },
            { name: 'clubs', symbol: '♣', label: '梅花' },
            { name: 'diamonds', symbol: '♦', label: '方片' }
        ];

        if (this.allowNT) {
            suits.push({ name: 'nt', symbol: 'NT', label: '无将' });
        }

        const positions = {
            'spades': 'spades',
            'clubs': 'clubs',
            'hearts': 'hearts',
            'diamonds': 'diamonds',
            'nt': 'nt'
        };

        suits.forEach(suit => {
            const option = document.createElement('div');
            option.className = `suit-option ${positions[suit.name]}`;
            option.innerHTML = suit.symbol;
            option.dataset.suit = suit.name;
            option.dataset.label = suit.label;

            // 颜色
            if (suit.name === 'hearts' || suit.name === 'diamonds') {
                option.style.color = '#e74c3c';
            } else if (suit.name === 'nt') {
                option.style.color = '#ffd700';
            } else {
                option.style.color = '#2c3e50';
            }

            option.onclick = () => this.selectSuit(suit.name, suit.label);
            wheel.appendChild(option);
        });

        return wheel;
    }

    createRankWheel() {
        const wheel = document.createElement('div');
        wheel.className = 'rank-wheel';

        this.possibleRanks.forEach(rank => {
            const option = document.createElement('div');
            option.className = 'rank-option';
            option.textContent = rank;
            option.dataset.rank = rank;
            option.onclick = () => this.selectRank(rank);
            wheel.appendChild(option);
        });

        return wheel;
    }

    bindEvents() {
        // 触摸滑动支持
        let touchStartX = 0;
        let touchStartY = 0;

        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (this.phase !== 'suit') return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            // 计算旋转角度
            const rect = this.suitWheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);

            this.suitWheel.style.transform = `rotate(${angle}rad)`;
        }, { passive: true });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.container.classList.contains('active')) {
                this.cancel();
            }
        });
    }

    selectSuit(suit, label) {
        this.selectedSuit = suit;

        // 更新UI
        document.querySelectorAll('.suit-option').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelector(`.suit-option[data-suit="${suit}"]`).classList.add('selected');

        // 进入点数选择阶段
        this.phase = 'rank';
        this.suitWheel.style.display = 'none';
        this.rankWheel.style.display = 'grid';

        document.getElementById('wheel-title').textContent = '选择点数';
        document.getElementById('selection-preview').innerHTML =
            `花色: <span class="selected-suit">${label}</span>, 选择<span class="selected-rank">点数</span>`;
    }

    selectRank(rank) {
        this.selectedRank = rank;

        // 更新UI
        document.querySelectorAll('.rank-option').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelector(`.rank-option[data-rank="${rank}"]`).classList.add('selected');

        // 更新预览
        const suitLabel = document.querySelector(`.suit-option[data-suit="${this.selectedSuit}"]`).dataset.label;
        document.getElementById('selection-preview').innerHTML =
            `已选择: <span class="selected-suit">${suitLabel}</span> <span class="selected-rank">${rank}</span>`;

        // 启用确认按钮
        document.getElementById('confirm-btn').disabled = false;
    }

    confirm() {
        if (!this.selectedSuit || !this.selectedRank) return;

        const suitLabel = document.querySelector(`.suit-option[data-suit="${this.selectedSuit}"]`).dataset.label;

        this.onConfirm({
            suit: this.selectedSuit,
            rank: this.selectedRank,
            suitLabel: suitLabel
        });

        this.hide();
    }

    cancel() {
        this.onCancel();
        this.hide();
    }

    show() {
        this.reset();
        this.container.classList.add('active');
    }

    hide() {
        this.container.classList.remove('active');
    }

    reset() {
        this.selectedSuit = null;
        this.selectedRank = null;
        this.phase = 'suit';

        // 重置UI
        this.suitWheel.style.display = 'block';
        this.rankWheel.style.display = 'none';
        document.getElementById('wheel-title').textContent = '选择花色';
        document.getElementById('selection-preview').innerHTML = '请选择<span class="selected-suit">花色</span>';
        document.getElementById('confirm-btn').disabled = true;

        document.querySelectorAll('.suit-option, .rank-option').forEach(el => {
            el.classList.remove('selected');
        });
    }

    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

/**
 * 显示叫牌轮盘选择器
 * @param {Object} options - 配置选项
 * @param {boolean} options.allowNT - 是否允许无将
 * @param {Array} options.possibleRanks - 可选的点数列表
 * @returns {Promise} 返回选择结果
 */
function showCallCardWheel(options = {}) {
    return new Promise((resolve, reject) => {
        const selector = new WheelSelector({
            allowNT: options.allowNT || false,
            possibleRanks: options.possibleRanks || ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'],
            onConfirm: (selection) => {
                resolve(selection);
            },
            onCancel: () => {
                reject(new Error('用户取消'));
            }
        });

        selector.show();

        // 保存引用以便外部控制
        window._currentWheelSelector = selector;
    });
}

// 关闭当前轮盘选择器
function closeCallCardWheel() {
    if (window._currentWheelSelector) {
        window._currentWheelSelector.destroy();
        window._currentWheelSelector = null;
    }
}
