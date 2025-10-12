// summary/summary.js
// This script controls the Weekly Summary page (summary.html).
// It fetches the last 7 days of browsing data, aggregates it,
// and uses the Chart.js library to create interactive data visualizations.

let chartInstance = null; // A global variable to hold the current chart instance.

/**
 * Dynamically imports the storage manager module.
 */
async function getStorageManager() {
    try {
        const src = chrome.runtime.getURL('utils/storage-manager.js');
        return await import(src);
    } catch (error) {
        console.error("SUMMARY_DEBUG: Failed to import storage-manager.js", error);
    }
}

/**
 * Processes the raw weekly data from storage and aggregates it by domain.
 * @param {object} weeklyData - The raw data object from chrome.storage.local.
 * @returns {Array} - A sorted array containing the top 7 domains and their total time spent.
 */
function processDataForChart(weeklyData) {
    const domainTotals = {};
    for (const date in weeklyData) {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            for (const domain in weeklyData[date]) {
                const time = weeklyData[date][domain].totalTime || 0;
                domainTotals[domain] = (domainTotals[domain] || 0) + time;
            }
        }
    }
    return Object.entries(domainTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 7);
}

/**
 * A custom Chart.js plugin to draw text (e.g., total time) in the center of a doughnut chart.
 */
const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
        if (chart.config.type !== 'doughnut') {
            return;
        }
        
        const { ctx, chartArea: { width, height } } = chart;
        const centerConfig = chart.options.plugins.centerText;

        if (centerConfig && centerConfig.display) {
            ctx.save();
            ctx.font = `bold ${height / 8}px sans-serif`;
            ctx.fillStyle = '#150e0eff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(centerConfig.mainText, width / 2, height / 2 - 10);
            
            ctx.font = `normal ${height / 20}px sans-serif`;
            ctx.fillStyle = '#0e0606ff';
            ctx.fillText(centerConfig.subText, width / 2, height / 2 + 15);
            ctx.restore();
        }
    }
};

/**
 * Renders or re-renders the chart on the canvas.
 * This function is designed to be called multiple times to switch between chart types.
 * @param {string} chartType - The type of chart to render ('doughnut', 'pie', 'bar').
 * @param {Array} chartData - The processed data from processDataForChart.
 * @param {number} totalTimeMinutes - The total time to display in the center of the doughnut.
 */
function renderChart(chartType, chartData, totalTimeMinutes) {
    const chartCanvas = document.getElementById('domain-chart');
    if (!chartCanvas || !chartData || chartData.length === 0) return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = chartData.map(item => item[0]);
    const dataMinutes = chartData.map(item => Math.round(item[1] / 60));
    const isCircular = chartType === 'doughnut' || chartType === 'pie';

    chartInstance = new Chart(chartCanvas, {
        type: chartType,
        plugins: [centerTextPlugin],
        data: {
            labels: labels,
            datasets: [{
                label: 'Time Spent (minutes)',
                data: dataMinutes,
                backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#F44336', '#9C27B0', '#00BCD4', '#FF9800'],
                borderColor: '#2d2d2d',
                borderWidth: isCircular ? 3 : 0
            }]
        },
        options: {
            indexAxis: (chartType === 'bar') ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            cutout: chartType === 'doughnut' ? '70%' : 0,
            plugins: {
                legend: {
                    position: (chartType === 'bar') ? 'top' : 'right',
                    labels: { color: '#150e0eff', font: { size: 14 } }
                },
                datalabels: {
                    anchor: (chartType === 'bar') ? 'end' : 'center',
                    align: (chartType === 'bar') ? 'start' : 'center',
                    color: (chartType === 'bar') ? '#1a1a1a' : '#0e0606ff',
                    offset: (chartType === 'bar') ? -10 : 8,
                    display: function(context) {
                        const value = context.dataset.data[context.dataIndex];
                        const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return false;
                        const percentage = (value * 100) / sum;
                        return percentage >= 1;
                    },
                    font: { weight: 'bold', size: 12 },
                    formatter: (value, ctx) => {
                        let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (sum === 0) return '0%';
                        let percentage = (value * 100 / sum).toFixed(1) + "%";
                        return percentage;
                    },
                },
                centerText: {
                    display: chartType === 'doughnut',
                    mainText: `${totalTimeMinutes} min`,
                    subText: 'Total Time'
                }
            }
        }
    });
}

// --- Main Script ---
// Runs once the summary page HTML is fully loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // ... (fetch weeklyReport and weeklyData from storage)
    const insightTextElement = document.getElementById('insight-text');
    const storageManager = await getStorageManager();

    const [weeklyReport, weeklyData] = await Promise.all([
        storageManager.getWeeklyReport(),
        storageManager.getLastDaysData(7)
    ]);
    
    if (weeklyReport && weeklyReport.text) {
        insightTextElement.textContent = weeklyReport.text;
    } else {
        insightTextElement.textContent = "No report generated yet. Go to the popup and click 'Generate Report'.";
    }

    const chartData = processDataForChart(weeklyData);
    if (chartData.length > 0) {
        // ... (calculate totalTimeMinutes)
        const rawDataSeconds = chartData.map(item => item[1]);
        const totalTimeMinutes = Math.round(rawDataSeconds.reduce((sum, current) => sum + current, 0) / 60);
        // Register the datalabels plugin to show percentages on the chart.
        Chart.register(ChartDataLabels);

        // 1. Render the initial chart with the default type ('doughnut').
        const initialChartType = document.querySelector('input[name="chartType"]:checked').value;
        renderChart(initialChartType, chartData, totalTimeMinutes);

        // 2. Add an event listener to the radio buttons to handle chart switching.
        const chartTypeControls = document.getElementById('chart-type-controls');
        chartTypeControls.addEventListener('change', (event) => {
            // When the user selects a new chart type, re-render the chart.
            if (event.target.name === 'chartType') {
                renderChart(event.target.value, chartData, totalTimeMinutes);
            }
        });
    }
});