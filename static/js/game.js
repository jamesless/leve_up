// ===== Game Lobby JavaScript =====

let currentRoomId = null;
let refreshInterval = null;

// Initialize lobby
document.addEventListener('DOMContentLoaded', function() {
    initLobby();
});

async function initLobby() {
    // Check authentication
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }

    // Update user info
    updateUserDisplay(user);

    // Load rooms
    await loadRooms();

    // Set up create form
    document.getElementById('createForm')?.addEventListener('submit', handleCreateRoom);

    // Start auto-refresh
    startAutoRefresh();
}

function updateUserDisplay(user) {
    document.getElementById('username').textContent = user.username;
    document.getElementById('userLevel').textContent = user.level + '级';
    document.getElementById('userStats').textContent = `${user.wins}胜 ${user.losses}负`;
    document.getElementById('navUser')?.remove();
}

async function loadRooms() {
    const roomsList = document.getElementById('roomsList');

    // In a real app, this would fetch from the API
    // For now, show a sample room list
    roomsList.innerHTML = `
        <div class="room-card">
            <div class="room-info">
                <h3>新手房间</h3>
                <p>等级限制: 2-5级 | 等待中</p>
            </div>
            <div class="room-players">
                <div class="player-avatar">3</div>
                <div class="player-avatar">?</div>
                <div class="player-avatar empty">?</div>
                <div class="player-avatar empty">?</div>
                <div class="player-avatar empty">?</div>
            </div>
            <button class="btn btn-primary" onclick="joinRoom('room1')">加入</button>
        </div>
        <div class="room-card">
            <div class="room-info">
                <h3>高手对决</h3>
                <p>等级限制: 8-A级 | 等待中</p>
            </div>
            <div class="room-players">
                <div class="player-avatar">2</div>
                <div class="player-avatar">?</div>
                <div class="player-avatar empty">?</div>
                <div class="player-avatar empty">?</div>
                <div class="player-avatar empty">?</div>
            </div>
            <button class="btn btn-primary" onclick="joinRoom('room2')">加入</button>
        </div>
    `;
}

function createGame() {
    document.getElementById('createModal').style.display = 'flex';
}

async function createSinglePlayerGame() {
    // Create single player game with AI opponents
    const result = await api.post('/api/game/singleplayer', { name: '单人练习' });
    
    if (result.success) {
        // Navigate to single player game
        window.location.href = `/game/singleplayer/${result.game.id}`;
    } else {
        showError(result.error || '创建单人游戏失败');
    }
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
}

async function handleCreateRoom(e) {
    e.preventDefault();
    const roomName = document.getElementById('roomName').value;

    const result = await api.post('/api/game/create', { name: roomName });

    if (result.success) {
        closeCreateModal();
        joinRoom(result.game.id);
    } else {
        showError(result.error || '创建房间失败');
    }
}

async function joinRoom(roomId) {
    currentRoomId = roomId;

    const result = await api.post(`/api/game/${roomId}/join`, {});

    if (result.success) {
        showRoomModal(result.game);
    } else {
        showError(result.error || '加入房间失败');
    }
}

function showRoomModal(game) {
    const modal = document.getElementById('roomModal');
    const title = document.getElementById('roomTitle');
    const playersDiv = document.getElementById('roomPlayers');

    title.textContent = game.name || '游戏房间';

    // Display players
    let playersHTML = '';
    for (let i = 0; i < 5; i++) {
        const player = game.players?.[i];
        if (player) {
            playersHTML += `
                <div class="room-player">
                    <div class="player-avatar">${player.username[0]}</div>
                    <p>${player.username}</p>
                    <p class="level-badge">${player.level}级</p>
                </div>
            `;
        } else {
            playersHTML += `
                <div class="room-player">
                    <div class="player-avatar empty">?</div>
                    <p>等待加入...</p>
                </div>
            `;
        }
    }
    playersDiv.innerHTML = playersHTML;

    // Show start button for host
    const startBtn = document.getElementById('startGameBtn');
    const user = getCurrentUser();
    if (game.hostId === user?.id && game.playerIds?.length >= 2) {
        startBtn.style.display = 'inline-flex';
    } else {
        startBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeRoomModal() {
    document.getElementById('roomModal').style.display = 'none';
    currentRoomId = null;
}

function leaveRoom() {
    closeRoomModal();
}

function startGame() {
    // Navigate to game board
    alert('游戏即将开始！（功能开发中）');
    // window.location.href = `/game/board/${currentRoomId}`;
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        loadRooms();
        if (currentRoomId) {
            // Refresh room status
            api.get(`/api/game/${currentRoomId}`).then(result => {
                if (result.success) {
                    showRoomModal(result.game);
                }
            });
        }
    }, 5000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});
