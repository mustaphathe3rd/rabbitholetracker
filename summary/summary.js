// summary/summary.js (With corrected Chart.js plugin for center text)

async function getStorageManager() {
    try {
        const src = chrome.runtime.getURL('utils/storage-manager.js');
        return await import(src);
    } catch (error) {
        console.error("SUMMARY_DEBUG: Failed to import storage-manager.js", error);
    }
}

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

// --- NEW: A proper Chart.js plugin to draw text in the center ---
const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
        const { ctx, chartArea: { width, height } } = chart;
        const centerConfig = chart.options.plugins.centerText;

        if (centerConfig && centerConfig.display) {
            ctx.save();
            
            // Main Text (e.g., "123 min")
            ctx.font = `bold ${height / 8}px sans-serif`;
            ctx.fillStyle = '#e0e0e0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(centerConfig.mainText, width / 2, height / 2 - 10);
            
            // Sub Text (e.g., "Total Time")
            ctx.font = `normal ${height / 20}px sans-serif`;
            ctx.fillStyle = '#a0a0a0';
            ctx.fillText(centerConfig.subText, width / 2, height / 2 + 15);

            ctx.restore();
        }
    }
};
// --- END OF NEW PLUGIN ---


document.addEventListener('DOMContentLoaded', async () => {
    const insightTextElement = document.getElementById('insight-text');
    const chartCanvas = document.getElementById('domain-chart');

    const storageManager = await getStorageManager();
    if (!storageManager) return;

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
        const labels = chartData.map(item => item[0]);
        const rawDataSeconds = chartData.map(item => item[1]);
        const dataMinutes = rawDataSeconds.map(seconds => Math.round(seconds / 60));
        
        const totalTimeSeconds = rawDataSeconds.reduce((sum, current) => sum + current, 0);
        const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

        Chart.register(ChartDataLabels);

        new Chart(chartCanvas, {
            type: 'doughnut',
            plugins: [centerTextPlugin], // <-- Register our custom plugin here
            data: {
                labels: labels,
                datasets: [{
                    label: 'Time Spent (minutes)',
                    data: dataMinutes,
                    backgroundColor: ['#4CAF50', '#FFC107', '#2196F3', '#F44336', '#9C27B0', '#00BCD4', '#FF9800'],
                    borderColor: '#2d2d2d',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 14 }
                        }
                    },
                    datalabels: {
                        color: '#fff',
                        textAlign: 'center',
                        font: { weight: 'bold', size: 12 },
                        formatter: (value, ctx) => {
                            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        },
                    },
                    // --- NEW: Configure our custom plugin ---
                    centerText: {
                        display: true,
                        mainText: `${totalTimeMinutes} min`,
                        subText: 'Total Time'
                    }
                }
            }
        });
    }
});