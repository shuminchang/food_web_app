const allowedCategories = ['水果類', '肉類', '乳品類', '蔬菜類', '魚貝類', '蛋類', '穀物類', '菇類', '豆類'];
const portionSizes = {
    '水果類': 100,  // 100g for fruits
    '肉類': 150,    // 150g for meat
    '乳品類': 200,   // 200g for dairy
    '蔬菜類': 100,   // 100g for vegetables
    '魚貝類': 120,   // 120g for fish
    '蛋類': 50,      // 50g for eggs
    '穀物類': 100,    // 100g for grains
    '菇類': 100,    // 100g for mushrooms
    '豆類': 100,    // 100g for beans
};

// Define thresholds for warnings
const nutrientThresholds = {
    '鉀(mg)': 1600,   // Max potassium
    '鈉(mg)': 2300,   // Max sodium
    '果糖(g)': 50     // Max fructose
};

let foodsData = []; // Global variable to store foods data
let selectedFoods = []; // Store selected food items

async function fetchAndParseCSV(url) {
    const response = await fetch(url);
    const csvData = await response.text();
    return new Promise((resolve) => {
        Papa.parse(csvData, {
            header: true,
            complete: (results) => {
                resolve(results.data);
            }
        });
    });
}

async function displayFood() {
    // https://consumer.fda.gov.tw/Food/TFND.aspx?nodeID=178
    foodsData = await fetchAndParseCSV('./data/食品營養成分資料庫2023版UPDATE1(V2).csv');

    // Filter foods by allowed categories
    foodsData = foodsData.filter(food => allowedCategories.includes(food['食品分類']));

    // Initial display based on the default selected mineral (sodium)
    updateMineralDisplay();
}

function updateMineralDisplay() {
    resetSelection();

    
    const selectedMineral = document.querySelector('input[name="mineral"]:checked').value;
    const threshold = selectedMineral.includes('mg') ? 150 : 5;
    const unit = selectedMineral.includes('mg') ? 'mg' : 'g';
    
    const nutrientThresholdsElement = document.getElementById('nutrient-thresholds');
    nutrientThresholdsElement.textContent = `(每日建議上限 ${nutrientThresholds[selectedMineral]} ${unit} )`;

    document.getElementById('selected-nutrient').textContent = selectedMineral.replace(/\(.*\)/, '');
    document.getElementById('nutrient-total').textContent = `0 ${unit}`;

    document.getElementById('low-content-limit').textContent = `150 ${unit}`;
    document.getElementById('high-content-limit').textContent = `150 ${unit}`;

    // Separate foods based on selected mineral content
    const lowContentFoods = foodsData.filter(food => parseFloat(food[selectedMineral]) <= threshold);
    const highContentFoods = foodsData.filter(food => parseFloat(food[selectedMineral]) > threshold);
    
    displayCategory(lowContentFoods, 'low-results', selectedMineral, unit);
    displayCategory(highContentFoods, 'high-results', selectedMineral, unit);
}

function displayCategory(foodList, elementId, mineral, unit) {
    const resultsDiv = document.getElementById(elementId);
    resultsDiv.innerHTML = '';

    foodList.sort((a, b) => parseFloat(a[mineral]) - parseFloat(b[mineral]));

    foodList.forEach(food => {
        const foodDiv = createFoodBlock(food, mineral, unit);
        resultsDiv.appendChild(foodDiv);
    });
}

function getBackgroundColorByCategory(category) {
    const colors = {
        '水果類': '#FFF3CD', // Light yellow for fruits
        '肉類': '#FFC9C9', // Light pink for meat
        '乳品類': '#CDE4F7', // Light blue for dairy
        '蔬菜類': '#D4EDDA', // Light green for vegetables
        '魚貝類': '#D1E7DD', // Soft teal for fish
        '蛋類': '#FEEBC8', // Light beige for eggs
        '穀物類': '#FFF5E5', // Soft cream for grains
        '菇類': '#f1e5ff', // Soft purple for mushrooms
        '豆類': '#e5fcff' // Soft light blue for beans
    };
    return colors[category] || '#f4f4f4';
}

function createFoodBlock(food, mineral, unit) {
    const foodDiv = document.createElement('div');
    foodDiv.classList.add('food-block');
    foodDiv.onclick = () => toggleFoodSelection(food, mineral, unit);

    const foodDetails = document.createElement('div');
    foodDetails.classList.add('food-details');

    const backgroundColor = getBackgroundColorByCategory(food['食品分類']);
    foodDetails.style.backgroundColor = backgroundColor;

    foodDetails.innerHTML = `
        <strong>${food['樣品名稱'] || 'Unknown'}</strong> <br>
        含量: ${food[mineral]} <strong>${unit}</strong> <br>
        分類: ${food['食品分類'] || 'N/A'}
    `;
    
    foodDiv.appendChild(foodDetails);
    return foodDiv;
}

function toggleFoodSelection(food, mineral, unit) {
    const foodIndex = selectedFoods.findIndex(selected => selected['樣品名稱'] === food['樣品名稱']);
    const foodDiv = document.querySelectorAll('.food-block').forEach(block => {
        if (block.innerText.includes(food['樣品名稱'])) {
            block.classList.toggle('selected', foodIndex === -1); // Highlight if selected
        }
    });

    if (foodIndex === -1) {
        selectedFoods.push(food);
    } else {
        selectedFoods.splice(foodIndex, 1);
    }
    updateNutrientTotal(mineral, unit);
}

function updateNutrientTotal(mineral, unit) {
    let totalContent = 0;
    selectedFoods.forEach(food => {
        const nutrientContent = parseFloat(food[mineral]) || 0;
        const category = food['食品分類'];
        const portionFactor = portionSizes[category] / 100;
        totalContent += nutrientContent * portionFactor;
    });

    const nutrientTotalElement = document.getElementById('nutrient-total');
    nutrientTotalElement.textContent = `${totalContent.toFixed(2)} ${unit}`;

    if (totalContent > nutrientThresholds[mineral]) {
        nutrientTotalElement.classList.add('warning');
    } else {
        nutrientTotalElement.classList.remove('warning');
    }
}

function resetSelection() {
    selectedFoods = [];
    document.getElementById('nutrient-total').textContent = '0';

    document.querySelectorAll('.food-block.selected').forEach(block => block.classList.remove('selected'));

    const nutrientTotalElement = document.getElementById('nutrient-total');
    nutrientTotalElement.classList.remove('warning');
}

// Function to switch tabs
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// Load and display foods on page load
document.addEventListener('DOMContentLoaded', displayFood);
