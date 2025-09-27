const domainInput = document.getElementById('domain');
const limitInput = document.getElementById('limit');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const limitsListDiv = document.getElementById('limits-list');

const STORAGE_KEY = 'siteTimeBudgets';

// Save a new limit
saveBtn.addEventListener('click', () => {
    const domain = domainInput.value.trim().toLowerCase();
    const limit = parseInt(limitInput.value, 10);

    if (domain && limit > 0) {
        chrome.storage.sync.get(STORAGE_KEY, (data) => {
            const limits = data[STORAGE_KEY] || {};
            limits[domain] = limit; // Store in minutes
            chrome.storage.sync.set({ [STORAGE_KEY]: limits }, () => {
                statusDiv.textContent = 'Budget saved!';
                domainInput.value = '';
                limitInput.value = '';
                loadBudgets(); // Refresh the list
                setTimeout(() => { statusDiv.textContent = ''; }, 2000);
            });
        });
    } else {
        statusDiv.textContent = 'Please enter a valid domain and limit.';
    }
});

// Load and display existing limits
function loadBudgets() {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
        const limits = data[STORAGE_KEY] || {};
        limitsListDiv.innerHTML = '';
        if (Object.keys(limits).length === 0) {
            limitsListDiv.innerHTML = '<p>No budgets set yet.</p>';
            return;
        }
        for (const domain in limits) {
            limitsListDiv.innerHTML += `<p><b>${domain}</b>: ${limits[domain]} minutes per day</p>`;
        }
    });
}

document.addEventListener('DOMContentLoaded', loadBudgets);