/**
 * COMMON.JS - Shared JavaScript Functions
 * AI E-Commerce Platform
 */

// ============================================
// API BASE URL
// ============================================
const API_BASE_URL = window.location.origin;

// ============================================
// HEADER & NAVIGATION
// ============================================

/**
 * Initialize header and navigation
 */
function initializeHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  // Add mobile menu toggle functionality
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // Set active navigation link based on current page
  setActiveNavLink();
}

/**
 * Set active navigation link
 */
function setActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-links a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (currentPath.includes(href) || (currentPath === '/' && href === '/')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ============================================
// API HELPERS
// ============================================

/**
 * Fetch API stats
 */
async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

/**
 * Update stats display on page
 */
async function updateStatsDisplay() {
  const stats = await fetchStats();
  if (!stats) return;

  // Update total products
  const totalProductsEl = document.getElementById('totalProducts');
  if (totalProductsEl) {
    totalProductsEl.textContent = stats.totalQueries || 0;
  }

  // Update cache rate
  const cacheRateEl = document.getElementById('cacheRate');
  if (cacheRateEl) {
    cacheRateEl.textContent = stats.cacheHitRate || '0%';
  }

  // Update monthly cost
  const monthlyCostEl = document.getElementById('monthlyCost');
  if (monthlyCostEl) {
    monthlyCostEl.textContent = stats.estimatedMonthlyCost || '$0';
  }

  // Update any other stat elements
  const statsElements = {
    totalTests: stats.totalQueries || 0,
    wins: stats.totalQueries || 0,
    productsProcessed: stats.totalQueries || 0,
    improvementsMade: Math.round((stats.totalQueries || 0) * 3.5),
    timeSaved: Math.round((stats.totalQueries || 0) * 0.5)
  };

  Object.entries(statsElements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

/**
 * Send chat message to API
 */
async function sendChatMessage(message, sessionId = 'default') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId })
    });

    if (!response.ok) throw new Error('Chat request failed');
    return await response.json();
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Show loading spinner
 */
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;
  container.classList.add('visible');
}

/**
 * Hide loading spinner
 */
function hideLoading(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.classList.remove('visible');
}

/**
 * Show error message
 */
function showError(message, containerId = null) {
  const errorHTML = `
    <div class="error-message" style="
      padding: var(--spacing-lg);
      background: #fee;
      border: 2px solid #f44;
      border-radius: var(--radius-md);
      color: #c33;
      margin: var(--spacing-lg) 0;
    ">
      <strong>❌ Error:</strong> ${message}
    </div>
  `;

  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = errorHTML;
    }
  } else {
    alert('Error: ' + message);
  }
}

/**
 * Show success message
 */
function showSuccess(message, containerId = null) {
  const successHTML = `
    <div class="success-message" style="
      padding: var(--spacing-lg);
      background: #efe;
      border: 2px solid #4a4;
      border-radius: var(--radius-md);
      color: #272;
      margin: var(--spacing-lg) 0;
    ">
      <strong>✅ Success:</strong> ${message}
    </div>
  `;

  if (containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = successHTML;
    }
  } else {
    alert('Success: ' + message);
  }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

/**
 * Truncate text
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy:', error);
    showError('Failed to copy to clipboard');
  }
}

// ============================================
// FILE HANDLING
// ============================================

/**
 * Read file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Read file as data URL
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Download data as file
 */
function downloadFile(data, filename, type = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Convert JSON to CSV
 */
function jsonToCSV(jsonData) {
  if (!jsonData || jsonData.length === 0) return '';

  const headers = Object.keys(jsonData[0]);
  const csvRows = [
    headers.join(','),
    ...jsonData.map(row =>
      headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate email
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate URL
 */
function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate file type
 */
function isValidFileType(file, allowedTypes) {
  const fileExtension = file.name.split('.').pop().toLowerCase();
  return allowedTypes.includes(fileExtension);
}

/**
 * Validate file size
 */
function isValidFileSize(file, maxSizeMB) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

/**
 * Save to local storage
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error saving to storage:', error);
    return false;
  }
}

/**
 * Load from local storage
 */
function loadFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error loading from storage:', error);
    return null;
  }
}

/**
 * Remove from local storage
 */
function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from storage:', error);
    return false;
  }
}

// ============================================
// ANIMATION HELPERS
// ============================================

/**
 * Animate number counting
 */
function animateNumber(element, target, duration = 1000) {
  const start = parseInt(element.textContent) || 0;
  const increment = (target - start) / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
      element.textContent = formatNumber(target);
      clearInterval(timer);
    } else {
      element.textContent = formatNumber(Math.round(current));
    }
  }, 16);
}

/**
 * Scroll to element smoothly
 */
function scrollToElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize common functionality when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize header and navigation
  initializeHeader();

  // Update stats if stats elements exist
  if (document.getElementById('totalProducts') || 
      document.getElementById('cacheRate') || 
      document.getElementById('monthlyCost')) {
    updateStatsDisplay();
    
    // Refresh stats every 30 seconds
    setInterval(updateStatsDisplay, 30000);
  }

  // Add fade-in animation to main content
  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('fade-in');
  }

  console.log('✅ Common.js initialized');
});

// ============================================
// EXPORT FOR MODULE USE (if needed)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchStats,
    updateStatsDisplay,
    sendChatMessage,
    showLoading,
    hideLoading,
    showError,
    showSuccess,
    formatNumber,
    formatCurrency,
    formatDate,
    truncateText,
    debounce,
    copyToClipboard,
    readFileAsText,
    readFileAsDataURL,
    downloadFile,
    jsonToCSV,
    isValidEmail,
    isValidURL,
    isValidFileType,
    isValidFileSize,
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    animateNumber,
    scrollToElement
  };
}