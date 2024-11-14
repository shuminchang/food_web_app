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

    // Create an <a> element and insert it after #nutrient-thresholds
    const infoLink = $('<a>')
        .attr("href", "./data/長庚醫院低鉀飲食.pdf")
        .attr("target", "_blank") // Open link in a new tab
        .text(" 參考來源: 長庚醫院");

    // Append the link directly after #nutrient-thresholds
    $('#nutrient-thresholds').after(infoLink);

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

    const foodsByCategory = groupFoodsByCategory(foodList);

    for (const [category, foods] of Object.entries(foodsByCategory)) {
        const categoryBlock = createFoodBlock(category, foods, mineral, unit);
        resultsDiv.append(categoryBlock);
    }
}

function groupFoodsByCategory(foodList) {
    return foodList.reduce((acc, food) => {
        const category = food['食品分類'] || '未知類別';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(food);
        return acc;
    }, {});
}

function createFoodBlock(category, foods, mineral, unit) {
    // Create the main container for the category
    const foodBlock = $('<div>').addClass('food-block');

    // Add a category title with background color
    const categoryTitle = $('<h3>')
        .text(category)
        .css('background-color', getBackgroundColorByCategory(category))
        .addClass('category-title')
        .click(function() {
            // Toggle the visibility of the food-details element
            $(this).next('.food-details').slideToggle();
        });
    foodBlock.append(categoryTitle);

    // Create a <p> tag to contain all food details in this category
    const foodDetails = $('<p>')
        .addClass('food-details')
        .css('background-color', getBackgroundColorByCategory(category))
        .hide();
        // .click(() => toggleFoodSelectionByCategory(foods, mineral, unit)); // Add click event for selection by category

    // Create a map to store the food with the highest mineral content for each unique name
    const uniqueFoodsMap = new Map();

    foods.forEach((food) => {
        // Clean the food name by removing "平均值" and text within parentheses
        const cleanedFoodName = (food['樣品名稱'] || 'Unknown').replace(/平均值|\(.*?\)|\(.*?\）/g, '').trim();

        // Get the mineral content, defaulting to 0 if missing
        const mineralContent = parseFloat(food[mineral]) || 0;

        // Check if this food is the highest for this name and update if necessary
        if (!uniqueFoodsMap.has(cleanedFoodName) || uniqueFoodsMap.get(cleanedFoodName).mineralContent < mineralContent) {
            uniqueFoodsMap.set(cleanedFoodName, { food, mineralContent });
        }
    });

    // Append each unique food to foodDetails
    uniqueFoodsMap.forEach(({ food, mineralContent }, cleanedFoodName) => {
        // Create a container for each unique food item
        const foodItem = $('<span>')
            .addClass('food-item')
            .attr('data-food-name', cleanedFoodName)
            .css('display', 'inline-block')
            .click(() => toggleFoodSelectionByCategory(food, mineral, unit)); // Add click event for selection by category

        // Add cleaned food name on the first line
        const foodName = $('<span>').addClass('food-name').text(cleanedFoodName);
        foodItem.append(foodName);

        // Add mineral content and unit on the next line
        const mineralElement = $('<span>')
            .addClass('mineral-content')
            .css('display', 'block')
            .html(`${mineralContent || '無資料'}`);
        foodItem.append('<br>'); // Line break between name and content
        foodItem.append(mineralElement);

        // Append this food item to the main foodDetails container
        foodDetails.append(foodItem);

        // Add a separator
        foodDetails.append('  ');
    });

    foodBlock.append(foodDetails);

    return foodBlock;
}

// Toggle selection for all foods within a category and update nutrient total
function toggleFoodSelectionByCategory(food, mineral, unit) {
    // Toggle selection for each food in the category
    const foodIndex = selectedFoods.findIndex(selected => selected['樣品名稱'] === food['樣品名稱']);
    if (foodIndex === -1) {
        selectedFoods.push(food);
    } else {
        selectedFoods.splice(foodIndex, 1);
    }
    const cleanedFoodName = (food['樣品名稱'] || 'Unknown').replace(/平均值|\(.*?\)|\(.*?\）/g, '').trim();
    // Debugging: Log to ensure the selector is correct
    // console.log(`Selecting: .food-item[data-food-name="${cleanedFoodName}"] .food-name`);

    // Toggle the selected class
    $(`.food-item[data-food-name="${cleanedFoodName}"] .food-name`).toggleClass('selected', foodIndex === -1);

    // Update the display of selected foods
    updateNutrientTotal(mineral, unit);
    updateSelectedFoodsList();
}

function updateSelectedFoodsList() {
    const selectedFoodsList = $('#selected-foods-list');
    selectedFoodsList.empty();

    if (selectedFoods.length === 0) {
        selectedFoodsList.append('<p>沒有選擇任何食品。</p>');
        return;
    }
    selectedFoods.forEach(food => {
        const cleanedFoodName = (food['樣品名稱'] || 'Unknown').replace(/平均值|\(.*?\)|\(.*?\）/g, '').trim();
        const foodItem = $('<div>').addClass('selected-food-item').text(cleanedFoodName);
        selectedFoodsList.append(foodItem);
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
        '豆類': '#e5fcff'  // Soft light blue for beans
    };
    return colors[category] || '#f4f4f4';
}
function toggleFoodSelection(food, mineral, unit) {
    const foodIndex = selectedFoods.findIndex(selected => selected['樣品名稱'] === food['樣品名稱']);

    if (foodIndex === -1) {
        selectedFoods.push(food);
    } else {
        selectedFoods.splice(foodIndex, 1);
    }

    // Update selected foods with highlighting for each food-details element
    $('.food-details').each(function() {
        const isSelected = selectedFoods.some(selected => $(this).text().includes(selected['樣品名稱']));
        $(this).toggleClass('selected', isSelected); 
    });

    updateNutrientTotal(mineral, unit);
}

// Calculate and display the total nutrient content for selected foods
function updateNutrientTotal(mineral, unit) {
    let totalContent = 0;

    // Calculate the total mineral content based on selected foods
    selectedFoods.forEach(food => {
        const nutrientContent = parseFloat(food[mineral]) || 0;
        const category = food['食品分類'];
        const portionFactor = portionSizes[category] / 100; // Adjust for portion size
        totalContent += nutrientContent * portionFactor;
    });

    // Update the nutrient total display
    const nutrientTotalElement = $('#nutrient-total');
    nutrientTotalElement.text(`${totalContent.toFixed(2)} ${unit}`);

    // Add a warning if the total exceeds the threshold
    nutrientTotalElement.toggleClass('warning', totalContent > nutrientThresholds[mineral]);
}

function resetSelection() {
    selectedFoods = [];
    const selectedFoodsList = $('#selected-foods-list');
    selectedFoodsList.empty();
    $('#nutrient-total').text('0').removeClass('warning');
    $('.food-block.selected').removeClass('selected');
    $('.food-name.selected').removeClass('selected');
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