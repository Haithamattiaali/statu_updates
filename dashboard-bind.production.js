/**
 * Dashboard Bind Library - Production Version
 * Handles all API interactions with Netlify Functions backend
 */

(function (window) {
    'use strict';

    // Determine API base URL based on environment
    const getApiBaseUrl = () => {
        if (window.location.hostname === 'localhost' && window.location.port === '8888') {
            // Netlify Dev environment
            return 'http://localhost:8888/.netlify/functions/api';
        } else if (window.location.hostname === 'localhost') {
            // Local development
            return 'http://localhost:3001/api';
        } else {
            // Production - use relative URLs
            return '/.netlify/functions/api';
        }
    };

    const API_BASE_URL = getApiBaseUrl();
    const DEFAULT_HEADERS = {
        'X-Requested-With': 'XMLHttpRequest',
    };

    /**
     * Main Dashboard API Client
     */
    class DashboardClient {
        constructor(config = {}) {
            this.baseUrl = config.baseUrl || API_BASE_URL;
            this.headers = { ...DEFAULT_HEADERS, ...(config.headers || {}) };
            this.timeout = config.timeout || 30000;
            this.retryAttempts = config.retryAttempts || 3;
            this.retryDelay = config.retryDelay || 1000;
        }

        /**
         * Enhanced fetch with timeout, retry, and error handling
         */
        async fetchWithRetry(url, options = {}, attempt = 1) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        ...this.headers,
                        ...options.headers,
                    },
                });

                clearTimeout(timeoutId);

                if (!response.ok && attempt < this.retryAttempts) {
                    const shouldRetry = response.status >= 500 || response.status === 429;
                    if (shouldRetry) {
                        await this.delay(this.retryDelay * attempt);
                        return this.fetchWithRetry(url, options, attempt + 1);
                    }
                }

                return response;
            } catch (error) {
                clearTimeout(timeoutId);

                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }

                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                    return this.fetchWithRetry(url, options, attempt + 1);
                }

                throw error;
            }
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Get current dashboard data
         */
        async getDashboard(versionId = null) {
            try {
                const url = versionId
                    ? `${this.baseUrl}/dashboard?version=${versionId}`
                    : `${this.baseUrl}/dashboard`;

                const response = await this.fetchWithRetry(url);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Failed to load dashboard' }));
                    throw new Error(error.message || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to fetch dashboard:', error);
                throw error;
            }
        }

        /**
         * Upload Excel file
         */
        async uploadExcel(file, notes = '', commit = false) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('notes', notes);

                const url = `${this.baseUrl}/upload?commit=${commit}`;

                const response = await this.fetchWithRetry(url, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        // Don't set Content-Type for FormData - browser will set it with boundary
                    },
                });

                if (response.status === 400) {
                    // Validation failed - download error report
                    const blob = await response.blob();
                    const contentDisposition = response.headers.get('content-disposition');
                    const fileName = this.extractFileName(contentDisposition) || 'validation-errors.xlsx';

                    this.downloadBlob(blob, fileName);

                    throw new Error('Validation failed. Error report downloaded.');
                }

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
                    throw new Error(error.message || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to upload Excel:', error);
                throw error;
            }
        }

        /**
         * Upload JSON file
         */
        async uploadJson(file, notes = '', format = 'domain', commit = false) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('notes', notes);

                const url = `${this.baseUrl}/json/upload?format=${format}&commit=${commit}`;

                const response = await this.fetchWithRetry(url, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
                    throw new Error(error.message || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to upload JSON:', error);
                throw error;
            }
        }

        /**
         * Download Excel template
         */
        async downloadTemplate() {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/template`);

                if (!response.ok) {
                    throw new Error(`Failed to download template: HTTP ${response.status}`);
                }

                const blob = await response.blob();
                const contentDisposition = response.headers.get('content-disposition');
                const fileName = this.extractFileName(contentDisposition) || 'template.xlsx';

                this.downloadBlob(blob, fileName);

                return { success: true, fileName };
            } catch (error) {
                console.error('Failed to download template:', error);
                throw error;
            }
        }

        /**
         * Download dashboard as JSON
         */
        async downloadJson(format = 'domain') {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/json/download?format=${format}`);

                if (!response.ok) {
                    throw new Error(`Failed to download JSON: HTTP ${response.status}`);
                }

                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const fileName = `dashboard-${format}-${new Date().toISOString().split('T')[0]}.json`;

                this.downloadBlob(blob, fileName);

                return { success: true, fileName };
            } catch (error) {
                console.error('Failed to download JSON:', error);
                throw error;
            }
        }

        /**
         * Get version history
         */
        async getVersions(limit = 20, offset = 0) {
            try {
                const response = await this.fetchWithRetry(
                    `${this.baseUrl}/versions?limit=${limit}&offset=${offset}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch versions: HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to fetch versions:', error);
                throw error;
            }
        }

        /**
         * Get specific version details
         */
        async getVersion(versionId) {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/versions/${versionId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch version: HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to fetch version:', error);
                throw error;
            }
        }

        /**
         * Rollback to a specific version
         */
        async rollbackToVersion(versionId, notes = '') {
            try {
                const response = await this.fetchWithRetry(
                    `${this.baseUrl}/versions/${versionId}/rollback`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ notes }),
                    }
                );

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: 'Rollback failed' }));
                    throw new Error(error.message || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to rollback version:', error);
                throw error;
            }
        }

        /**
         * Get API health status
         */
        async checkHealth() {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/health`);

                if (!response.ok) {
                    throw new Error(`Health check failed: HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Health check failed:', error);
                return {
                    status: 'unhealthy',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                };
            }
        }

        /**
         * Get OpenAPI specification
         */
        async getOpenApiSpec() {
            try {
                const response = await this.fetchWithRetry(`${this.baseUrl}/openapi.json`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch OpenAPI spec: HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to fetch OpenAPI spec:', error);
                throw error;
            }
        }

        /**
         * Helper: Extract filename from Content-Disposition header
         */
        extractFileName(contentDisposition) {
            if (!contentDisposition) return null;

            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                return match[1].replace(/['"]/g, '');
            }

            return null;
        }

        /**
         * Helper: Download blob as file
         */
        downloadBlob(blob, fileName) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
    }

    /**
     * Dashboard UI Renderer
     */
    class DashboardRenderer {
        constructor(client, container) {
            this.client = client;
            this.container = container;
            this.currentData = null;
        }

        /**
         * Initialize and render dashboard
         */
        async init() {
            try {
                this.showLoading();
                const data = await this.client.getDashboard();
                this.currentData = data;
                this.render(data);
            } catch (error) {
                this.showError(error);
            }
        }

        /**
         * Render dashboard data
         */
        render(data) {
            if (!data || !this.container) return;

            // This is a simplified render function
            // Replace with your actual rendering logic
            this.container.innerHTML = '';

            // Render based on your dashboard structure
            if (data.headers) {
                this.renderHeaders(data.headers);
            }

            if (data.statusTable) {
                this.renderStatusTable(data.statusTable);
            }

            if (data.highlights) {
                this.renderHighlights(data.highlights);
            }

            if (data.lowlights) {
                this.renderLowlights(data.lowlights);
            }

            if (data.milestones) {
                this.renderMilestones(data.milestones);
            }
        }

        renderHeaders(headers) {
            // Implement header rendering
        }

        renderStatusTable(statusTable) {
            // Implement status table rendering
        }

        renderHighlights(highlights) {
            // Implement highlights rendering
        }

        renderLowlights(lowlights) {
            // Implement lowlights rendering
        }

        renderMilestones(milestones) {
            // Implement milestones rendering
        }

        showLoading() {
            if (!this.container) return;
            this.container.innerHTML = '<div class="loading">Loading dashboard...</div>';
        }

        showError(error) {
            if (!this.container) return;
            this.container.innerHTML = `
                <div class="error">
                    <h3>Error loading dashboard</h3>
                    <p>${error.message}</p>
                    <button onclick="window.dashboardBind.reload()">Retry</button>
                </div>
            `;
        }

        async reload() {
            await this.init();
        }
    }

    /**
     * Export to global scope
     */
    const dashboardBind = {
        DashboardClient,
        DashboardRenderer,

        // Convenience factory
        create(config = {}) {
            return new DashboardClient(config);
        },

        // Auto-initialize if container exists
        init(containerId = 'dashboard-container', config = {}) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Container with id "${containerId}" not found`);
                return null;
            }

            const client = new DashboardClient(config);
            const renderer = new DashboardRenderer(client, container);

            // Auto-load on init
            renderer.init();

            return {
                client,
                renderer,
                reload: () => renderer.reload(),
            };
        },
    };

    // Export to window
    window.dashboardBind = dashboardBind;

    // AMD support
    if (typeof define === 'function' && define.amd) {
        define([], () => dashboardBind);
    }

    // CommonJS support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = dashboardBind;
    }

})(typeof window !== 'undefined' ? window : this);