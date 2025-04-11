// 存储所有标签池和标签
let pools = [];
let selectedPool = null;

// 右键菜单相关变量
let contextMenu = null;
let currentTarget = null;
let currentTargetType = null; // 'pool' 或 'tag'

// 处理回车键
function handleKeyPress(event, type) {
    if (event.key === 'Enter') {
        event.preventDefault();
        switch (type) {
            case 'pool':
                createNewPool();
                break;
            case 'tag':
                addTag();
                break;
            case 'draw':
                drawTags();
                break;
        }
    }
}

// 从本地存储加载数据
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('tagPools');
    if (savedData) {
        const data = JSON.parse(savedData);
        // 兼容旧数据格式
        pools = data.map(pool => ({
            ...pool,
            tags: pool.tags.map(tag => 
                typeof tag === 'string' ? { name: tag, disabled: false } : tag
            )
        }));
        updatePoolList();
        updateGlobalPreview();
    }
}

// 保存数据到本地存储
function saveToLocalStorage() {
    localStorage.setItem('tagPools', JSON.stringify(pools));
}

// 页面加载时从本地存储加载数据
document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

// 创建新标签池
function createNewPool() {
    const poolName = document.getElementById('newPoolName').value.trim();
    const minDraw = parseInt(document.getElementById('newPoolMin').value) || 0;
    const maxDraw = parseInt(document.getElementById('newPoolMax').value) || 0;

    if (!poolName) {
        alert('请输入标签池名称');
        return;
    }

    if (pools.some(pool => pool.name === poolName)) {
        alert('该标签池已存在');
        return;
    }

    if (maxDraw < minDraw) {
        alert('最大抽取数不能小于最小抽取数');
        return;
    }

    pools.push({
        name: poolName,
        minDraw: minDraw,
        maxDraw: maxDraw,
        tags: []
    });

    document.getElementById('newPoolName').value = '';
    document.getElementById('newPoolMin').value = '0';
    document.getElementById('newPoolMax').value = '0';
    updatePoolList();
    updateGlobalPreview();
    saveToLocalStorage();
}

// 更新标签池列表显示
function updatePoolList() {
    const poolList = document.getElementById('poolList');
    poolList.innerHTML = '';
    
    pools.forEach((pool, index) => {
        const poolItem = document.createElement('div');
        poolItem.className = 'pool-item';
        poolItem.innerHTML = `
            <div class="pool-info">
                <span>${pool.name}</span>
                <span class="pool-limits">(${pool.minDraw}-${pool.maxDraw})</span>
            </div>
        `;
        poolItem.onclick = () => selectPool(index);
        poolItem.oncontextmenu = (e) => showContextMenu(e, index, 'pool');
        if (selectedPool && selectedPool === pool) {
            poolItem.classList.add('selected-pool');
        }
        poolList.appendChild(poolItem);
    });
}

// 重命名标签池
function renamePool(index) {
    event.stopPropagation();
    const newName = prompt('请输入新的标签池名称：', pools[index].name);
    if (newName && newName.trim() && newName !== pools[index].name) {
        if (pools.some(pool => pool.name === newName)) {
            alert('该标签池名称已存在');
            return;
        }
        pools[index].name = newName;
        if (selectedPool === pools[index]) {
            selectedPool = pools[index];
        }
        updatePoolList();
        updateGlobalPreview();
        saveToLocalStorage();
    }
}

// 选择标签池
function selectPool(index) {
    selectedPool = pools[index];
    updatePoolList();
    updateTagList();
}

// 删除标签池
function deletePool(index) {
    event.stopPropagation();
    if (confirm(`确定要删除标签池"${pools[index].name}"吗？`)) {
        pools.splice(index, 1);
        if (selectedPool === pools[index]) {
            selectedPool = null;
        }
        updatePoolList();
        updateTagList();
        updateGlobalPreview();
        saveToLocalStorage();
    }
}

// 更新标签列表显示
function updateTagList() {
    const tagList = document.getElementById('tagList');
    tagList.innerHTML = '';
    
    if (selectedPool) {
        selectedPool.tags.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.className = `tag-item ${tag.disabled ? 'disabled' : ''}`;
            tagItem.innerHTML = `
                <span>${tag.name}</span>
            `;
            tagItem.oncontextmenu = (e) => showContextMenu(e, tag.name, 'tag');
            tagList.appendChild(tagItem);
        });
    }
}

// 添加标签
function addTag() {
    if (!selectedPool) {
        alert('请先选择标签池');
        return;
    }
    
    const tagName = document.getElementById('newTagName').value.trim();
    if (!tagName) {
        alert('请输入标签名称');
        return;
    }
    
    if (selectedPool.tags.some(tag => tag.name === tagName)) {
        alert('该标签已存在');
        return;
    }
    
    selectedPool.tags.push({
        name: tagName,
        disabled: false
    });
    
    document.getElementById('newTagName').value = '';
    updateTagList();
    updateGlobalPreview();
    saveToLocalStorage();
}

// 切换标签禁用状态
function toggleTagDisabled(tagName) {
    event.stopPropagation();
    if (!selectedPool) return;
    
    const tag = selectedPool.tags.find(t => t.name === tagName);
    if (tag) {
        tag.disabled = !tag.disabled;
        updateTagList();
        updateGlobalPreview();
        saveToLocalStorage();
    }
}

// 删除标签
function deleteTag(tagName) {
    event.stopPropagation();
    if (!selectedPool) return;
    
    if (confirm('确定要删除该标签吗？')) {
        selectedPool.tags = selectedPool.tags.filter(tag => tag.name !== tagName);
        updateTagList();
        updateGlobalPreview();
        saveToLocalStorage();
    }
}

// 抽取标签
function drawTags() {
    const totalCount = parseInt(document.getElementById('totalDrawCount').value);
    if (isNaN(totalCount) || totalCount <= 0) {
        alert('请输入有效的总抽取数量');
        return;
    }
    
    // 验证限制
    const totalMin = pools.reduce((sum, pool) => sum + pool.minDraw, 0);
    const totalMax = pools.reduce((sum, pool) => sum + pool.maxDraw, 0);
    
    if (totalMin > totalCount) {
        alert('最小抽取总数超过总抽取数量');
        return;
    }
    
    if (totalMax < totalCount) {
        alert('最大抽取总数小于总抽取数量');
        return;
    }
    
    // 执行抽取
    const result = [];
    let remainingCount = totalCount;
    
    // 首先满足最小抽取要求
    pools.forEach(pool => {
        const availableTags = pool.tags.filter(tag => !tag.disabled);
        const count = Math.min(pool.minDraw, availableTags.length);
        if (count > 0) {
            const selected = shuffleArray([...availableTags]).slice(0, count);
            result.push(...selected.map(tag => ({ pool: pool.name, tag: tag.name })));
            remainingCount -= count;
        }
    });
    
    // 随机分配剩余数量
    const availablePools = pools.filter(pool => {
        const availableTags = pool.tags.filter(tag => !tag.disabled);
        return availableTags.length > 0 && 
               result.filter(r => r.pool === pool.name).length < pool.maxDraw;
    });
    
    while (remainingCount > 0 && availablePools.length > 0) {
        const poolIndex = Math.floor(Math.random() * availablePools.length);
        const pool = availablePools[poolIndex];
        
        const currentCount = result.filter(r => r.pool === pool.name).length;
        if (currentCount < pool.maxDraw) {
            const availableTags = pool.tags.filter(tag => 
                !tag.disabled && 
                !result.some(r => r.pool === pool.name && r.tag === tag.name)
            );
            
            if (availableTags.length > 0) {
                const tagIndex = Math.floor(Math.random() * availableTags.length);
                result.push({ pool: pool.name, tag: availableTags[tagIndex].name });
                remainingCount--;
            } else {
                availablePools.splice(poolIndex, 1);
            }
        } else {
            availablePools.splice(poolIndex, 1);
        }
    }
    
    // 显示结果
    displayResult(result);
}

// 随机打乱数组
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 显示抽取结果
function displayResult(result) {
    const resultDiv = document.getElementById('drawResult');
    const copyButton = document.getElementById('copyButton');
    resultDiv.innerHTML = '';

    if (result.length === 0) {
        resultDiv.textContent = '没有可抽取的标签';
        copyButton.disabled = true;
        return;
    }

    // 将所有标签按顺序连接，用空格分隔
    const resultText = result.map(item => item.tag).join(' ');
    resultDiv.textContent = resultText;
    copyButton.disabled = false;
}

// 复制结果到剪贴板
function copyResult() {
    const resultText = document.getElementById('drawResult').textContent;
    if (resultText && resultText !== '没有可抽取的标签') {
        navigator.clipboard.writeText(resultText).then(() => {
            const copyButton = document.getElementById('copyButton');
            const originalText = copyButton.textContent;
            copyButton.textContent = '已复制！';
            copyButton.style.backgroundColor = '#27ae60';
            setTimeout(() => {
                copyButton.textContent = originalText;
                copyButton.style.backgroundColor = '';
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    }
}

// 更新全局预览
function updateGlobalPreview() {
    const previewDiv = document.getElementById('globalPreview');
    previewDiv.innerHTML = '';
    
    pools.forEach(pool => {
        const poolPreview = document.createElement('div');
        poolPreview.className = 'pool-preview';
        poolPreview.innerHTML = `
            <h3>${pool.name} (${pool.minDraw}-${pool.maxDraw})</h3>
            <div class="preview-tags">
                ${pool.tags.map(tag => `<span class="preview-tag">${tag.name}</span>`).join('')}
            </div>
        `;
        previewDiv.appendChild(poolPreview);
    });
}

// 初始化右键菜单
document.addEventListener('DOMContentLoaded', () => {
    contextMenu = document.getElementById('contextMenu');
    
    // 点击其他地方关闭右键菜单
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });
    
    // 右键菜单项点击事件
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            handleContextMenuAction(action);
            contextMenu.style.display = 'none';
        });
    });
});

// 处理右键菜单项点击
function handleContextMenuAction(action) {
    if (currentTargetType === 'pool' && typeof currentTarget === 'number') {
        switch (action) {
            case 'rename':
                renamePool(currentTarget);
                break;
            case 'edit-limits':
                editPoolLimits(currentTarget);
                break;
            case 'delete':
                deletePool(currentTarget);
                break;
        }
    } else if (currentTargetType === 'tag' && typeof currentTarget === 'string') {
        switch (action) {
            case 'toggle-disable':
                toggleTagDisabled(currentTarget);
                break;
            case 'delete':
                deleteTag(currentTarget);
                break;
        }
    }
}

// 显示右键菜单
function showContextMenu(e, target, type) {
    e.preventDefault();
    currentTarget = target;
    currentTargetType = type;
    
    // 根据类型显示/隐藏菜单项
    const items = contextMenu.querySelectorAll('.context-menu-item');
    items.forEach(item => {
        const action = item.dataset.action;
        if (type === 'pool' && action === 'toggle-disable') {
            item.style.display = 'none';
        } else if (type === 'tag' && (action === 'rename' || action === 'edit-limits')) {
            item.style.display = 'none';
        } else {
            item.style.display = 'block';
        }
    });
    
    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取菜单尺寸
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    
    // 计算菜单位置，使用clientX和clientY
    let left = e.clientX;
    let top = e.clientY;
    
    // 确保菜单不会超出视口右边界
    if (left + menuWidth > viewportWidth) {
        left = viewportWidth - menuWidth;
    }
    
    // 确保菜单不会超出视口下边界
    if (top + menuHeight > viewportHeight) {
        top = viewportHeight - menuHeight;
    }
    
    // 设置菜单位置
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
}

// 修改标签池限制
function editPoolLimits(index) {
    const pool = pools[index];
    const newMin = prompt('请输入最小抽取数量：', pool.minDraw);
    const newMax = prompt('请输入最大抽取数量：', pool.maxDraw);
    
    if (newMin !== null && newMax !== null) {
        const min = parseInt(newMin);
        const max = parseInt(newMax);
        
        if (!isNaN(min) && !isNaN(max) && min >= 0 && max >= min) {
            pool.minDraw = min;
            pool.maxDraw = max;
            updatePoolList();
            updateGlobalPreview();
            saveToLocalStorage();
        } else {
            alert('请输入有效的数字，且最大抽取数量不能小于最小抽取数量！');
        }
    }
}

// 导出标签池
function exportPools() {
    const data = {
        pools: pools,
        lastUpdate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `标签池备份_${new Date().toLocaleDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 导入标签池
function importPools() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.pools && Array.isArray(data.pools)) {
                        if (confirm('导入将覆盖当前所有标签池，是否继续？')) {
                            pools = data.pools;
                            updatePoolList();
                            updateGlobalPreview();
                            saveToLocalStorage();
                            alert('导入成功！');
                        }
                    } else {
                        alert('文件格式不正确！');
                    }
                } catch (error) {
                    alert('文件解析失败：' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}