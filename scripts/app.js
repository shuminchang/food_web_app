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

const potassiumConstant = 200;

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

    const selectedMineral = $('input[name="mineral"]:checked').val();
    const threshold = selectedMineral.includes('mg') ? potassiumConstant : 5;
    const unit = selectedMineral.includes('mg') ? 'mg' : 'g';
    
    $('#nutrient-thresholds').text(`(每日建議上限 ${nutrientThresholds[selectedMineral]} ${unit} )`);
    $('#selected-nutruent').text(selectedMineral.replace(/\(.*\)/, ''));
    $('#nutrient-total').text(`0 ${unit}`);
    $('#low-content-limit').text(`${potassiumConstant} ${unit}`);
    $('#high-content-limit').text(`${potassiumConstant} ${unit}`);

    // Separate foods based on selected mineral content
    const lowContentFoods = foodsData.filter(food => parseFloat(food[selectedMineral]) <= threshold);
    const highContentFoods = foodsData.filter(food => parseFloat(food[selectedMineral]) > threshold);
    
    displayCategory(lowContentFoods, '#low-results', selectedMineral, unit);
    displayCategory(highContentFoods, '#high-results', selectedMineral, unit);
}

function displayCategory(foodList, elementId, mineral, unit) {
    const resultsDiv = $(elementId);
    resultsDiv.empty();

    foodList.sort((a, b) => parseFloat(a[mineral]) - parseFloat(b[mineral]));

    foodList.forEach(food => {
        const foodDiv = createFoodBlock(food, mineral, unit);
        resultsDiv.append(foodDiv);
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
    const foodDiv = $('<div>').addClass('food-block').click(() => toggleFoodSelection(food, mineral, unit));

    const foodDetails = $('<div>').addClass('food-details')
        .css('background-color', getBackgroundColorByCategory(food['食品分類']))
        .html(`
            <strong>${food['樣品名稱'] || 'Unknown'}</strong> <br>
            含量: ${food[mineral]} <strong>${unit}</strong> <br>
            分類: ${food['食品分類'] || 'N/A'}
        `);

    foodDiv.append(foodDetails);
    return foodDiv;
}

function toggleFoodSelection(food, mineral, unit) {
    const foodIndex = selectedFoods.findIndex(selected => selected['樣品名稱'] === food['樣品名稱']);

    $('.food-block').each(function() {
        if ($(this).text().includes(food['樣品名稱'])) {
            $(this).toggleClass('selected', foodIndex === -1); // Highlight if selected
        }
    })

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

    const nutrientTotalElement = $('#nutrient-total');
    nutrientTotalElement.text(`${totalContent.toFixed(2)} ${unit}`);

    nutrientTotalElement.toggleClass('warning', totalContent > nutrientThresholds[mineral]);
}

function resetSelection() {
    selectedFoods = [];
    $('#nutrient-total').text('0').removeClass('warning');
    $('.food-block.selected').removeClass('selected');
}

// Function to switch tabs
function showTab(tabName) {
    $('.tab-content').removeClass('active');
    $('.tab-button').removeClass('active');
    $(`#${tabName}`).addClass('active');
    $(`.tab-button[onclick="showTab('${tabName}')"]`).addClass('active');
}

// Load and display foods on page load
$(document).ready(displayFood);